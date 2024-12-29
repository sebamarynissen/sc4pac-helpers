// # data.js
export { default as st } from './data/st.js';
export { default as sc4d } from './data/sc4d.js';
export { default as sc4e } from './data/sc4e.js';

// Some packages are often referenced by their bare url as well.
export const urls = {
	'http://kurier.simcityplaza.de/details.php?file=5': 'sfbt:essentials',
	'http://kurier.simcityplaza.de/details.php?file=305': 'maxis:buildings-as-props',
	'https://community.simtropolis.com/Documents/RR%20MEGA%20Prop%20Pack%20Vol.%202.3.3': 'rretail:mega-prop-pack-vol2',
	'https://community.simtropolis.com/sc4-maxis-files/': 'maxis:buildings-as-props',
	'https://www.simtropolis.com/stex/index.cfm?page=1&keyword=bsc%20peg&type=all': 'bsc:textures-vol01',
};

// Index of toutsimcities ids.
export const toutsimcities = {
	587: 'bsc:textures-vol02',
	1516: 'blanco:tram-prop-pack',
	1573: 'blanco:train-prop-pack',
	1579: 'manchou:houses-ag-models',
	1584: 'r6:prop-pack-vol1',
	1592: 'r6:prop-pack-vol2',
	1602: 'manchou:village-pack-vol03-props',
	1686: 'r6:prop-pack-2010-vol1',
	1702: 'r6:prop-pack-2010-vol2',
	1780: 'namspopof:props-pack-vol1',
	1882: 'namspopof:props-pack-vol2',
	1919: 'namspopof:bat-props-pack-vol02',
	1959: 'namspopof:bat-props-pack-vol03',
};

// Acronyms to be used for specific authors.
export const authors = {
	'barroco hispano': 'agc',
	'hugues aroux': 'scoty',
	pegasus: 'peg',
	philforhockey51: 'phil',
	robdragon: 'rdg',
	simgoober: 'sg',
	simmer2: 'sm2',
	'vip team': 'vip',
};

// Some authors prefix their summaries, e.g. kingofsimcity -> KOSC. We want to 
// filter this out.
export const prefixes = {
	agc: /^agc\b/i,
	dexter: /^dex/i,
	kingofsimcity: /^kosc/i,
	marcosmx: /^rnp/i,
	pc: /^pc\b/i,
	peg: /^peg\b/i,
	rretail: /^rr\b/i,
	sm2: /^sm2/i,
};
