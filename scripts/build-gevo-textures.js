import { Glob } from 'glob';
import { Document } from 'yaml';
import path from 'node:path';
import fs from 'node:fs';
import stylize from '../lib/stylize-doc.js';

const root = path.resolve(import.meta.dirname, '../Proppack 3');
for (let i = 1; i <= 5; i++) {
	const glob = new Glob('*.dat', {
		cwd: path.join(root, `P${i}`),
	});

	const json = {
		group: 'bsc',
		name: `vdk-gevo-textures-props-p${i}`,
		subfolder: '100-props-textures',
		version: '1.0',
		info: {
			summary: `VDK GEVo Textures Props by Vester`,
			website: 'https://www.sc4evermore.com/index.php/downloads/download/296-bsc-vdk-prop-pack-vol03-gevo-engines',
			images: [
				'https://www.sc4evermore.com/images/jdownloads/screenshots/BSC%20VDK%20Proppack%203%20Vol3B.jpg',
				'https://www.sc4evermore.com/images/jdownloads/screenshots/VDK%20GEvo%20Props%20readme.jpg',
			],
		},
		variants: [],
	};

	for await (let file of glob) {
		let name = file
			.replace(/\.dat$/, '')
			.replace(/^VDK GEVo Textures Props P[1-5] Vol0\d[A-Z] /, '')
			.toLowerCase();
		json.variants.push({
			variant: { [`${json.group}:${json.name}:textures`]: name },
			assets: [{
				assetId: 'bsc-vdk-prop-pack-vol03-gevo-engines',
				include: [`/${file}`],
			}],
		});
	}

	const doc = stylize(new Document(json));
	await fs.promises.writeFile(
		path.resolve(import.meta.dirname, '../../sc4pac/src/yaml/bsc', `vdk-gevo-textures-props-p${i}.yaml`),
		doc.toString(),
	);

}
