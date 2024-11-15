// # track.js
import ora from 'ora';
import path from 'node:path';
import os from 'node:os';
import { DBPF, FileType } from 'sc4/core';
import FileIndex from 'sc4/api/file-index.js';

// Folders that we often need.
const plugins = path.resolve(os.homedir(), 'Documents/SimCity 4/Plugins');
const installation = 'C:\\GOG Games\\SimCity 4 Deluxe Edition';

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

	// ## buildIndex()
	// Builds up the index of all available files by TGI, just like SimCity 4 does 
	// it upon loading, taking into account any overrides.
	async buildIndex() {
		const index = this.index = new FileIndex({
			dirs: [
				installation,
				plugins,
			],
		});
		let spinner = ora('Building index').start();
		await index.build();
		await index.buildFamilies();
		spinner.succeed();
	}

	// # readLotObjectExemplars(entries, deps)
	// Reads in all exemplars that are referenced on a lot - these should be 
	// building exemplars, prop exemplars & texture exemplars.
	readLotObjectExemplars(entries, deps = new Set()) {
		const { index } = this;
		for (let entry of entries) {

			// If the entry is a texture, or a 3D model, XML, LTEXT, whatever, no need 
			// to follow it further, but label it as a dependency obviously.
			deps.add(entry.dbpf.file);
			let { type } = entry;
			if (type !== FileType.Exemplar && type !== FileType.Cohort) {
				continue;
			}

			// From now on, all we should be reading are exemplars. Up next we need to 
			// follow the path to the model, which is found in the resource key types.
			let exemplar = entry.read();
			for (let key of RKT) {
				let value = exemplar.value(key);
				if (!value) continue;
				if (value.length === 3) {
					let entry = index.find(value);
					if (entry) {
						deps.add(entry.dbpf.file);
					}
				} else if (value.length >= 8) {
					let [t, g, i] = value.slice(5);
					let entry = index.find(t, g, i);
					if (entry) {
						deps.add(entry.dbpf.file);
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

	// # readExemplar(entry, deps)
	// Reads the given exemplar and collects all dependencies from it.
	readExemplar(entry, deps = new Set()) {

		// If the exemplar is not a LotConfigurations exemplar, skip it.
		let exemplar = entry.read();
		let type = exemplar.value(0x10);
		if (type !== LotConfigurations) return;

		// Cool, now read in all lot objects.
		let { lotObjects } = exemplar;
		for (let lotObject of lotObjects) {
			let iids = lotObject.IIDs;
			for (let iid of iids) {
				deps.add(iid);
			}
		}

	}

	// ## track(sourceFiles)
	// Performs the actual dependency tracking. Returns an array of filenames that 
	// are needed by the source files.
	async track(sourceFiles = []) {

		// If the index hasn't build up yet, we need to do this first, but we might 
		// re-use it later when performing different tracking.
		if (!this.index) await this.buildIndex();

		// Ensure that the source files are a proper array.
		if (!Array.isArray(sourceFiles)) sourceFiles = [sourceFiles];

		// Initialze the set containing all exemplar iids that will be collected 
		// when looping the exemplars.
		const { index } = this;
		let iids = new Set();
		let self = new Set();
		for await (let file of sourceFiles) {
			let fullPath = path.resolve(plugins, file);
			self.add(fullPath);
			let dbpf = new DBPF(fullPath);
			for (let entry of dbpf.exemplars) {
				this.readExemplar(entry, iids);
			}
		}

		// Now translate every unique id into the files that they can be found in. 
		let refs = new Set();
		for (let iid of iids) {
			let family = index.family(iid);
			if (family) {
				family.forEach(ref => refs.add(ref));
			} else {
				let entries = index.findAll({ instance: iid });
				entries.forEach(ref => refs.add(ref));
			}
		}
		let files = this.readLotObjectExemplars(refs);

		// As a final nice-to-have, we ensure that the original source files are not 
		// included.
		return files
			.filter(file => !self.has(file))
			.toSorted();

	}

}
