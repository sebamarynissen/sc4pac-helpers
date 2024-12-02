// # build-tree-database.js
import path from 'node:path';
import fs from 'node:fs';
import { FileScanner } from 'sc4/plugins';
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
		const { prop, flora } = opts;
		this.prop = prop;
		this.flora = flora;
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

		// Now write away again.
		let buffer = zipped.map(doc => doc.toString()).join('\n---\n');
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
		}
		const { models: getModels, id: getId } = this[kind] || {};
		const models = getModels(exemplar, entry);
		const id = getId(exemplar, entry);
		const object = this.db[id] ??= {
			type: kind,
			seasons: {},
		};
		Object.assign(object.seasons, models);
	}

}

// # stylize(doc)
// Ensures a consistent style for the documents
function stylize(doc) {
	let seasons = doc.get('seasons', true);
	for (let season of seasons.items) {
		season.value.flow = true;
		for (let nr of season.value.items) {
			nr.format = 'HEX';
		}
	}
	return doc;
}
