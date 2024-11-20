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
	123: 'sfbt:peterycristi-props',
	168: [
		'vortext:vortexture-1',
		'vortext:vortexture-2',
	],
};
