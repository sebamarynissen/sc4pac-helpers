// # patch-aaron.js
import yaml from 'yaml';
import { Glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';
import scrape from './scrape.js';

// const folder = 'diego-del-llano';
// const files = [];
// const dir = path.resolve(import.meta.filename, `../../sc4pac/src/yaml/${folder}`);
// for (let filename of files.length > 0 ? files : fs.readdirSync(dir)) {
const dir = path.resolve(import.meta.filename, `../../sc4pac/src/yaml`);
const glob = new Glob('**/*.yaml', {
	nodir: true,
	cwd: dir,
});
for await (let filename of glob) {
	if (!filename.endsWith('yaml')) {
		filename += '.yaml';
	}
	let fullPath = path.join(dir, filename);
	console.log(fullPath);
	let contents = String(fs.readFileSync(fullPath));
	let split = contents.split('---');
	let parts = split.map(async raw => {
		let parsed = yaml.parse(raw);
		if (!parsed || parsed.assetId || parsed.info?.images) return raw;
		if (!parsed.info) {
			console.log(parsed);
			return raw;
		}
		let { website } = parsed.info;
		if (!website) return raw;
		if (!website.includes('simtropolis.com')) return raw;
		if (website.includes('/topic/')) return raw;
		if (!website.includes('/files/file')) return raw;
		let url = new URL(website);
		if (url.searchParams.get('type') === 'downloads_file') return raw;
		let data = await scrape(url, { assets: false });
		let str = yaml.stringify({
			images: data.info.images,
		}).split('\n').map(x => '  '+x).join('\n').trimEnd();
		let contents = raw.replace(/ {2}website: (.*)/, '  website: $1\n'+str);
		return contents;
	});
	contents = (await Promise.all(parts)).join('---');
	fs.writeFileSync(fullPath, contents);
}
