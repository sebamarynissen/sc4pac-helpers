// # data.js
// Index of sc4devotion ids to known packages.
export const sc4d = {
	90: 'bsc:textures-vol01',
	101: 'bsc:texturepack-cycledogg-vol01',
	272: 'bsc:mega-props-snm-vol01',
	338: 'bsc:mega-props-jes-vol02',
	339: 'bsc:mega-props-jes-vol03',
	342: 'bsc:mega-props-jes-vol01',
	396: 'bsc:mega-props-d66-vol01',
	397: 'bsc:mega-props-gascooker-vol01',
	398: 'bsc:mega-props-rt-vol01',
	403: 'bsc:mega-props-swi21-vol01',
	475: 'bsc:mega-props-dae-vol01',
	613: 'bsc:mega-props-newmaninc-vol01',
	638: 'bsc:textures-vol02',
	746: 'bsc:mega-props-sg-vol01',
	791: 'bsc:mega-props-jes-vol04',
	1180: 'bsc:mega-props-cp-vol01',
	1263: 'bsc:mega-props-jes-vol05',
	1416: 'bsc:mega-props-jes-vol06',
	1495: 'bsc:mega-props-jes-vol07',
	1547: 'bsc:mega-props-newmaninc-vol02',
	1758: 'bsc:mega-props-jmyers-agriculture-vol01',
	1771: 'bsc:mega-props-misc-vol02',
	1955: 'orange:mega-props-vol01',
	2135: 'bsc:mega-props-cp-vol02',
	2177: 'ncd:rail-yard-and-spur-mega-pak-1',
	2349: 'bsc:mega-props-jes-vol09',
	2383: 'bsc:bat-props-mattb325-vol02',
	2620: 'girafe:birches',
	2687: 'girafe:cattails',
	2711: 'girafe:bushes',
	2768: 'bsc:bat-props-mattb325-vol03',
	2770: 'girafe:subalpine-firs',
	2790: 'bsc:mega-props-cp-vol02',
	2809: 'girafe:maples-v2',
	2821: 'bsc:vip-girafe-carpack-vol01-vol02',
	2854: 'girafe:ashes',
	2869: 'girafe:lindens',
	2871: 'girafe:lupins',
	2888: 'girafe:berries',
	2945: 'girafe:common-spruces',
	2962: 'girafe:poppies',
	2964: 'girafe:narcissus',
	2980: 'girafe:sparaxis',
	2983: 'girafe:cypresses',
	2995: 'girafe:beeches',
	3001: 'girafe:feather-grass',
	3049: 'girafe:chestnuts',
	3071: 'girafe:hedges',
	3244: 'girafe:rowan-trees',
	3251: 'girafe:daisy',
	3310: 'simmer2:rrw-legacy-lottex-mega-texture-pack',
	3311: 'simmer2:rrw-legacy-lottex-mega-texture-pack',
	3329: 'simmer2:rrw-legacy-lottex-mega-texture-pack',
	3347: 'girafe:elms',
	3461: 'girafe:walnut-trees',
	3579: 'girafe:poplars',
	3586: 'sm2:essentials-v4',
	3640: 'sm2:mega-prop-pack-vol1',
	3645: 'sm2:mega-prop-pack-vol2',
	3672: 'bsc:bat-props-mattb325-vol04',
	3787: 'sm2:mega-prop-pack-vol3',
	3885: 'sm2:mega-prop-pack-vol4',
	3970: 'wmp:mega-props-vol01',
	3971: 'wmp:mega-props-vol02',
	3974: 'wmp:mega-props-vol05',
	3975: 'wmp:essentials',
};

// Some packages are often referenced by their bare url as well.
export const urls = {
	'http://kurier.simcityplaza.de/details.php?file=5': 'sfbt:essentials',
	'http://kurier.simcityplaza.de/details.php?file=305': 'maxis:buildings-as-props',
	'https://community.simtropolis.com/files/file/11421-jenx-porkie-expanded-porkie-props/': 'porkissimo:jenx-porkie-expanded-porkie-props',
	'https://community.simtropolis.com/files/file/15287-bsc-mega-props-sg-vol-01/': 'bsc:mega-props-sg-vol01',
	'https://community.simtropolis.com/files/file/24509-spot/': 'peg:spot',
	// Package superseded by supershk:mega-parking-textures
	'https://community.simtropolis.com/files/file/30934-supershk-parking-textures-vol-1/': 'supershk:mega-parking-textures',
	'https://community.simtropolis.com/files/file/32997-rrw-lottex-sm2/': 'simmer2:rrw-legacy-lottex-mega-texture-pack',
	'https://community.simtropolis.com/files/file/32998-rrw-lottex-sw/': 'simmer2:rrw-legacy-lottex-mega-texture-pack',
	'https://community.simtropolis.com/files/file/32999-rrw-lottex-sm2r2/': 'simmer2:rrw-legacy-lottex-mega-texture-pack',
	'https://www.sc4evermore.com/index.php/downloads/download/22-dependencies/13-sfbt-essentials': 'sfbt:essentials',
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
