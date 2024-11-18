// # track.js
import ora from 'ora';
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

// # DependencyTracker
// Small helper class that allows us to easily pass context around without 
// having to inject it constantly in the functions.
export default class DependencyTracker {

	index = null;
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

	// ## track(sourceFiles)
	// Performs the actual dependency tracking. Returns an array of filenames 
	// that are needed by the source files.
	async track(sourceFiles = []) {

		// If the index hasn't build up yet, we need to do this first, but we 
		// might re-use it later when performing different tracking.
		if (!this.index) await this.buildIndex();

		// Ensure that the source files are a proper array.
		if (!Array.isArray(sourceFiles)) sourceFiles = [sourceFiles];

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
