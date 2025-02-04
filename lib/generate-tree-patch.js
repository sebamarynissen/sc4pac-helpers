// # generate-tree-patch.js
import path from 'node:path';
import fs from 'node:fs';
import TreeDatabase from './tree-database.js';
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
	db = new TreeDatabase();
	async patch(patterns, opts = {}) {
		const {
			cwd = process.env.SC4_PLUGINS ?? '',
			filter = () => true,
			seasons = allSeasons,
			name,
			save = true,
			...rest
		} = opts;

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
		await fs.promises.mkdir(output, { recursive: true });
		const patches = [];
		for (let season of seasons) {
			let dbpf = this.createSeasonPatch(season, patchTargets, rest);
			let uc = season.toUpperCase();
			let outputPath = path.join(output, `${name}_${uc}.dat`);
			if (save) {
				dbpf.save({ file: outputPath });
			}
			patches.push({ season, dbpf });
		}
		return patches;

	}

	// ## createSeasonPatch(season, targets)
	// Creates a DBPF containing all the patches using exemplar patching.
	createSeasonPatch(season, targets, opts = {}) {
		const dbpf = new DBPF();
		for (let { entry, exemplar } of targets) {

			// Find the model to be used for this season. Note that instead of 
			// looking it up by id, we just look it up by exemplar in the tree 
			// database. That way we can change ids easily without having to 
			// update the id function!
			let model = this.db.findSeasonModelByExemplar(entry.tgi, season);
			if (!model) {
				let name = exemplar.get('ExemplarName');
				console.log(
					`Season ${season} not found for exemplar ${name} (${entry.id})!`,
				);
				continue;
			};

			// In debug mode, it's often useful to label the trees by their id. 
			// Hence we'll add the required properties for this.
			let restprops = [];
			if (opts.labels) {
				let data = this.db.findTreeByExemplar(entry.tgi);
				restprops = [
					['ItemName', data.id],
					['QueryAsMainBuilding', false],
					['Previewable', false],
					['UserVisibleNameKey', [0, 0, 0]],
				];
			}

			// If this exemplar has an RKT1, then it's a non-changing flora item 
			// - also called evergreen. Note: older flora apparently uses RKT5 
			// for seasonal flora, but luckily for us, exemplar patching can 
			// solve this. Apparently SimCity 4 looks for an RKT1 first. Sweet.
			let rkt1 = exemplar.get(Prop.ResourceKeyType1);
			let rkt5 = exemplar.get(Prop.ResourceKeyType5);
			if (rkt1 || rkt5) {
				patch(dbpf, entry, [
					[Prop.ResourceKeyType1, [FileType.S3D, ...model]],
					...restprops,
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
					...restprops,
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
