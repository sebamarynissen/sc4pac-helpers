// # track.js
import ora from 'ora';
import chalk from 'chalk';
import { Glob } from 'glob';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { DBPF, FileType } from 'sc4/core';
import { hex } from 'sc4/utils';
import FileIndex from 'sc4/index/file-index.js';

// Folders that we often need.
const plugins = path.resolve(os.homedir(), 'Documents/SimCity 4/Plugins');

// Constants
const LotConfigurations = 0x00000010;
const RKT = [
	0x27812820,
	0x27812821,
	0x27812822,
	0x27812823,
	0x27812824,
	0x27812825,
	0x27812921,
	0x27812922,
	0x27812923,
	0x27812924,
	0x27812925,
];

const kIndex = Symbol('index');
const kPackageIndex = Symbol('packageIndex');

// # DependencyTracker
// Small helper class that allows us to easily pass context around without 
// having to inject it constantly in the functions.
export default class DependencyTracker {

	plugins = plugins;
	index = null;
	packages = null;
	options = {};

	// ## constructor(opts)
	constructor(opts = {}) {
		this.options = { ...opts };
	}

	// ## buildIndex()
	// Builds up the index of all available files by TGI, just like SimCity 4 
	// does it upon loading, taking into account any overrides.
	async buildIndex() {

		// If a dependency cache was specified, check if it exists.
		let spinner = ora('Building index').start();
		let { cache } = this.options;
		if (cache) {
			let buffer;
			try {
				buffer = await fs.promises.readFile(cache);
			} catch (e) {
				if (e.code !== 'ENOENT') throw e;
			}

			// If a cached file was found, read from there.
			if (buffer) {
				const json = JSON.parse(buffer.toString());
				this.index = await new FileIndex().load(json);
				spinner.succeed();
				return;
			}

		}

		// If we reach this point, we can't read the index from a cache, so we 
		// have to parse it ourselves.
		const { scan = [] } = this.options;
		const index = this.index = new FileIndex({
			scan: [
				plugins,
				...[scan].flat(),
			],
			core: true,
		});
		await index.build();
		await index.buildFamilies();
		spinner.succeed();

		// If the index needs to be cached, then do it now.
		if (cache) {
			spinner = ora('Saving index to cache').start();
			await fs.promises.writeFile(cache, JSON.stringify(index.toJSON()));
			spinner.succeed();
		}

	}

	// ## ensureIndex()
	// Call this to ensure that our file index is only built once.
	async ensureIndex() {
		if (this.index) return this.index;
		let promise = this[kIndex];
		if (promise) return promise;

		// If the index has never been built, do it now.
		promise = this[kIndex] = this.buildIndex().then(() => {
			delete this[kIndex];
		});
		await promise;

	}

	// ## buildPackageIndex()
	// Builds up the index of all installed sc4pac packages. We do this based on 
	// the folder structure of the plugins folder.
	async buildPackageIndex() {
		let map = this.packages = {};
		let glob = new Glob('*/*/', {
			cwd: plugins,
			absolute: true,
		});
		for await (let folder of glob) {
			if (!folder.endsWith('.sc4pac')) continue;
			let pkg = folderToPackageId(folder);
			map[pkg] = folder;
		}
	}

	// ## ensurePackageIndex()
	// Call this to ensure that our package index is only built once.
	async ensurePackageIndex() {
		if (this.packages) return this.packages;
		let promise = this[kPackageIndex];
		if (promise) return promise;

		// If the index has never been built, do it now.
		promise = this[kPackageIndex] = this.buildPackageIndex().then(() => {
			delete this[kPackageIndex];
		});
		await promise;

	}

