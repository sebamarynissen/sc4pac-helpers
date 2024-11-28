// # sc4e.js
import bsc from './deps-bsc.js';
import girafe from './deps-girafe.js';

// Contains a map of all known SC4Evermore ids and their corresponding sc4pac 
// packages. Note that for the BSC common dependencies and Girafe packages 
// the dependencies can probably still be reduced, but as long as it isn't 
// explicitly mentioned, we'd have to run the dependency tracking script 
// manually.
export default {
	3: bsc,
	13: 'sfbt:essentials',
	27: girafe,
	118: 'sfbt:kenworth-and-royal-railway-props',
	119: 'sfbt:royal-light-signal-props',
	120: 'sfbt:royal-semaphore-signals-props',
	121: 'sfbt:rambuckel-horse-props',
	122: 'sfbt:sam-johnson-playground-props',
	123: 'sfbt:peterycristi-props',
	154: [
		'bsc:vip-girafe-mgb204-bicyclepack-vol01',
		'bsc:vip-girafe-mgb204-bicyclepack-vol01-mmp',
	],
	166: [
		'bsc:aln-rrp-fences-props',
		'bsc:aln-rrp-fences',
	],
	167: [
		'aln:rrp-pasture-flora-props',
		'aln:blue-bonnets-b',
		'aln:blue-bonnets',
		'aln:cat-tails',
		'aln:grasses',
		'aln:grass',
		'aln:hay-bales',
		'aln:johnson-grass',
		'aln:lillypads',
		'aln:marsh',
		'aln:medium-scrub-brush',
		'aln:pink-wild-flowers-b',
		'aln:reed-grass',
		'aln:straws',
		'aln:stumps',
		'aln:weeds-a',
		'aln:weeds-b',
		'aln:white-wild-flowers',
		'aln:yellow-wild-flowers-b',
		'aln:yellow-wild-flowers',
	],
	168: [
		'vortext:vortexture-1',
		'vortext:vortexture-2',
	],
	188: 'vip:vnanoed-props-pack-vol01',
	296: [
		'bsc:vdk-gevo-props',
		'vdk-gevo-textures-props-p1',
		'vdk-gevo-textures-props-p2',
		'vdk-gevo-textures-props-p3',
		'vdk-gevo-textures-props-p4',
		'vdk-gevo-textures-props-p5',
	],
	317: 'vortext:historic-monastery-props',
};
