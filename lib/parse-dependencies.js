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
	return all;
}

// Performs a heuristic lookup of what dependency could be represented by the 
// given link. Simtropolis links are checked in the index of all simtropolis packages by url.
function getDependency(link) {
	let url = new URL(link);
	let { hostname } = url;
	if (hostname === 'community.simtropolis.com') {
		url.search = '';
		let { href } = url;
		if (!href.endsWith('/')) href = `${href}/`;
		return index[href] || link;
	} else if (hostname === 'www.sc4devotion.com') {
		if (!url.pathname.includes('csxlex')) return null;
		let { searchParams } = url;
		let id = searchParams.get('lotGET');
		return bsc[id] || link;
	} else if (hostname.includes('toutsimcities')) {
		let id = url.pathname.replace(/\/$/).split('/').at(-1);
		return tsc[id] || link;
	} else {
		return link;
	}
}

// Index of sc4devotion ids to known packages.
const bsc = {
	90: 'bsc:textures-vol01',
	2383: 'bsc:bat-props-mattb325-vol02',
	2768: 'bsc:bat-props-mattb325-vol03',
	1547: 'bsc:mega-props-newmaninc-vol02',
	1180: 'bsc:mega-props-cp-vol01',
	2854: 'girafe:ashes',
	403: 'bsc:mega-props-swi21-vol01',
	746: 'bsc:mega-props-sg-vol01',
};

// Index of toutsimcities ids.
const tsc = {
	1579: 'manchou:houses-ag-models',
	1780: 'namspopof:props-pack-vol1',
	1882: 'namspopof:props-pack-vol2',
	1919: 'namspopof:bat-props-pack-vol02',
	1959: 'namspopof:bat-props-pack-vol03',
};
