// # track.js
import ora from 'ora';
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
				...scan,
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

	// # readLotObjectExemplars(entries, deps)
	// Reads in all exemplars that are referenced on a lot - these should be 
	// building exemplars, prop exemplars & texture exemplars.
	readLotObjectExemplars(entries, deps = new Set()) {
		const { index } = this;
		for (let entry of entries) {

			// If the entry is a texture, or a 3D model, XML, LTEXT, whatever, 
			// no need to follow it further, but label it as a dependency 
			// obviously.
			deps.add(entry.dbpf.file);
			let { type } = entry;
			if (type !== FileType.Exemplar && type !== FileType.Cohort) {
				continue;
			}

			// From now on, all we should be reading are exemplars. Up next we 
			// need to follow the path to the model, which is found in the 
			// resource key types.
			let exemplar = entry.read();
			for (let key of RKT) {
				let value = exemplar.value(key);
				if (!value) continue;
				if (value.length === 3) {
					let model = index.find(value);
					if (model) {
						deps.add(model.dbpf.file);
					} else if (value[2] !== 0x00000000) {
						console.warn(`Missing model with RKT ${value.map(x => hex(x))} in ${entry.dbpf.file} (${entry.id})!`);
					}
				} else if (value.length >= 8) {
					let [t, g, i] = value.slice(5);
					let model = index.find(t, g, i);
					if (model) {
						deps.add(model.dbpf.file);
					} else if (i !== 0x00000000) {
						console.warn(`Missing model with RKT: ${[t, g, i].map(x => hex(x))} in ${entry.dbpf.file} (${entry.id})!`);
					}
				}
			}

			// If a parent cohort exists, then follow it as well.
			let [t, g, i] = exemplar.parent;
			if (t+g+i !== 0) {
				let entry = index.find(t, g, i);
				if (entry) {
					this.readLotObjectExemplars([entry], deps);
				}
			}

		}
		return [...deps];
	}

	// # readLotExemplar(entry, deps)
	// Reads the given exemplar and collects all dependencies from it, in case 
	// it's a lot exemplar.
	readLotExemplar(entry, deps = new Map()) {

		// If the exemplar is not a LotConfigurations exemplar, skip it.
		let exemplar = entry.read();
		let type = exemplar.value(0x10);
		if (type !== LotConfigurations) return;

		// Cool, now read in all lot objects.
		let { lotObjects } = exemplar;
		for (let lotObject of lotObjects) {
			let iids = lotObject.IIDs;
			for (let iid of iids) {
				let array = deps.get(iid);
				if (!array) {
					deps.set(iid, array = []);
				}
				array.push({
					type: lotObject.type,
					tgi: entry.tgi,
					file: entry.dbpf.file,
				});
			}
		}
		return deps;

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
		// files.
		if (!Array.isArray(source)) source = [source];
		let { packages = [], rest = [] } = Object.groupBy(source, id => {
			return id.includes(':') ? 'packages' : 'rest';
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

		// Initialze the set containing all exemplar iids that will be collected 
		// when looping the exemplars.
		const { index } = this;
		let iids = new Map();
		let self = new Set();
		for (let file of sourceFiles) {
			let fullPath = path.resolve(plugins, file);
			self.add(fullPath);
			let dbpf = new DBPF(fullPath);
			for (let entry of dbpf.exemplars) {
				this.readLotExemplar(entry, iids);
			}
		}

		// Now translate every unique id into the files that they can be found 
		// in.
		let refs = new Set();
		for (let [iid, where] of iids) {
			let family = index.family(iid);
			if (family) {
				family.forEach(ref => refs.add(ref));
			} else {
				let entries = index.findAll({ instance: iid });
				if (entries.length > 0) {
					entries.forEach(ref => refs.add(ref));
				} else {
					let kind;
					let referenced = where.map(({ file, tgi, type }) => {
						kind = [
							'building',
							'prop',
							'texture',
							'fence',
							'flora',
							'water constraint tile',
							'land constraint tile',
							'network node',
						][type] || type;
						return `${file} (${tgi.map(x => hex(x))})`;
					}).join(', ');
					if (kind === 'network node') continue;
					console.warn(`Missing ${kind} exemplar ${hex(iid)}, referenced in ${referenced}`);
				}
			}
		}
		let files = this.readLotObjectExemplars(refs);

		// As a final nice-to-have, we ensure that the original source files are 
		// not included.
		return files
			.filter(file => !self.has(file))
			.toSorted();

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
