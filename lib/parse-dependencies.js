// # get-dependency.js
import st from './data/st.js';
import sc4e from './data/sc4e.js';
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
	if (hostname.includes('simtropolis.com')) {
		let file = parseSimtropolisIdFromUrl(url);

		// If the file id is 26793, it refers to the NAM. No need to list this 
		// as a depdency.
		if (+file === 26793) return null;
		if (st[file]) {
			return st[file];
		}

	} else if (hostname.includes('sc4devotion.com')) {
		if (!url.pathname.includes('csxlex')) return null;
		let { searchParams } = url;
		let id = searchParams.get('lotGET');
		if (sc4d[id]) return sc4d[id];
	} else if (hostname.includes('toutsimcities')) {
		let id = url.pathname.replace(/\/$/).split('/').at(-1);
		if (tsc[id]) return tsc[id];
	} else if (hostname.includes('sc4evermore.com')) {
		let id = url.pathname
			.replace(/\/$/, '')
			.split('/')
			.at(-1)
			.split('-')
			.at(0);
		if (sc4e[id]) return sc4e[id];
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

	// Filter out cleanitol links.
	if (url.pathname.includes('cleanitol')) return null;

	// If we really can't figure it out, just return the url as is. Needs to be 
	// manually fixed in that case.
	return `"[${text}](${link})"`;

}

// # parseSimtropolisIdFromUrl(href)
// Extracts the file id from a Simtropolis url, either the old format or the new 
// format.
export function parseSimtropolisIdFromUrl(href) {
	let url = new URL(href);
	if (url.pathname.includes('details.cfm')) {
		return url.searchParams.get('id');
	} else {
		return url.pathname
			.replace(/\/$/, '')
			.split('/')
			.at(-1)
			.split('-')
			.at(0);
	}
}
