// # create-index.js
import path from 'node:path';
import fs from 'node:fs';
import { Glob } from 'glob';
import yaml from 'yaml';
import existing from './data/st.js';

// # createIndex(dir)
// Creates an index of all packages by their Simtropolis url. This is useful 
// when automatically parsing dependencies in the scrape script.
export default async function createIndex(dir) {
	const glob = new Glob('**/*.yaml', {
		cwd: dir,
		absolute: true,
	});
	const index = {};
	let tasks = [];
	for await (let file of glob) {
		tasks.push(addToIndex(index, file));
	}
	await Promise.all(tasks);
	return index;
}

async function addToIndex(index, file) {
	let buffer = await fs.promises.readFile(file);

	let docs = yaml.parseAllDocuments(buffer+'');
	for (let doc of docs) {
		let parsed = doc.toJSON();
		if (!parsed) continue;
		if (parsed.assetId) continue;
		if (!parsed.info) continue;
		let { website } = parsed.info;
		if (!URL.canParse(website)) continue;
		let url = new URL(website);
		if (!url.hostname.includes('community.simtropolis.com')) continue;
		if (!url.pathname.includes('/files/file')) continue;
		let pkg = `${parsed.group}:${parsed.name}`;

		// Extract the file id form the url.
		let file = url.pathname
			.replace(/\/$/, '')
			.split('/')
			.at(-1)
			.split('-')
			.at(0);
		if (index[file]) {
			let value = index[file];
			value.push ? value.push(pkg) : (index[file] = [value, pkg]);
		} else {
			index[file] = pkg;
		}

	}
}

const index = {
	...await createIndex(path.resolve(import.meta.dirname, '../../sc4pac/src')),
	...await createIndex(path.resolve(import.meta.dirname, '../../simtropolis-channel/src')),
};

// Now merge the index with the existing Simtropolis index.
const merged = { ...existing };
for (let file of Object.keys(index)) {

	// If it exists, we create an array of it, but we have to ensure to only 
	// keep the unique values of course.
	let existing = [merged[file] || []].flat();
	let excluded = new Set(existing
		.filter(dep => dep.startsWith('!'))
		.map(x => x.slice(1)));
	let all = new Set([
		...[merged[file] || []].flat(),
		...[index[file]].flat(),
	].map(x => x.startsWith('!') ? x.slice(1) : x));
	let arr = [...all].sort().map(x => excluded.has(x) ? `!${x}` : x);
	merged[file] = arr.length > 1 ? arr : arr.at(0);

}

let zasco = await createIndex(path.resolve(import.meta.dirname, '../zasco/src'));
for (let key of Object.keys(zasco)) {
	if (!Object.hasOwn(index, key)) {
		delete merged[key];
	}
}

// We're not done yet: for git purposes, we want to make sure that the keys are 
// properly sorted.
const keys = Object.keys(merged);
keys.sort((a, b) => +a < +b ? -1 : 1);

// Generate the code.
let map = keys.map(key => {
	let value = merged[key];
	let str;
	if (Array.isArray(value)) {
		str = `[\n${value.map(x => `\t\t'${x}',`).join('\n')}\n\t]`;
	} else {
		str = `'${value}'`;
	}
	return `\t${key}: ${str},`;
}).join('\n');
let code = `// # st.js
// Contains a map of all known Simtropolis file ids and their corresponding 
// sc4pac packages.
export default {
${map}
};
`;

fs.writeFileSync(path.resolve(import.meta.dirname, '../lib/data/st.js'), code);
