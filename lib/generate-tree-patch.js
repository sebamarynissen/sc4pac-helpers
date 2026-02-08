// # generate-tree-patch.js
import path from 'node:path';
import fs from 'node:fs';
import TreeDatabase from './tree-database.js';
import { DBPF, Cohort, ExemplarProperty as Prop, FileType } from 'sc4/core';
import { FileScanner } from 'sc4/plugins';
import { randomId, sea } from 'sc4/utils';
import { isNode } from 'yaml';

// # generateTreePatch()
// The function that contains the core functionality for generating a tree 
// patch.
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

			// Below is where the magic actually happens. We'll check if the 
			// exemplar has any RKT's set, and if so, we extract the model from 
			// that RKT and lookup the equivalent model of the desired season, 
			// and then just patch this.
			const patches = [
				...this.patchRKT1(entry, exemplar, season),
				...this.patchRKT4(entry, exemplar, season),
			];
			if (patches.length === 0) continue;

			// In debug mode, it's often useful to label the trees by their id. 
			// Hence we'll add the required properties for this.
			if (opts.labels) {
				let data = this.db.findTreeByExemplar(entry.tgi);
				patches.push(
					['ItemName', data.id],
					['QueryAsMainBuilding', false],
					['Previewable', false],
					['UserVisibleNameKey', [0, 0, 0]],
				);
			}
			patch(dbpf, entry, patches);

		}
		return dbpf;
	}

	// ## patchRKT1(entry, exemplar, season)
	// Patches the RKT1 value from this exemplar by replacing the model with an 
	// equivalent model for the desired season.
	// Note: older seasonal flora apparently uses RKT5 for seasonal flora, but 
	// luckily for us, exemplar patching can solve this. Apparently SimCity 4 
	// looks for an RKT1 first. Sweet.
	patchRKT1(entry, exemplar, season) {
		const rkt1 = exemplar.get('ResourceKeyType1');
		const rkt5 = exemplar.get('ResourceKeyType5');
		if (!rkt1 && !rkt5) return [];
		const model = this.db.findSeasonModelByModel(rkt1 || rkt5, season);
		if (!model) {
			const name = exemplar.get('ExemplarName');
			console.log(
				`Skipping ${name} (${entry.tgi}), not found in tree database`,
			);
			return [];
		}
		return [
			[Prop.ResourceKeyType1, [FileType.S3D, ...model]],
		];
	}

	// ## patchRKT4(entry, exemplar, season)
	// Patches the RKT4 values from this exemplar by replacing the models with 
	// equivalent models of the desired season.
	patchRKT4(entry, exemplar, season) {
		const rkt4 = exemplar.get('ResourceKeyType4');
		if (!rkt4) return [];
		const rkt = [...rkt4];
		let modified = false;
		for (let i = 0; i < rkt.length; i += 8) {
			const tgi = rkt.slice(i+5, i+8);
			const model = this.db.findSeasonModelByModel(tgi, season);
			if (model) {
				modified = true;
				rkt[i+6] = model[0];
				rkt[i+7] = model[1];
			}
		}
		if (!modified) {
			const name = exemplar.get('ExemplarName');
			console.log(
				`Skipping ${name} (${entry.tgi}), not found in tree database`,
			);
			return [];
		}
		return [
			['ResourceKeyType4', rkt],
		];
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
