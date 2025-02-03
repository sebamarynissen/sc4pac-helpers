// # get-all.js
import { Glob } from 'glob';
import { parseAllDocuments } from 'yaml';
import path from 'node:path';
import fs from 'node:fs';

const folder = path.resolve(import.meta.dirname, '../../simtropolis-channel/src/yaml/vip');
const glob = new Glob('**/*.yaml', {
	cwd: folder,
	absolute: true,
});

let arr = [];
for (let file of glob) {
	let buffer = fs.readFileSync(file);
	let docs = parseAllDocuments(buffer+'');
	for (let doc of docs) {
		let json = doc.toJSON();
		if (!json.group) continue;
		arr.push(`${json.group}:${json.name}`);
	}
}
arr.sort();
console.log('[');
for (let pkg of arr) {
	console.log(`    "${pkg}",`);
}
console.log(']');
