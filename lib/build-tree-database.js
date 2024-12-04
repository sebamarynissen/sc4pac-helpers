// # build-tree-database.js
import path from 'node:path';
import fs from 'node:fs';
import sortKeys from 'sort-keys';
import { FileScanner, folderToPackageId } from 'sc4/plugins';
import { parseAllDocuments, Document } from 'yaml';
import { DBPF, ExemplarProperty } from 'sc4/core';

// # build()
export default async function build(...args) {
	const ctx = new BuildContext();
	return await ctx.build(...args);
}

// # BuildContext
class BuildContext {
	db = {};
	props = {};
	flora = {};

	// ## build(patterns, opts)
	// The function that performs the boilerplate of updating the tree database. 
	// All we need here is a function that extracts a tree id from every prop or 
	// flora exemplar and a function that is able to extract all seasons that 
	// can be found in an exemplar. The rest is handled automatically.
	async build(patterns, opts = {}) {
		const { id: getId, models: getModels } = opts;
		Object.assign(this, { getId, getModels });
		const { cwd = process.env.SC4_PLUGINS ?? '' } = opts;
		const glob = new FileScanner(patterns, {
			absolute: true,
			cwd: path.resolve(process.cwd(), cwd),
		});
		for await (let file of glob) {
			let dbpf = new DBPF(file);
			for (let entry of dbpf.exemplars) {
				let exemplar = entry.read();
				await this.handleExemplar(exemplar, entry);
			}
		}

		// Now that the database has been built up, we'll merge it with our 
		// existing database.
		let file = new URL(import.meta.resolve('./data/trees.yaml'));
		let yaml = String(await fs.promises.readFile(file));
		let docs = parseAllDocuments(yaml);
		let map = new Map();
		for (let doc of docs) {
			let id = doc.get('id');
			map.set(id, doc);
		}

		// Add all new docs to the map and then zip again.
		for (let key of Object.keys(this.db)) {
			let json = this.db[key];
			let doc = stylize(new Document({
				id: key,
				...json,
			}));
			map.set(key, doc);
		}
		let zipped = [...map.values()].sort((a, b) => a.get('id') < b.get('id') ? -1 : 1);
		for (let doc of zipped) {
			doc.directives.docStart = true;
		}
		zipped.at(0).directives.docStart = null;

		// Now write away again.
		let buffer = zipped.map(doc => doc.toString()).join('\n');
		await fs.promises.writeFile(file, buffer);

		return this.db;

	}

	// ## handleExemplar(exemplar, entry)
	async handleExemplar(exemplar, entry) {
		let type = exemplar.get(ExemplarProperty.ExemplarType);
		let kind;
		switch (type) {
			case 0x0f: kind = 'flora'; break;
			case 0x1e: kind = 'prop'; break;
			default: return;
		}

		// Use the user-provided functions to extract the unique tree id and all 
		// models for it.
		const { getModels, getId } = this;
		let models = normalizeModels(getModels(exemplar, entry));
		let id = getId(exemplar, entry);
		let pkg = folderToPackageId(path.dirname(entry.dbpf.file));
		const object = this.db[id] ??= {
			package: pkg,
			type: kind,
			models: {},
		};
		const { group, instance } = entry;

		// Ensure the models are properly sorted.
		for (let { season, model } of models) {
			object.models[season] = {
				exemplar: [group, instance],
				model,
			};
		}
		object.models = sortKeys(object.models, { compare: compareSeasons });
	}

}

// # compareSeasons(a, b)
const order = [
	'spring',
	'summer',
	'fall',
	'winter',
	'snow',
	'evergreen',
];
function compareSeasons(a, b) {
	return order.indexOf(a) - order.indexOf(b);
}

// # normalizeModels(result)
// The user function that should return the models in an exemplar by season can 
// do so in two ways: by returning an object hash, or by returning an array. We 
// normalize this to an array.
function normalizeModels(result) {
	if (!result) return [];
	if (typeof result === 'object' && !Array.isArray(result)) {
		return Object.entries(result).map(([season, model]) => {
			return { season, model };
		});
	}
	return result;
}

// # stylize(doc)
// Ensures a consistent style for the documents
function stylize(doc) {
	let seasons = doc.get('models', true);
	for (let season of seasons.items) {
		let keys = ['exemplar', 'model'];
		for (let key of keys) {
			let arr = season.value.get(key, true);
			arr.flow = true;
			for (let item of arr.items) {
				item.format = 'HEX';
			}
		}
	}
	return doc;
}
