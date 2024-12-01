import path from 'node:path';
import { Glob } from 'glob';
import { DBPF, ExemplarProperty } from 'sc4/core';

const withSnow = [
	'abies-grandis',
	'common-spruces',
	'conifers',
	'grand-firs',
	'larches',
	'serbian-spruce',
	'subalpine',
];
function hasSnow(pkg) {
	let base = path.basename(pkg);
	let name = base.split('.').at(1);
	return withSnow.some(what => name.includes(what));
}

// let lot = new DBPF(
// 	path.join(process.env.HOMEPATH, 'Desktop/PLOP_20x20_CV28x28_K-8SmallSchool_0314_b4d1f2f9.SC4Lot'),
// );
// let config = lot.exemplars.find(entry => {
// 	let exemplar = entry.read();
// 	return exemplar.singleValue(0x10) === 0x10;
// }).read();
// let offset = 0x88EDC900;
// while (config.get(offset)) {
// 	offset++;
// }
// const scale = 0x00100000;
// const size = 20;
// const factor = 0.5;
// const n = size/factor;
// for (let i = 0; i < props.length; i++) {
// 	let x = factor*(i % n);
// 	let z = factor*Math.floor(i / n);
// 	let minX = x;
// 	let minZ = z;
// 	let maxX = x;
// 	let maxZ = z;
// 	config.addProperty(offset+i, [
// 		0x01,
// 		0x00,
// 		0x00,
// 		x*scale,
// 		0,
// 		z*scale,
// 		minX*scale,
// 		minZ*scale,
// 		maxX*scale,
// 		maxZ*scale,
// 		0x00,
// 		0x192+i,
// 		props[i],
// 	]);
// }
// lot.save(
// 	path.resolve(process.env.SC4_PLUGINS, path.basename(lot.file)),
// );

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

	// Just like with the flora, we have to figure out the model TGI's for every season again.
	const models = {};
	for (let entry of exemplars) {
		allProps.push(entry.instance);
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
		console.log(models);
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
				let tgi = getModelForSeason(models, variant, season);
				let clone = exemplar.clone();
				clone.set(ExemplarProperty.ResourceKeyType1, tgi);
				let added = patches[season].add(entry.tgi, clone);
				added.compressed = true;
			}
		} else if (rkt4) {
			for (let season of allSeasons) {

				// If no model is found for this season, it might be a timed 
				// prop that simply doesn't show up in the other seasons. Not 
				// sure how to handle this yet...
				let tgi = getModelForSeason(models, variant, season);
				if (!tgi) continue;
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

async function handleFlora(exemplars, dir) {

	// The first thing we have to do is figure out the model TGI's for every 
	// season.
	const models = {};
	for (let entry of exemplars) {
		let exemplar = entry.read();

		// If an rkt1 property exists, we'll check if this is a *fixed winter* 
		// tree. This means that the tree contains snow in winter.
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);

		// We'll only use the RKT4's for getting the models for the various 
		// seasons, even for the evergreen ones.
		let rkt = exemplar.value(ExemplarProperty.ResourceKeyType4);
		if (!rkt) continue;
		let variant = getFloraVariant(name);
		models[variant] ??= {};

		let n = rkt.length / 8;
		for (let i = 0; i < n; i++) {
			let index = 8*i;
			let seasonId = rkt[index];
			let season = defaultOrder[seasonId];
			let [type, group, instance] = rkt.slice(index+5, index+8);
			models[variant][season] = [type, group, instance];
		}
	}
	if (Object.keys(models).length === 0) {
		console.log(`Skipping ${path.basename(dir)} for flora`);
		return;
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
		let exemplar = entry.read();
		let name = exemplar.singleValue(ExemplarProperty.ExemplarName);
		let variant = getFloraVariant(name);

		// If this exemplar has an RKT1, then it's a non-changing flora item - 
		// also called evergreen. We now have to create exemplars for every 
		// season and add them to the proper patch.
		let rkt1 = exemplar.value(ExemplarProperty.ResourceKeyType1);
		let rkt4 = exemplar.value(ExemplarProperty.ResourceKeyType4);
		if (rkt1) {
			for (let season of allSeasons) {
				let tgi = getModelForSeason(models, variant, season);
				let clone = exemplar.clone();
				clone.set(ExemplarProperty.ResourceKeyType1, tgi);
				let added = patches[season].add(entry.tgi, clone);
				added.compressed = true;
			}
		} else if (rkt4) {
			for (let season of allSeasons) {
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
		summer = options.spring,
		spring = summer,
		fall = summer,
		winter = fall,
		snow = winter,
	} = options;
	return ({ spring, summer, fall, winter, snow })[season];
}

function getFloraVariant(name) {
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
const packges = await glob.walk();

const allProps = [];
const defaultOrder = ['fall', 'winter', 'summer'];
const patches = {
	spring: new DBPF(),
	summer: new DBPF(),
	fall: new DBPF(),
	winter: new DBPF(),
	snow: new DBPF(),
};
const allSeasons = Object.keys(patches);

for (let pkg of packges) {
	await handlePackage(pkg);
}

// Save all the patches.
const output = path.resolve(process.env.HOMEPATH, 'Documents/SimCity 4/Plugins/849-my-overrides');
for (let season of allSeasons) {
	let dbpf = patches[season];
	dbpf.save({
		file: path.join(output, `${season}.dat`),
	});
}
