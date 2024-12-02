import path from 'node:path';
import { Glob } from 'glob';
import { DBPF, Cohort, ExemplarProperty, FileType } from 'sc4/core';
import { randomId } from 'sc4/utils';
import cp from './unseason-cp.js';

const withSnow = [
	'abies-grandis',
	'common-spruces',
	'conifers',
	'grand-firs',
	// Larches don't need to be in this array as they have a different way of 
	// handling the snow model!
	// 'larches',
	'serbian-spruces',
	'subalpine',
];
function hasSnow(pkg) {
	let base = path.basename(pkg);
	let name = base.split('.').at(1);
	return withSnow.some(what => name.includes(what));
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

	// Group the exemplars based in flora and props.
	let { flora = [], props = [] } = Object.groupBy(exemplars, entry => {
		let exemplar = entry.read();
		let type = exemplar.singleValue(ExemplarProperty.ExemplarType);
		switch (type) {
			case 0x0f: return 'flora';
			case 0x1e: return 'props';
			default: return type;
		}
	});

	await handleFlora(flora, dir);
	await handleProps(props, dir);

}

async function handleProps(exemplars, dir) {

	// If there are simply no prop exemplars, do nothing.
	if (exemplars.length === 0) return;

	// Just like with the flora, we have to figure out the model TGI's for every season again.
	const models = {};
	for (let entry of exemplars) {
		let exemplar = entry.read();
		let rkt = exemplar.value(ExemplarProperty.ResourceKeyType4);
		if (!rkt) continue;
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);
		let variant = getPropVariant(name);
		let season = getPropSeason(exemplar);
		models[variant] ??= {};
		let tgi = rkt.slice(5);
		models[variant][season] = tgi;
	}

	// If there are no models, skip.
	if (Object.keys(models).length === 0) {
		console.log(`Skipping ${path.basename(dir)} for props`);
		return;
	}

	// Figure out whether this package has a snow-covered variant. This is the 
	// case if there's is no autumn variant, but we do have a summer variant.
	if (hasSnow(dir)) {
		for (let variant of Object.keys(models)) {
			let tgis = models[variant];
			tgis.snow = tgis.winter;
			tgis.winter = tgis.summer;
		}
	}

	// Loop all exemplars again and then create clones for the various patches.
	for (let entry of exemplars) {
		let exemplar = entry.read();
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);
		let variant = getPropVariant(name);
		
		// If this exemplar has an RKT1, then it's an evergreen flora item.
		let rkt1 = exemplar.get(ExemplarProperty.ResourceKeyType1);
		let rkt4 = exemplar.get(ExemplarProperty.ResourceKeyType4);
		if (rkt1) {
			for (let season of allSeasons) {
				let dbpf = patches[season];
				let tgi = getModelForSeason(models, variant, season);
				patch(dbpf, entry, ExemplarProperty.ResourceKeyType1, [...tgi]);
			}
		} else if (rkt4) {
			for (let season of allSeasons) {

				// If no model is found for this season, it might be a timed 
				// prop that simply doesn't show up in the other seasons. Not 
				// sure how to handle this yet...
				let tgi = getModelForSeason(models, variant, season);
				if (!tgi) continue;
				let dbpf = patches[season];
				let rkt = [...rkt4];
				for (let i = 0; i < rkt.length; i += 8) {
					rkt[i+5] = tgi[0];
					rkt[i+6] = tgi[1];
					rkt[i+7] = tgi[2];
				}
				patch(dbpf, entry, ExemplarProperty.ResourceKeyType4, rkt);

			}
		}

	}

}

