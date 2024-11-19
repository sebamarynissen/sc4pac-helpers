// # create-index.js
import path from 'node:path';
import fs from 'node:fs';
import { Glob } from 'glob';
import yaml from 'yaml';

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
	let split = String(buffer).split(/-{3,100}/);
	for (let item of split) {
		let parsed = yaml.parse(item);
		if (!parsed) continue;
		if (parsed.assetId) continue;
		let { website } = parsed.info;
		if (!URL.canParse(website)) continue;
		let url = new URL(website);
		if (!url.hostname.includes('community.simtropolis.com')) continue;
		if (!url.pathname.includes('/files/file')) continue;
		let pkg = `${parsed.group}:${parsed.name}`;

		// IMPORTANT! Simtropolis urls are uniquely identified by the file id, 
		// the rest of the url slug doesn't actually matter, so we'll strip that 
		// off.
		url.pathname = url.pathname.split('-').at(0);
		(index[url.href] ??= []).push(pkg);

	}
}

const dir = path.resolve(import.meta.dirname, '../../sc4pac/src');
const index = await createIndex(dir);
const contents = `export default ${JSON.stringify(index)}`;
fs.writeFileSync(path.resolve(import.meta.dirname, '../dist/index.js'), contents);
