// # data.js
export { default as st } from './data/st.js';
export { default as sc4d } from './data/sc4d.js';
export { default as sc4e } from './data/sc4e.js';

// Some packages are often referenced by their bare url as well.
export const urls = {
	'http://kurier.simcityplaza.de/details.php?file=5': 'sfbt:essentials',
	'http://kurier.simcityplaza.de/details.php?file=305': 'maxis:buildings-as-props',
	'https://community.simtropolis.com/sc4-maxis-files/': 'maxis:buildings-as-props',
	'https://www.simtropolis.com/stex/index.cfm?page=1&keyword=bsc%20peg&type=all': 'bsc:textures-vol01',
};

// Index of toutsimcities ids.
export const toutsimcities = {
	1579: 'manchou:houses-ag-models',
	1780: 'namspopof:props-pack-vol1',
	1882: 'namspopof:props-pack-vol2',
	1919: 'namspopof:bat-props-pack-vol02',
	1959: 'namspopof:bat-props-pack-vol03',
};

// Acronyms to be used for specific authors.
export const authors = {
	'barroco hispano': 'agc',
	'hugues aroux': 'scoty',
	pclark06: 'pc',
	pegasus: 'peg',
	philforhockey51: 'phil',
	robdragon: 'rdg',
	simmer2: 'sm2',
};

// Some authors prefix their summaries, e.g. kingofsimcity -> KOSC. We want to 
// filter this out.
export const prefixes = {
	kingofsimcity: /^kosc/i,
	sm2: /^sm2/i,
};
