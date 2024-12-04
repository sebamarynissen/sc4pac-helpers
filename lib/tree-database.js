// # tree-database.js
import { parseAllDocuments } from 'yaml';
import fs from 'node:fs';

// # TreeDatabase
export default class TreeDatabase {

	docs = [];
	index = {};

	// ## load()
	async load() {
		const url = new URL(import.meta.resolve('./data/trees.yaml'));
		const contents = String(await fs.readFileSync(url));
		this.docs = parseAllDocuments(contents).map(doc => doc.toJSON());
		this.index = Object.groupBy(this.docs, doc => doc.id);
	}

	// ## find(id, season)
	// Finds a model's group/instance for the given id and season. Note that if 
	// a dedicated snow model exists, we'll have to check whether this is the 
	// same as the winter model as well. If that's the case, we use the summer 
	// model for the winter model. This typically happens with coniferous trees!
	find(id, season) {
		const [{ models }] = this.index[id] ?? [{}];
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
			summer,
			fall,
			winter,
			snow,
			spring,
		})[season] || {};
		return model ? [...model] : null;
	}

}