async function handleFlora(exemplars, dir) {

	// The first thing we have to do is figure out the model TGI's for every 
	// season.
	const models = {};
	for (let entry of exemplars) {

		let exemplar = entry.read();

		// If an rkt1 property exists, we'll check if this is a *fixed winter* 
		// tree. This means that the tree contains snow in winter.
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);
		let variant = getFloraVariant(name);

		// Serbian spruces and abis grand firs have to be handled differently as 
		// they use RKT5.
		if (
			dir.includes('serbian-spruces-v1.1') ||
			dir.includes('abies-grandis.1-1') ||
			dir.includes('maples.1')
		) {

			// If this is the seasonal variant, then it's here that we'll derive 
			// the models from.
			let rkt = exemplar.get(ExemplarProperty.ResourceKeyType5);
			if (rkt) {
				let [type, group, instance] = rkt;
				models[variant] ??= {};
				models[variant].fall = [type, group, instance];
				models[variant].winter = [type, group, instance + 0x00010000];
				models[variant].summer = [type, group, instance + 0x00020000];
			}
			continue;
		}

		// We'll only use the RKT4's for getting the models for the various 
		// seasons, even for the evergreen ones.
		let rkt = exemplar.get(ExemplarProperty.ResourceKeyType4);
		if (!rkt) continue;
		models[variant] ??= {};

		let n = rkt.length / 8;
		for (let i = 0; i < n; i++) {
			let index = 8*i;
			let seasonId = rkt[index];
			let season = defaultOrder[seasonId];

			// Larches come in two variants: snow and leafless winter. Hence we 
			// have to find the proper model.
			if (season === 'winter' && dir.includes('larches')) {
				if (entry.dbpf.file.match(/_S\.dat$/)) {
					season = 'snow';
				}
			}

			let [type, group, instance] = rkt.slice(index+5, index+8);
			models[variant][season] = [type, group, instance];
		}
	}

	// If this package has a specific non-seasonal winter model, then it means 
	// it's a snow-covered tree. This also means that the winter tree should 
	// actually become the summer one!
	if (hasSnow(dir)) {
		for (let variant of Object.keys(models)) {
			let tgis = models[variant];
			tgis.snow = tgis.winter;
			tgis.winter = tgis.summer;
		}
	}

	// Now loop all exemplars again, and then create clones for the various 
	// patches.
	for (let entry of exemplars) {

		// Note: we leave the everwinter flora untouched, so need to create a patch for this!
		if (entry.dbpf.file.includes('_winter')) continue;

		let exemplar = entry.read();
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);
		let variant = getFloraVariant(name);

		// If this exemplar has an RKT1, then it's a non-changing flora item - 
		// also called evergreen. We now have to create exemplars for every 
		// season and add them to the proper patch.
		// Note: some older flora apparently uses RKT5 for seasonal flora, but 
		// luckily for us exemplar patching can solve this. That's probably 
		// because SimCity 4 looks for an RKT1 first. Sweet.
		let rkt1 = exemplar.get(ExemplarProperty.ResourceKeyType1);
		let rkt4 = exemplar.get(ExemplarProperty.ResourceKeyType4);
		let rkt5 = exemplar.get(ExemplarProperty.ResourceKeyType5);
		if (rkt1 || rkt5) {
			if (Object.keys(models).length === 0) continue;
			for (let season of allSeasons) {
				let dbpf = patches[season];
				let tgi = getModelForSeason(models, variant, season);
				patch(dbpf, entry, ExemplarProperty.ResourceKeyType1, [...tgi]);
			}
		} else if (rkt4) {
			for (let season of allSeasons) {
				let dbpf = patches[season];
				let tgi = [...getModelForSeason(models, variant, season)];
				let rkt = [...rkt4];
				for (let i = 0; i < rkt.length; i += 8) {
					rkt[i+5] = tgi[0];
					rkt[i+6] = tgi[1];
					rkt[i+7] = tgi[2];
				}
				patch(dbpf, entry, ExemplarProperty.ResourceKeyType4, rkt);
			}
		}

	}
}

function patch(dbpf, target, prop, value) {

	// Create a fresh cohort file and 
	let cohort = new Cohort();
	cohort.addProperty(0x0062e78a, [target.group, target.instance]);
	cohort.addProperty(prop, value);

	// Create an empty dbpf and add the cohort to it, assigning it a random 
	// instance id by default.
	let instance = randomId();
	dbpf.add([FileType.Cohort, 0xb03697d1, instance], cohort);

}

// # getModelForSeason(models, variant, season)
// Returns the most appropriate model for the given season. For example, if a 
// fall model does not exist, we just pick the summer model - happens for 
// coniferous trees for example.
function getModelForSeason(models, variant, season) {
	let options = models[variant];
	const {
		summer = options.spring,
		spring = summer,
		fall = summer,
		winter = fall,
		snow = winter,
	} = options;
	return ({ spring, summer, fall, winter, snow })[season];
}

function getFloraVariant(name) {
	if (name.includes('VIP')) {
		return name.replace(/(seasonal|summer)_\d{2}$/ig, '');
	}
	let variant = name.split('_').at(-1).replaceAll(/\d+/g, '');
	if (variant.length > 1) return 'root';
	return variant;
}

const seasonRegex = /(autumn|summer|winter|evergreen|spring)/;
function getPropVariant(name) {
	return name.replace(seasonRegex, '');
}

function getPropSeason(exemplar) {
	let rkt1 = exemplar.get(ExemplarProperty.ResourceKeyType1);
	if (rkt1) return 'summer';
	let [month] = exemplar.get(ExemplarProperty.SimulatorDateStart) || [0, 0];
	switch (month) {
		case 0: return 'summer';
		case 1: return 'winter';
		case 2: return 'winter';
		case 3: return 'summer';
		case 4: return 'summer';
		case 5: return 'summer';
		case 6: return 'summer';
		case 7: return 'summer';
		case 8: return 'summer';
		case 9: return 'fall';
		case 10: return 'fall';
		case 11: return 'fall';
		case 12: return 'winter';
	}
}

// 
// Actual script goes here.
// 
const glob = new Glob('*/', {
	cwd: path.resolve(import.meta.dirname, '../packages/Girafe'),
	absolute: true,
});
const packages = await glob.walk();

const defaultOrder = ['fall', 'winter', 'summer'];
const patches = {
	spring: new DBPF(),
	summer: new DBPF(),
	fall: new DBPF(),
	winter: new DBPF(),
	snow: new DBPF(),
};
const allSeasons = Object.keys(patches);

for (let pkg of packages) {
	await handlePackage(pkg);
}

// Perform the cycledogg patch as well.
await cp(patches);

// Save all the patches.
const output = path.resolve(process.env.HOMEPATH, 'Documents/SimCity 4/Plugins/849-my-overrides');
for (let season of allSeasons) {
	let dbpf = patches[season];
	dbpf.save({
		file: path.join(output, `z_semiseasonal_${season.toUpperCase()}.dat`),
	});
}
