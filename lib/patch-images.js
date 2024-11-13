// # patch-aaron.js
import yaml from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import scrape from './scrape.js';

const folder = 'mattb325';
const files = ['new-york-w2w'];
const dir = path.resolve(import.meta.filename, `../../sc4pac/src/yaml/${folder}`);
for (let filename of files.length > 0 ? files : fs.readdirSync(dir)) {
	if (!filename.endsWith('yaml')) {
		filename += '.yaml';
	}
	let fullPath = path.join(dir, filename);
	let contents = String(fs.readFileSync(fullPath));
	let parsed = yaml.parse(contents.split('---')[0]);
	if (parsed.name.includes('collection')) continue;
	let url = parsed.info.website;
	let data = await scrape(url, { assets: false });
	let str = yaml.stringify({
		images: data.info.images,
	}).split('\n').map(x => '  '+x).join('\n');
	contents = contents.replace(/ {2}website: (.*)/, '  website: $1\n'+str);
	fs.writeFileSync(fullPath, contents);
}