	// ## track(source)
	// Performs the actual dependency tracking. Returns an array of filenames 
	// that are needed by the source files.
	async track(source = []) {

		// If the index hasn't been built yet, we'll do this first. The index is 
		// stored per instance so that we can track dependencies multiple times 
		// with the same instance, which is way faster.
		let indexPromise = this.ensureIndex();
		let packagePromise = this.ensurePackageIndex();

		// First we'll separate the *package ids* from the potential folders or 
		// files. IMPORTANT! Just checking for ":" is not enough because on 
		// Windows file paths might include this!
		if (!Array.isArray(source)) source = [source];
		let { packages = [], rest = [] } = Object.groupBy(source, id => {
			let base = path.basename(id);
			return base.includes(':') ? 'packages' : 'rest';
		});

		// Next we'll map all package ids to the respective folders.
		if (packages.length > 0) {
			await packagePromise;
			for (let id of packages) {
				let folder = this.packages[id];
				if (folder) rest.push(folder);
			}
		}

		// Next we'll actually collect the source files. We do this by looping 
		// all the input and check whether it is a directory or not.
		let sourceFiles = [];
		let tasks = [];
		for (let id of rest) {
			let fullPath = path.resolve(this.plugins, id);
			let task = fs.promises.stat(fullPath)
				.then(async info => {
					if (info.isDirectory()) {
						const glob = new Glob('**/*.{dat,sc4lot,sc4desc,sc4model}', {
							cwd: fullPath,
							nodir: true,
							absolute: true,
						});
						for await (let file of glob) {
							sourceFiles.push(file);
						}
					} else {
						sourceFiles.push(fullPath);
					}
				})
				.catch(() => {});
			tasks.push(task);
		}

		// Now wait for the index to have been built before we continue.
		await Promise.all([...tasks, indexPromise]);

		// Now actually start tracking, but do it in a separate context.
		let ctx = new DependencyTrackingContext(this, sourceFiles);
		return await ctx.track();

	}

}

// # DependencyTrackingContext
// This class is used to represent a single dependency tracking operation. It's 
// here that we keep track of what files we have already scanned while doing the 
// recursive walk.
class DependencyTrackingContext {

	had = new Map();
	touched = new Set();
	missing = [];

	// ## constructor(tracker, files)
	constructor(tracker, files) {
		this.tracker = tracker;
		this.index = tracker.index;
		this.files = files;
	}

	// ## track()
	// Starts the tracking operation. For now we perform it *sequentially*, but 
	// in the future we might want to do this in parallel!
	async track() {
		let tasks = this.files.map(file => this.read(file));
		await Promise.all(tasks);
		return new DependencyTrackingResult(this);
	}

	// ## touch(entry)
	// Stores that the given DBPF entry is "touched" by this tracking operation, 
	// meaning it is indeed considered a dependency.
	touch(entry) {
		this.touched.add(entry.dbpf.file);
	}

	// ## read(file)
	// Parses the given file as a dbpf file and tracks down all dependencies.
	async read(file) {
		let dbpf = new DBPF({ file, parse: false });
		await dbpf.parseAsync();
		let tasks = [...dbpf].map(entry => this.readResource(entry));
		await Promise.all(tasks);
	}

	// ## readResource(entry)
	// Accepts a given DBPF file - as index entry - and then marks the dbpf it 
	// is stored in as touched. Then, if the resource hasn't been read yet, 
	// we'll also process it further and check what kind of resource we're 
	// dealing with.
	async readResource(entry) {
		this.touch(entry);
		return await this.once(entry, async () => {
			switch (entry.type) {
				case FileType.Exemplar:
				case FileType.Cohort:
					await this.readExemplar(entry);
					break;
			}
		});
	}

	// ## readExemplar(entry)
	// Reads & processes the exemplar file identified by the given entry. Note 
	// that the exemplar.
	async readExemplar(entry) {
		let exemplar = await entry.readAsync();
		this.touch(entry);
		let [type] = [exemplar.value(0x10)].flat();
		let tasks = [];
		if (type === LotConfigurations) {
			tasks.push(this.readLotExemplar(exemplar, entry));
		} else {
			tasks.push(this.readRktExemplar(exemplar, entry));
		}

		// If a parent cohorot exists, we'll read this one in as well. It means 
		// it gets marked as a dependency, which is what we want!
		let [t, g, i] = exemplar.parent;
		if (t+g+i !== 0) {
			let entry = this.index.find(t, g, i);
			tasks.push(this.readResource(entry));
		}
		await Promise.all(tasks);

	}

	// ## readLotExemplar(exemplar, entry)
	// Traverses all objects on the given lot exemplar and starts tracking them.
	async readLotExemplar(exemplar, entry) {
		let tasks = [];
		for (let lotObject of exemplar.lotObjects) {
			let iids = lotObject.IIDs;
			for (let iid of iids) {
				tasks.push(this.readLotObject(iid, entry, lotObject.type));
			}
		}
		await Promise.all(tasks);
	}

	// ## readLotObject(iid, entry, objectType)
	// Looks up a lot object by the given iid.
	async readLotObject(iid, entry, objectType) {
		let tasks = [];
		let family = this.index.family(iid);
		if (family) {
			for (let entry of family) {
				tasks.push(this.readResource(entry));
			}
		} else {
			let entries = this.index.findAll({ instance: iid });
			for (let entry of entries) {
				tasks.push(this.readResource(entry));
			}
		}

		// If nothing was found with this instance, we have a missing dependency 
		// and we'll label it like that. Note however that water and land 
		// constraint tiles, as well as network nodes don't need to be labeled 
		// as a missing dependency.
		if (tasks.length === 0) {
			let kind = LotObjectTypes[objectType];
			if (kind) {
				this.missing.push({
					kind,
					file: entry.dbpf.file,
					instance: iid,
				});
			}
		} else {
			await Promise.all(tasks);
		}

	}

