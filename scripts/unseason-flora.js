import path from 'node:path';
import { Glob } from 'glob';
import { DBPF, ExemplarProperty } from 'sc4/core';

const glob = new Glob('*/', {
	cwd: path.resolve(import.meta.dirname, '../packages/Girafe'),
	absolute: true,
});
const packges = await glob.walk();

const seasons = ['summer', 'winter', 'fall'];
const patches = {
	summer: new DBPF(),
	fall: new DBPF(),
	winter: new DBPF(),
};

for (let pkg of packges) {
	if (!pkg.includes('oak')) continue;
	await handlePackage(pkg);
}

// Save all the patches.
const output = path.resolve(process.env.HOMEPATH, 'Documents/SimCity 4/Plugins/849-my-overrides');
for (let season of seasons) {
	let dbpf = patches[season];
	dbpf.save({
		file: path.join(output, `${season}.dat`),
	});
}

async function handlePackage(dir) {
	const glob = new Glob('*.dat', {
		cwd: dir,
		absolute: true,
	});
	let files = await glob.walk();
	let exemplars = files.map(file => {
		return new DBPF(file).exemplars;
	}).flat();

	// The first thing we have to do is figure out the model TGI's for every 
	// season.
	const models = {};
	for (let entry of exemplars) {
		let exemplar = entry.read();
		let type = exemplar.singleValue(ExemplarProperty.ExemplarType);
		if (type !== 0x0f) continue;

		// We'lll only use the RKT4's for getting the models for the various 
		// seasons, even for the evergreen ones.
		let rkt = exemplar.value(ExemplarProperty.ResourceKeyType4);
		if (!rkt) continue;
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);
		let variation = getVariant(name);
		models[variation] ??= {};

		let n = rkt.length / 8;
		for (let i = 0; i < n; i++) {
			let index = 8*i;
			let [type, group, instance] = rkt.slice(index+5, index+8);
			let season = seasons[i];
			models[variation][season] = [type, group, instance];
		}
	}

	// Now loop all exemplars again, and then create clones for the various 
	// patches.
	for (let entry of exemplars) {
		let exemplar = entry.read();
		let type = exemplar.singleValue(ExemplarProperty.ExemplarType);
		if (type !== 0x0f) continue;
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);
		let variant = getVariant(name);

		// If this exemplar has an RKT1, then it's a non-changing flora item - 
		// also called evergreen. We now have to create exemplars for every 
		// season and add them to the proper patch.
		let rkt1 = exemplar.value(ExemplarProperty.ResourceKeyType1);
		let rkt4 = exemplar.value(ExemplarProperty.ResourceKeyType4);
		if (rkt1) {
			for (let season of seasons) {
				let tgi = getModelForSeason(models, variant, season);
				let clone = exemplar.clone();
				clone.set(ExemplarProperty.ResourceKeyType1, tgi);
				let added = patches[season].add(entry.tgi, clone);
				added.compressed = true;
			}
		} else if (rkt4) {
			for (let season of seasons) {
				let tgi = getModelForSeason(models, variant, season);
				let clone = exemplar.clone();
				let rkt = [...rkt4];
				for (let i = 0; i < rkt.length; i += 8) {
					rkt[i+5] = tgi[0];
					rkt[i+6] = tgi[1];
					rkt[i+7] = tgi[2];
				}
				clone.set(ExemplarProperty.ResourceKeyType4, rkt);
				let added = patches[season].add(entry.tgi, clone);
				added.compressed = true;
			}
		}

	}
}

// # getModelForSeason(models, variant, season)
// Returns the most appropriate model for the given season. For example, if a 
// fall model does not exist, we just pick the summer model - happens for 
// coniferous trees for example.
function getModelForSeason(models, variant, season) {
	let options = models[variant];
	const {
		summer,
		fall = summer,
		winter = fall,
		snow = winter,
	} = options;
	return ({ summer, fall, winter, snow })[season];
}

function getVariant(name) {
	return name.split('_').at(-1);
}
