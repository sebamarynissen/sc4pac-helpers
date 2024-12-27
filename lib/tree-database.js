// # tree-database.js
import { parseAllDocuments } from 'yaml';
import fs from 'node:fs';

// # TreeDatabase
export default class TreeDatabase extends Array {
	#index = null;
	#exemplarIndex = null;

	// ## load()
	// Reads in a trees.yaml file and loads them into the database.
	async load(url = new URL(import.meta.resolve('./data/trees.yaml'))) {
		const contents = String(await fs.promises.readFile(url));
		let docs = parseAllDocuments(contents).map(doc => doc.toJSON());
		this.length = docs.length;
		for (let i = 0; i < docs.length; i++) {
			this[i] = docs[i];
		}
	}

	// ## get index()
	// Returns the tree index, by reference.
	get index() {
		if (!this.#index) {
			this.#index = Object.groupBy(this, doc => doc.id);
		}
		return this.#index;
	}

	// ## get exemplarIndex()
	// Returns and index of the tree database, mapping exemplars to ids.
	get exemplarIndex() {
		if (!this.#exemplarIndex) {
			let map = this.#exemplarIndex = new Map();
			for (let { id, models } of this) {
				for (let { exemplar } of models) {
					map.set(`${exemplar}`, id);
				}
			}
		}
		return this.#exemplarIndex;
	}

	// ## findSeasonModel(id, season)
	// Finds a model's group/instance for the given id and season. Note that if 
	// a dedicated snow model exists, we'll have to check whether this is the 
	// same as the winter model as well. If that's the case, we use the summer 
	// model for the winter model. This typically happens with coniferous trees!
	findSeasonModel(id, season) {

		// Look up the metadata for the given tree model (by id).
		const [metadata] = this.index[id] ?? [];
		if (!metadata) return null;

		// Compile an object containing the various season models from the array 
		// of models. Note that it's possible that a season has multiple models. 
		// We just take the first in that case.
		const models = Object.groupBy(metadata.models, data => data.season);
		for (let key of Object.keys(models)) {
			models[key] = models[key].at(0);
		}
		let {
			evergreen,
			summer = evergreen,
			fall = summer,
			winter = models.snow ?? summer,
			snow = winter,
			spring = summer,
		} = models;

		// If we're requesting the winter model, but it turns out that this is a 
		// snow model, then we won't use it.
		if (season === 'winter' && models.snow) {
			let { snow } = models;
			if (
				winter.model[0] === snow.model[0] &&
				winter.model[1] === snow.model[1]
			) {
				return [...summer.model];
			}
		}
		let { model } = ({
			evergreen,
			summer,
			fall,
			winter,
			snow,
			spring,
		})[season] || {};
		return model ? [...model] : null;
	}

	// ## findTreeByExemplar(tgi)
	findTreeByExemplar(tgi) {
		let [group, instance] = tgi.length === 3 ? tgi.slice(1) : tgi;
		let hash = String([group, instance]);
		let id = this.exemplarIndex.get(hash);
		if (!id) return null;
		const [metadata = null] = this.index[id] ?? [];
		return metadata;
	}

	// ## findSeasonModelByExemplar(exemplar, season)
	// Finds a model's group/instance for the given season, where we look up the 
	// specific tree in the database by the exemplar it *originally* appears in. 
	// This is typically used when creating patches, as these start from looping 
	// a set of exemplars.
	findSeasonModelByExemplar(tgi, season) {
		let [group, instance] = tgi.length === 3 ? tgi.slice(1) : tgi;
		let hash = String([group, instance]);
		let id = this.exemplarIndex.get(hash);
		if (!id) return null;
		return this.findSeasonModel(id, season);
	}

	// ## map(...args)
	// Overidde the map function so that we don't return a tree database.
	map(...args) {
		return [...super.map(...args)];
	}

}

let index = new TreeDatabase();
await index.load();