	// ## readRktExemplar(exemplar, entry)
	// Reads in an exemplar and looks for ResourceKeyTypes. If found, we have to 
	// mark the resource as a dependency.
	async readRktExemplar(exemplar, entry) {
		let tasks = [];
		for (let key of RKT) {
			let value = exemplar.value(key);
			if (!value) continue;
			let type, group, instance;
			if (value.length === 3) {
				[type, group, instance] = value;
			} else if (value.length >= 8) {
				[type, group, instance] = value.slice(5);
			}

			// Now look for the model exemplar, which is typically found inside 
			// an `.sc4model` file. Note that we only have to report missing 
			// dependencies when the model is not set to 0x00 - which is 
			// something that can happen apparently.
			let model = this.index.find({ type, group, instance });
			if (model) {
				tasks.push(this.readResource(model));
			} else if (instance !== 0x00) {
				this.missing.push({
					kind: 'model',
					file: entry.dbpf.file,
					type,
					group,
					instance,
				});
			}

		}
		await Promise.all(tasks);
	}

	// ## once(entry)
	// Helper function that ensures that every unique tgi is only read once. 
	// This is needed because we might read a prop exemplar from a bare .sc4desc 
	// file, or from an .sc4lot file which then refers to the prop in the 
	// .sc4desc file.
	async once(entry, fn) {
		let { id } = entry;

		// IMPORTANT!! DO NOT return the promise here or we risk getting stuck 
		// in a deadlock!
		if (this.had.has(id)) return;
		let promise = fn();
		this.had.set(id, promise);
		await promise;

	}

}

// # DependencyTrackingResult
// Small class for representing a dependency tracking result.
class DependencyTrackingResult {

	// ## constructor(ctx)
	constructor(ctx) {

		// Report all files that were scanned, relative to the plugins folder.
		this.scanned = ctx.files.sort();

		// For the actual dependencies, we'll filter out the input files.
		let input = new Set(ctx.files);
		this.dependencies = [...ctx.touched]
			.sort()
			.filter(file => !input.has(file));

		// Convert the folders to the packages as well.
		let packages = this.dependencies
			.map(folder => folderToPackageId(folder))
			.filter(Boolean);
		this.packages = [...new Set(packages)].sort();

		// Storate the information about the missing dependencies.
		this.missing = ctx.missing;

	}

	// ## dump(opts)
	// Creates a nice human-readable dump of the result.
	dump({ missing = true, packages = true, files = true } = {}) {

		if (packages) {
			console.log('Dependencies (sc4pac):');
			for (let pkg of this.packages) {
				console.log(` - ${chalk.cyan(pkg)}`);
			}
			console.log('');
		}

		// Report any missing dependencies.
		if (missing && this.missing.length > 0) {
			console.log(chalk.red('The following dependencies were not found:'));
			let mapped = this.missing.map(row => {
				let clone = { ...row };
				let u = void 0;
				row.type !== u && (clone.type = new Hex(row.type));
				row.group !== u && (clone.group = new Hex(row.group));
				row.instance !== u && (clone.instance = new Hex(row.instance));
				if (row.file) clone.file = new File(row.file);
				return clone;
			});
			console.table(mapped);
		}

	}

}

// # Hex
// Small helper class for formatting numbers as hexadecimal in the console table.
class Hex extends Number {
	[Symbol.for('nodejs.util.inspect.custom')](depth, opts) {
		return opts.stylize(hex(+this), 'number');
	}
}
class File extends String {
	[Symbol.for('nodejs.util.inspect.custom')](depth, opts) {
		let max = 100;
		let value = String(this);
		if (value.length > max) {
			value = '...'+value.slice(value.length-97);
		}
		return opts.stylize(value, 'special');
	}
}

// # folderToPackageId(folder)
// Returns the corresponding sc4pac package id from a given folder. If this is 
// not an sc4pac folder, we return nothing.
function folderToPackageId(folder) {
	let basename = path.basename(folder);
	while (!basename.endsWith('.sc4pac')) {
		folder = path.resolve(folder, '..');
		basename = path.basename(folder);
		if (!basename) return null;
	}
	let [group, name] = basename.split('.');
	return `${group}:${name}`;
}

const LotObjectTypes = [
	'building',
	'prop',
	'texture',
	'flora',
	'fence',
];
