// # get-dependency.js
import index from '../dist/index.js';

// # parseDependencies(metadata)
// Parses all dependencies from the metadata. We do this by inspecting all links 
// and see if we can match them with a dependency.
export default function parseDependencies(metadata) {
	let all = [];
	for (let link of metadata.links) {
		let deps = getDependency(link);
		if (!deps) continue;
		if (Array.isArray(deps)) {
			all.push(...deps);
		} else {
			all.push(deps);
		}
	}

	// Avoid duplicates in case there are multiple links.
	return [...new Set(all)];

}

// Performs a heuristic lookup of what dependency could be represented by the 
// given link. Simtropolis links are checked in the index of all simtropolis 
// packages by url.
function getDependency({ link, text }) {
	let url = new URL(link);
	let { hostname } = url;
	if (hostname === 'community.simtropolis.com') {
		url.search = '';
		let { href } = url;
		if (!href.endsWith('/')) href = `${href}/`;
		if (index[href]) return index[href];
	} else if (hostname === 'www.sc4devotion.com') {
		if (!url.pathname.includes('csxlex')) return null;
		let { searchParams } = url;
		let id = searchParams.get('lotGET');
		if (bsc[id]) return bsc[id];
	} else if (hostname.includes('toutsimcities')) {
		let id = url.pathname.replace(/\/$/).split('/').at(-1);
		if (tsc[id]) return tsc[id];
	}

	// If we were unable to parse the url at this point, we might still get some 
	// information about it based on the link text.
	text = text.toLowerCase();
	if (text.match(/shk parking pack/)) {
		return 'shk:parking-pack';
	} else if (text.match(/sfbt essentials/)) {
		return 'sfbt:essentials';
	}

	// Check if we have a raw url match.
	if (raws[link]) return raws[link];

	// Filter out links to the forums.
	if (hostname.includes('simtropolis') && url.pathname.includes('/forums')) {
		return null;
	}

	// If we really can't figure it out, just return the url as is. Needs to be 
	// manually fixed in that case.
	return `[${text}](${link})`;

}

// Index of sc4devotion ids to known packages.
const bsc = {
	90: 'bsc:textures-vol01',
	338: 'bsc:mega-props-jes-vol02',
	342: 'bsc:mega-props-jes-vol01',
	397: 'bsc:mega-props-gascooker-vol01',
	403: 'bsc:mega-props-swi21-vol01',
	746: 'bsc:mega-props-sg-vol01',
	1180: 'bsc:mega-props-cp-vol01',
	1547: 'bsc:mega-props-newmaninc-vol02',
	2177: 'ncd:rail-yard-and-spur-mega-pak-1',
	2383: 'bsc:bat-props-mattb325-vol02',
	2768: 'bsc:bat-props-mattb325-vol03',
	2854: 'girafe:ashes',
};

// Index of toutsimcities ids.
const tsc = {
	1579: 'manchou:houses-ag-models',
	1780: 'namspopof:props-pack-vol1',
	1882: 'namspopof:props-pack-vol2',
	1919: 'namspopof:bat-props-pack-vol02',
	1959: 'namspopof:bat-props-pack-vol03',
};

// Some bsc dependencies are referenced by their Simtropolis url, but they are 
// not present in the index as they come from sc4evermore.
const raws = {
	'https://community.simtropolis.com/files/file/15287-bsc-mega-props-sg-vol-01/': 'bsc:mega-props-sg-vol01',
	'http://kurier.simcityplaza.de/details.php?file=5': 'sfbt:essentials',
	'http://kurier.simcityplaza.de/details.php?file=305': 'maxis:buildings-as-props',
};
