// # unseason-cp.js
import path from 'node:path';
import { DBPF, Cohort, FileType, ExemplarProperty } from 'sc4/core';
import { PluginIndex, FileScanner } from 'sc4/plugins';
import { randomId } from 'sc4/utils';
const root = path.resolve(import.meta.dirname, '../packages');

// # unseason(patches)
// This function automatically patches all of Cycledoggs seasonal flora.
export default async function unseason(patches) {

	// Read in the original files as a plugin index.
	const index = new PluginIndex({
		installation: false,
		plugins: root,
		scan: 'CP/**',
	});
	await index.build();

	// Instead of figuring out all the tree models ourselves, we'll rely on the 
	// Endless Summer Mod made by T-Wrecks. This is basically the same as we are 
	// doing, but this only contains evergreen, while we'd like to support all 
	// seasons obviously.
	const models = {};
	const glob = new FileScanner('Endless summer/**/*', { cwd: root });
	for (let file of glob) {
		let dbpf = new DBPF(file);
		for (let entry of dbpf.exemplars) {
			let exemplar = entry.read();
			let name = exemplar.get(ExemplarProperty.ExemplarName);

			// Find out whether the tree has a RKT1 or RKT4 set. From that we'll 
			// determine the model to use.
			let original = index.find(entry).read();
			let rkt1 = original.get(ExemplarProperty.ResourceKeyType1);
			let rkt4 = original.get(ExemplarProperty.ResourceKeyType4);

			// If the RKT4 has 16 reps, then this is a semi-seasonal tree.
			let { variant, season } = getVariant(name);
			if (rkt4 && rkt4.length === 16) {
				let winter = rkt4.slice(5, 8);
				let summer = rkt4.slice(13, 16);
				models[variant] = {
					spring: summer,
					summer,
					fall: winter,
					winter,
				};
				continue;
			}

			// Otherwise we assume that this is a one-season model.
			(models[variant] ??= {})[season] = rkt1 ? [...rkt1] : rkt4.slice(5);

		}
	}

	// Now we'll loop all files again but create the patches now.
	const seasons = Object.keys(patches);
	for (let file of glob) {
		let dbpf = new DBPF(file);
		for (let entry of dbpf.exemplars) {
			let exemplar = entry.read();
			let name = exemplar.get(ExemplarProperty.ExemplarName);
			let rkt = exemplar.get(ExemplarProperty.ResourceKeyType4);
			let { variant } = getVariant(name);
			if (!rkt) continue;
			rkt = [...rkt];

			// Handle the semi-seasonal stuff.
			if (rkt.length === 16) {
				for (let season of seasons) {
					let target = patches[season];
					let model = [...getModelForSeason(models[variant], season)];
					patch(target, entry, ExemplarProperty.ResourceKeyType1, model);
				}
				continue;
			}
			for (let season of seasons) {
				let target = patches[season];
				let model = [...getModelForSeason(models[variant], season)];
				patch(target, entry, ExemplarProperty.ResourceKeyType1, model);
			}
		}
	}

}

function getVariant(name) {
	let regex = /(summer|spring|fall|winter)/gi;
	let match = name.match(regex);
	if (!match) return { variant: name, season: '' };
	let [season] = match;
	return {
		variant: name.replace(regex, ''),
		season: season.toLowerCase(),
	};
}

function getModelForSeason(models, season) {
	let {
		summer,
		spring = summer,
		fall = summer,
		winter = summer,
		snow = winter,
	} = models;
	return ({ summer, spring, fall, winter, snow })[season];
}

function patch(dbpf, target, prop, value) {

	// Create a fresh cohort file and 
	let cohort = new Cohort();
	cohort.addProperty(0x0062e78a, [target.group, target.instance]);
	cohort.addProperty(prop, value);

	// Properly set the simulator start date, for now.
	cohort.addProperty(0xCA7515CC, [0x01, 0x1], Uint8Array);

	// Create an empty dbpf and add the cohort to it, assigning it a random 
	// instance id by default.
	let instance = randomId();
	dbpf.add([FileType.Cohort, 0xb03697d1, instance], cohort);

}
