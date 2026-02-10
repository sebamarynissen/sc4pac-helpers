// # generate-tree-patch.js
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import TreeDatabase from './tree-database.js';
import { DBPF, Cohort, ExemplarProperty as Prop, FileType } from 'sc4/core';
import { FileScanner, folderToPackageId } from 'sc4/plugins';
import { randomId, hex } from 'sc4/utils';

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
	outputs = {};
	options = {};
	async patch(patterns, opts = {}) {
		const {
			cwd = process.env.SC4_PLUGINS ?? '',
			filter = () => true,
			seasons = allSeasons,
		} = this.options = opts;

		// First of all we'll load the tree database that we've already 
		// consructed before.
		await this.db.load();

		// Find all the dbpf's to scan.
		const glob = new FileScanner(patterns, {
			cwd: path.resolve(process.cwd(), cwd),
		});
		let files = await glob.walk();

		for (let file of files) {

			// Generate a unique output dbpf for every package/season 
			// combination. This is the target dbpf where we will store the 
			// *patch*.
			let pkg = folderToPackageId(path.dirname(file));
			for (let season of seasons) {
				const key = `${pkg}/${season}`;
				const filename = `${pkg.replace(':', '.')}.dat`;
				this.outputs[key] ??= {
					filename,
					season,
					dbpf: new DBPF(),
				};
			}

			// Now loop all exemplars that *might* need to be patched. We use 
			// the filter for this.
			let dbpf = new DBPF(file);
			let { exemplars } = dbpf;
			for (let entry of exemplars) {
				let exemplar = entry.read();
				let type = this.getExemplarType(exemplar);
				if (type !== 'prop' && type !== 'flora') continue;
				if (!filter({
					exemplar,
					entry,
					type,
					pkg,
				})) continue;
				this.createPatch({
					exemplar,
					entry,
					pkg,
					seasons,
				});
			}

		}

		// Cool, everything is patched, now save the actual dbpfs.
		const {
			output = path.join(
				process.env.SC4_PLUGINS,
				'849-my-overrides/smf_16.everseasonal-flora',
			),
		} = opts;
		for (let season of seasons) {
			const dir = path.join(output, season);
			await fs.promises.mkdir(dir, { recursive: true });
		}
		for (let { filename, season, dbpf } of Object.values(this.outputs)) {
			if (dbpf.length === 0) continue;
			const fullPath = path.join(output, season, filename);
			dbpf.save(fullPath);
		}

	}

	// ## createPatch(opts)
	// Creates a patch for the given exemplar. We'll do this by looking up the 
	// family to be used in this exemplar, and then find the appropriate model 
	// for every season.
	createPatch({ exemplar, entry, pkg, seasons }) {

		// First of all we need a list of all models referenced in the 
		// exemplar, regardless of whether they actually represent trees or 
		// not.
		const models = this.findUsedModels(exemplar);
		if (models.length === 0) return;

		// Next we'll look up the family each model belongs to. It's here that 
		// the tree database actually does its lookup magic. Note that a tree 
		// model may be in multiple families, so that's why we look for a "best 
		// match" based on other parameters - such as exemplar type,
		const name = exemplar.get('ExemplarName');
		const { tgi } = entry;
		const type = this.getExemplarType(exemplar);
		const families = new Set(models
			.map(model => {
				const families = this.db.findMatchingFamilies({
					model,
					type,
					pkg,
				});
				if (families.length === 0) {
					console.warn(`${type} exemplar ${chalk.green(name)} (${chalk.yellow(tgi)}) contains a model ${chalk.yellow(model.map(x => hex(x)))} not found in the tree database! If this is intentional, consider explicitly excluding it in the filter.`);
					return;
				}
				return families;
			})
			.flat());
		if (families.size === 2) {
			console.warn(`Unable to find a single family for ${type} exemplar ${chalk.green(name)} (${chalk.yellow(tgi)}). Found families ${families.map(f => f.id)}. We've picked ${family.id}, but in the future we will write a preference function if needed.`);
		}

		// Cool, we now have the family to pick the seasons from. Up next is 
		// creating a patch for every season.
		const [family] = families;
		for (let season of seasons) {
			const model = this.db.findSeasonModelFromFamily(family, season);
			if (!model) {
				throw new Error(`No model found for season ${season} in family ${family.id}`);
			}
			const key = `${family.package}/${season}`;
			const { dbpf } = this.outputs[key];
			this.createSeasonPatch({
				output: dbpf,
				entry,
				exemplar,
				model,
				season,
				family,
			});
		}

	}

	// ## getExemplarType(exemplar)
	getExemplarType(exemplar) {
		const type = exemplar.get('ExemplarType');
		switch (type) {
			case 0x1e: return 'prop';
			case 0x0f: return 'flora';
			default: return;
		}
	}

	// ## findUsedModels(exemplar)
	// Helper function that looks up all the model gi's referenced in the 
	// exemplar. Depends on whether an rkt1, rkt4 or rkt5 is used.
	findUsedModels(exemplar) {
		const models = [];
		const rkt1 = exemplar.get('ResourceKeyType1');
		const rkt5 = exemplar.get('ResourceKeyType5');
		if (rkt1) {
			const [group, instance] = rkt1.slice(1);
			models.push([group, instance]);
		} else if (rkt5) {
			const [group, instance] = rkt5.slice(1);
			models.push([group, instance]);
		}
		const rkt4 = exemplar.get('ResourceKeyType4');
		if (rkt4) {
			for (let i = 0; i < rkt4.length; i += 8) {
				const [group, instance] = rkt4.slice(i+6, i+8);
				models.push([group, instance]);
			}
		}
		return models.filter(([group, instance]) => {
			return !(group === 0 && instance === 0);
		});
	}

	// ## createSeasonPatch(season, targets)
	// Creates a DBPF containing all the patches using exemplar patching.
	createSeasonPatch({ output, exemplar, entry, model, season, family }) {
		const patches = [
			...this.patchRKT1({ exemplar, model }),
			...this.patchRKT4({ exemplar, model }),
		];

		// In debug mode, it's often useful to label the trees by their family 
		// id. Hence we'll add the required properties for this in the patch as 
		// well.
		if (this.options.labels) {
			patches.push(
				['ItemName', `${family.id} - ${season}`],
				['QueryAsMainBuilding', false],
				['Previewable', false],
				['UserVisibleNameKey', [0, 0, 0]],
			);
		}

		patch(output, entry, patches);
	}

	// ## patchRKT1(entry, exemplar, season)
	// Patches the RKT1 value from this exemplar by replacing the model with an 
	// equivalent model for the desired season.
	// Note: older seasonal flora apparently uses RKT5 for seasonal flora, but 
	// luckily for us, exemplar patching can solve this. Apparently SimCity 4 
	// looks for an RKT1 first. Sweet.
	patchRKT1({ exemplar, model }) {
		const rkt1 = exemplar.get('ResourceKeyType1');
		const rkt5 = exemplar.get('ResourceKeyType5');
		if (!rkt1 && !rkt5) return [];
		return [
			[Prop.ResourceKeyType1, [FileType.S3D, ...model]],
		];
	}

	// ## patchRKT4(entry, exemplar, season)
	// Patches the RKT4 values from this exemplar by replacing the models with 
	// equivalent models of the desired season.
	patchRKT4({ exemplar, model }) {
		const rkt4 = exemplar.get('ResourceKeyType4');
		if (!rkt4) return [];
		const rkt = [...rkt4];
		for (let i = 0; i < rkt.length; i += 8) {
			rkt[i+5] = FileType.S3D;
			rkt[i+6] = model[0];
			rkt[i+7] = model[1];
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
