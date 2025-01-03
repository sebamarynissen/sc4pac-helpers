// # add-stex-urls.js
// Script for automattically adding the stex urls to the mattb325 commercial 
// collection.
import fs from 'node:fs';
import traverse from '#lib/traverse-yaml.js';

const urls = String(await fs.promises.readFile('../lib/data/mattb325-urls.txt'));
const map = {};
for (let raw of urls.trim().split('\n').map(x => x.trim())) {
	let slug = raw
		.split('/')
		.at(-2)
		.split('-')
		.slice(1)
		.join('-');
	map[slug] = raw;
}

await traverse('**/mattb325/commercial-w2w-collection.yaml', (js, doc) => {
	if (!js.group) return;
	let { name } = js;
	let url = map[name];
	if (!url) return;
	let { websites } = js.info;
	js.info.websites = [...new Set([
		url,
		...websites,
	])];
	return js;
});
