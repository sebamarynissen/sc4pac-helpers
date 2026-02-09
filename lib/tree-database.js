// # tree-database.js
import { parseAllDocuments } from 'yaml';
import fs from 'node:fs';

// # TreeDatabase
export default class TreeDatabase extends Array {
	#index = null;
	#modelIndex = null;

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

	// ## get modelIndex()
	// Returns an index of the tree database, mapping models to their entire 
	// family. This index can hence answer the question "what family does this 
	// tree model belong to?"
	get modelIndex() {
		if (!this.#modelIndex) {
			let map = this.#modelIndex = new Map();
			for (let family of this) {
				const { models } = family;
				for (let { model } of models) {
					map.set(`${model}`, family);
				}
			}
		}
		return this.#modelIndex;
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
				winter.model[0] === snow.model[0]
				&& winter.model[1] === snow.model[1]
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

	// ## findFamilyByModel(tgi)
	// Finds the tree family the given model (identified by tgi) belongs to. 
	// This is used when generating patches. For every exemplar, we look up the 
	// model in RKT and then find the family this tree belongs to so that we 
	// can pick the correct seasonal model instead.
	findFamilyByModel(tgi) {
		let [group, instance] = tgi.length === 3 ? tgi.slice(1) : tgi;
		let hash = String([group, instance]);
		return this.modelIndex.get(hash) ?? null;
	}

	// ## findSeasonModelByModel(tgi, season)
	// Looks up an appropriate model for the given season that replaces the 
	// given model by tgi. In other words, say the tgi is a fall tree, and 
	// season is winter, then we return the equivalent winter tree for that 
	// fall tree. This is hence what our patcher will mainly use.
	findSeasonModelByModel(tgi, season) {
		const family = this.findFamilyByModel(tgi);
		if (!family) return null;
		return this.findSeasonModel(family.id, season);
	}

	// ## map(...args)
	// Overidde the map function so that we don't return a tree database.
	map(...args) {
		return [...super.map(...args)];
	}

}

let index = new TreeDatabase();
await index.load();
