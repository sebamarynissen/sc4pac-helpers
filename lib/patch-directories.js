// # patch-directories.js
import { parseAllDocuments } from 'yaml';
import fs from 'node:fs';

const file = import.meta.resolve('../../sc4pac/src/yaml/mattb325/industrial-collection.yaml');
const contents = fs.readFileSync(new URL(file)).toString();
const docs = parseAllDocuments(contents).filter(doc => doc.toJSON());

for (let doc of docs) {
	let js = doc.toJSON();
	if (!js.group) continue;
	let variants = doc.get('variants', true);
	if (!variants) continue;
	for (let item of variants.items) {
		let scalar = item.getIn(['assets', 0, 'include', 0], true);
		if (!scalar) continue;
		let { value } = scalar;
		let clean = value
			.replaceAll('/', '')
			.replaceAll(/_[DM]N#?$/g, '')
			.replaceAll(' ', ' ?')
			.replaceAll(/^([-=])/g, '$1?');
		scalar.value = `/${clean}(_[MD]N)?#?/`;
	}
}

let buffer = docs.map(doc => doc.toString()).join('\n');
fs.writeFileSync(new URL(file), buffer);
