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
			let map = this.#modelIndex = {};
			for (let family of this) {
				const { models } = family;
				for (let { model } of models) {
					const set = map[String(model)] ??= new Set();
					set.add(family);
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
		const [family] = this.index[id] ?? [];
		if (!family) return null;
		return this.findSeasonModelFromFamily(family, season);
	}

	// ## findSeasonModelFromFamily(family, season)
	// Looks up the appropriate model (as group/instance) from the given 
	// family. It's hence here that we pick summer in spring etc. if there's no 
	// dedicated spring model.
	findSeasonModelFromFamily(family, season) {

		// Compile an object containing the various season models from the array
		// of models. Note that it's possible that a season has multiple models.
		// We just take the first in that case.
		const models = Object.groupBy(family.models, data => data.season);
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

	// ## findFamiliesByModel(tgi)
	// Finds all tree families where the given model appears in.
	findFamiliesByModel(tgi) {
		let [group, instance] = tgi.length === 3 ? tgi.slice(1) : tgi;
		let hash = String([group, instance]);
		return [...this.modelIndex[hash] ?? []];
	}

	// ## findMatchingFamilies(opts)
	// Finds the best matching families for the given tree model based on other 
	// options such as package and type. Note that package and type don't 
	// necessarily need to match - we might be patching a higher level package 
	// that just references the models - but it allows us to make a distinction 
	// between props and flora, or have the same models be reused across 
	// multiple packages - e.g. girafe:abies-grandis vs girafe:grand-firs
	findMatchingFamilies({ model, type, pkg }) {
		let families = this.findFamiliesByModel(model);
		if (families.length < 2) return families;

		// If there's more than 1 possible family, we'll discriminate first by 
		// prop/flora type.
		if (type) {
			const filtered = families.filter(family => family.type === type);
			if (filtered.length === 1) return filtered;
			else if (filtered.length > 1) families = filtered;
		}

		// At last we'll discriminate by package.
		if (pkg) {
			const filtered = families.filter(family => family.package === pkg);
			if (filtered.length === 1) return filtered;
		}

		// At last, just return all families. It means we were unable to 
		// discriminate.
		return families;

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
