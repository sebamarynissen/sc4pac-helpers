// # generate-tree-patch.js
import fs from 'node:fs';
import path from 'node:path';
import { parseAllDocuments } from 'yaml';
import { DBPF, Cohort, ExemplarProperty as Prop, FileType } from 'sc4/core';
import { FileScanner } from 'sc4/plugins';
import { randomId } from 'sc4/utils';

// # generateTreePatch()
// The function that contains the core functionality for generating a tree patch.
export default async function generateTreePatch(patterns, opts) {
	const patcher = new Patcher();
	return await patcher.patch(patterns, opts);
}

const allSeasons = ['spring', 'summer', 'fall', 'winter', 'snow'];
class Patcher {
	db = new Database();
	async patch(patterns, opts = {}) {
		const {
			cwd = process.env.SC4_PLUGINS ?? '',
			filter = () => true,
			seasons = allSeasons,
			id: getId,
			name,
		} = opts;
		Object.assign(this, { getId });

		// First of all we'll load the tree database that we've already 
		// consructed before.
		await this.db.load();

		// Find all the dbpf's to scan.
		const glob = new FileScanner(patterns, {
			cwd: path.resolve(process.cwd(), cwd),
		});
		let files = await glob.walk();

		// Collect all exemplars that need to be patched. We use the filter for 
		// this.
		let patchTargets = [];
		for (let file of files) {
			let dbpf = new DBPF(file);
			let { exemplars } = dbpf;
			for (let entry of exemplars) {
				let exemplar = entry.read();
				if (!filter(exemplar, entry)) {
					continue;
				}
				patchTargets.push({ exemplar, entry });
			}
		}

		// Now create a patch for all seasons.
		const {
			output = path.join(process.env.SC4_PLUGINS, '849-my-overrides'),
		} = opts;
		for (let season of seasons) {
			let dbpf = this.createSeasonPatch(season, patchTargets);
			let uc = season.toUpperCase();
			let outputPath = path.join(output, `${name}_${uc}.dat`);
			dbpf.save({ file: outputPath });
		}

	}

	// ## createSeasonPatch(season, targets)
	// Creates a DBPF containing all the patches using exemplar patching.
	createSeasonPatch(season, targets) {
		const dbpf = new DBPF();
		for (let { entry, exemplar } of targets) {

			// Find the model to be used for this season.
			let id = this.getId(exemplar, entry);
			let model = this.db.find(id, season);
			if (!model) continue;

			// IF this eemplar has an RKT1, then it's a non-changing flora item 
			// - also called evergreen. Note: older flora apparently uses RKT5 
			// for seasonal flora, but luckily for us, exemplar patching can 
			// solve this. Apparently SimCity 4 looks for an RKT1 first, sweet.
			let rkt1 = exemplar.get(Prop.ResourceKeyType1);
			let rkt5 = exemplar.get(Prop.ResourceKeyType5);
			if (rkt1 || rkt5) {
				patch(dbpf, entry, [
					[Prop.ResourceKeyType1, [FileType.S3D, ...model]],
				]);
				continue;
			}

			// Now check for an rkt4. In that case we have to set the proper 
			// model for every rep of 8 values.
			let rkt4 = exemplar.get(Prop.ResourceKeyType4);
			if (rkt4) {
				let rkt = [...rkt4];
				for (let i = 0; i < rkt.length; i += 8) {
					[rkt[i+6], rkt[i+7]] = model;
				}
				patch(dbpf, entry, [
					[Prop.ResourceKeyType4, rkt],
				]);
			}

		}
		return dbpf;
	}

}

// # patch(dbpf, target, props)
function patch(dbpf, target, props) {
	let cohort = new Cohort();
	cohort.addProperty(0x0062e78a, [target.group, target.instance]);
	for (let [id, value, hint] of props) {
		cohort.addProperty(id, value, hint);
	}
	dbpf.add([FileType.Cohort, 0xb03697d1, randomId()], cohort);
}

// # Database()
class Database {

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
