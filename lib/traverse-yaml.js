// # tarverse-yaml.js
// Utility function for easily traversing and modifying yaml in bulk.
import path from 'node:path';
import fs from 'node:fs';
import { Glob } from 'glob';
import { Document, parseAllDocuments } from 'yaml';
import stylize from './stylize-doc.js';

// # traverse(patterns, fn)
export default async function traverse(patterns, fn = () => {}) {
	const glob = new Glob(patterns, {
		absolute: true,
		nodir: true,
		nocase: true,
		cwd: path.resolve(import.meta.dirname, '../../sc4pac/src/yaml'),
	});
	for await (let file of glob) {
		let contents = await fs.promises.readFile(file);
		let docs = [];
		let changed;
		for (let doc of parseAllDocuments(String(contents))) {
			let result = await fn(doc.toJSON(), doc);
			if (result) {
				if (result instanceof Document) {
					docs.push(result);
				} else {
					docs.push(new Document(result));
				}
				changed = true;
			} else {
				docs.push(doc);
			}
		}
		if (changed) {
			let buffer = docs.map(doc => stylize(doc).toString()).join('\n---\n');
			await fs.promises.writeFile(file, buffer);
		}
	}
}
