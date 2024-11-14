// # data.js
// Index of sc4devotion ids to known packages.
export const sc4d = {
	90: 'bsc:textures-vol01',
	338: 'bsc:mega-props-jes-vol02',
	342: 'bsc:mega-props-jes-vol01',
	397: 'bsc:mega-props-gascooker-vol01',
	403: 'bsc:mega-props-swi21-vol01',
	746: 'bsc:mega-props-sg-vol01',
	1180: 'bsc:mega-props-cp-vol01',
	1547: 'bsc:mega-props-newmaninc-vol02',
	2135: 'bsc:mega-props-cp-vol02',
	2177: 'ncd:rail-yard-and-spur-mega-pak-1',
	2383: 'bsc:bat-props-mattb325-vol02',
	2768: 'bsc:bat-props-mattb325-vol03',
	2790: 'bsc:mega-props-cp-vol02',
	2854: 'girafe:ashes',
	3461: 'girafe:walnut-trees',
	396: 'bsc:mega-props-d66-vol01',
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
	pegasus: 'peg',
	pclark06: 'pc',
	simmer2: 'sm2',
	philforhockey51: 'phil',
	'barroco hispano': 'agc',
	'hugues aroux': 'scoty',
};

// Some authors prefix their summaries, e.g. kingofsimcity -> KOSC. We want to 
// filter this out.
export const prefixes = {
	kingofsimcity: /^kosc/i,
};
