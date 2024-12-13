// # build-girafe-database.js
import path from 'node:path';
import { ExemplarProperty } from 'sc4/core';
import build from '../lib/build-tree-database.js';

// # getId(exemplar, entry)
// Exports the function to get the tree id from an exemplar. This is used when 
// creating patches as well.
export function getId(exemplar, entry) {
	switch (exemplar.get(ExemplarProperty.ExemplarType)) {
		case 0x0f: return getFloraId(exemplar, entry);
		case 0x1e: return getPropId(exemplar, entry);
	}
}

// # getModels()
function getModels(exemplar, entry) {
	switch (exemplar.get(ExemplarProperty.ExemplarType)) {
		case 0x0f: return getFloraModels(exemplar, entry);
		case 0x1e: return getPropModels(exemplar, entry);
	}
}

// # getPropTreeId(exemplar, entry)
// Determines the tree id of the given prop exemplar. A tree id is a way to 
// uniquely identify a tree regardless of the various seasons it has models for. 
// In other words, every tree id will have a set of season that it supports.
const seasonRegex = /(autumn|summer|winter|evergreen|spring|seasonal)/i;
function getPropId(exemplar, entry) {
	let tree = exemplar
		.get(ExemplarProperty.ExemplarName)
		.replace(seasonRegex, '')
		.replace(/^Grfe_/g, '')
		.replace(/_$/, '')
		.replaceAll(/_+/g, '-')
		.toLowerCase();
	return `girafe:${tree}-prop`;
}

// # getPropSeasons(exemplar, entry)
// Returns all model TGIs that we can find in this prop exemplar. Note that 
// Girafe's prop exemplars typically don't contain multiple seasons.
const snowRegex = /_(grand_fir|conifer|subalpinefir|serbien_spruce|common_spruce|conifer)_/i;
function getPropModels(exemplar, entry) {

	// If the prop only has an RKT1, then it typically is an evergreen prop 
	// because it is always visible.
	let rkt1 = exemplar.get(ExemplarProperty.ResourceKeyType1);
	if (rkt1) {
		return { evergreen: rkt1.slice(1) };
	}

	// If the prop has an RKT4 of 8 reps - always the case for Girafe - then 
	// we'll determine the season based on the simulator date start.
	let rkt4 = exemplar.get(ExemplarProperty.ResourceKeyType4);
	if (rkt4) {
		let model = rkt4.slice(6);
		let season = getSeasonFromStartDate(exemplar);

		// If this is a winter tree, then check if this is a snow-capped prop. 
		// This is the case for the coniferous trees.
		if (season === 'winter') {
			let name = exemplar.get('ExemplarName');
			if (snowRegex.test(name)) {
				season = 'snow';
			}
		}
		return { [season]: model };

	}

	// By default, nothing is found.
	return {};

}

function getSeasonFromStartDate(exemplar) {
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

// # getFloraId(exemplar, entry)
// Parses the unique id for this flora regardless of seasons. Note that serbian 
// spruces, abies grandis and maples need a special treatment because there are 
// multiple versions that might clash.
function getFloraId(exemplar, entry) {
	let pkg = path.basename(path.dirname(entry.dbpf.file));
	let suffix = '';
	let [group, name, version] = pkg.split('.');
	if (pkg.match(/(serbian|maples|abies)/)) {
		suffix = `-v${version}`;
	}
	let [, variant = ''] = exemplar
		.get(ExemplarProperty.ExemplarName)
		.match(/_([A-Z]\d?|\d{2})$/) || [];
	if (variant) {
		variant = variant.replace(/([A-Z])\d$/, '$1');
		variant = `-${variant}`.toLowerCase();
	}
	return `${group}:${name}${suffix}${variant}-flora`;
}

// # getFloraSeasons(exemplar, entry)
// Extracts the models for every season from the flora exemplar.
function getFloraModels(exemplar, entry) {

	// RKT5 flora is older flora where the models for the various seasons are 
	// determined by an offset.
	let rkt5 = exemplar.get(ExemplarProperty.ResourceKeyType5);
	if (rkt5) {
		let [group, instance] = rkt5.slice(1);
		return {
			fall: [group, instance],
			winter: [group, instance + 0x00010000],
			summer: [group, instance + 0x00020000],
		};
	}

	// In case the flora has an RKT4, then we read the various season models 
	// from the exemplar itself.
	let rkt4 = exemplar.get(ExemplarProperty.ResourceKeyType4);
	if (rkt4) {
		let n = rkt4.length / 8;
		let seasons = {};
		for (let i = 0; i < n; i++) {
			let index = 8*i;
			let season = ['fall', 'winter', 'summer'][rkt4[index]];
			let model = rkt4.slice(index+6, index+8);
			seasons[season] = model;
		}

		// If this package is labeled as where the winter tree has a snow model 
		// - which is the case for all coniferous models - then we've found the 
		// snow model too.
		let { file } = entry.dbpf;
		let pkg = path.basename(path.dirname(file));
		if (pkg.includes('larches') && file.match(/_S\.dat$/) || hasSnow(pkg)) {
			let { winter } = seasons;
			if (winter) {
				seasons.snow = [...winter];
			}
		}
		return seasons;

	}

	// If the model is using an RKT1, then it's an evergreen model or everwinter 
	// model. Everwinter models are always snow-capped trees in the case of 
	// Girafe's flora. 
	let rkt1 = exemplar.get(ExemplarProperty.ResourceKeyType1);
	if (rkt1) {
		let gi = rkt1.slice(1);
		let { file } = entry.dbpf;
		let season = file.match(/winter/i) ? 'snow' : 'evergreen';
		return { [season]: gi };
	}

	// By default we return nothing.
	return null;

}

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
	let name = pkg.split('.').at(1);
	return withSnow.some(what => name.includes(what));
}

await build('{girafe,orange}:*', {
	cwd: path.resolve(import.meta.dirname, '../packages/Girafe'),
	id: getId,
	models: getModels,
});
