// # get-dependency.js
import index from '../dist/index.js';
import { sc4d, urls, toutsimcities as tsc } from './data.js';

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
	link = link.trim();
	if (!link) return null;
	let url;
	try {
		url = new URL(link);
	} catch {
		console.warn(`Invalid dependency url: ${url}`);
	}
	if (!url) return null;
	let { hostname } = url;
	if (hostname === 'community.simtropolis.com') {
		url.search = '';
		let { href } = url;
		if (!href.endsWith('/')) href = `${href}/`;
		if (index[href]) return index[href];
	} else if (hostname.includes('sc4devotion.com')) {
		if (!url.pathname.includes('csxlex')) return null;
		let { searchParams } = url;
		let id = searchParams.get('lotGET');
		if (sc4d[id]) return sc4d[id];
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
	if (urls[link]) return urls[link];

	// Filter out links to the forums or user profiles.
	if (hostname.includes('simtropolis')) {
		if (url.pathname.match(/\/(forums|profile)\//)) return null;
	}

	// If we really can't figure it out, just return the url as is. Needs to be 
	// manually fixed in that case.
	return `[${text}](${link})`;

}
