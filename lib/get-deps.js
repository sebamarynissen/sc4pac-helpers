import path from 'node:path';
import fs from 'node:fs';
import yaml from 'yaml';

const file = path.resolve(import.meta.filename, '../../sc4pac/src/yaml/bsc/common-dependencies.yaml');
const contents = fs.readFileSync(file);
let parts = String(contents)
	.split('---')
	.map(raw => yaml.parse(raw))
	.filter(parsed => {
		return parsed.assets?.some(asset => asset.assetId === 'sc4d-lex-legacy-bsc-common-dependencies-pack');
	})
	.map(parsed => `"${parsed.group}:${parsed.name}",`)
	.join('\n');
console.log(parts);