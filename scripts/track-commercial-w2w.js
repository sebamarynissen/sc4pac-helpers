// # track-commercial-w2w.js
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { Glob } from 'glob';
import { plugins } from '../lib/directories.js';
import DependencyTracker from '../lib/dependency-tracker.js';
import { Document, stringify as yamlStringify } from 'yaml';

// # getMetaData(tracker, dir)
// Extracts the basic metadata from the a directory name.
async function getMetadata(tracker, dir) {

	let base = path.basename(dir);
	let summary = base.replace(/_[dm]n$/i, '');
	let name = summary
		.toLowerCase()
		.trim()
		.replaceAll('&', 'and')
		.replaceAll(/\([a-z]+\)$/g, '')
		.trim()
		.replaceAll(/[\s']/g, '-');

	// Determine what we have to include from the assets. This is just the 
	// folder name, but take into account that some folders are prefixed 
	// with MN and DN.
	let includes;
	if (base.endsWith('_DN') || base.endsWith('_MN')) {
		includes = {
			standard: base.replace(/_[DM]N$/, '_MN'),
			dark: base.replace(/_[DM]N$/, '_DN'),
		};
	} else {
		includes = { standard: base, dark: base };
	}

	// Now track all dependencies.
	const { packages } = await tracker.track(dir);
	return {
		name,
		info: {
			summary,
		},
		dependencies: (packages.length > 0 ? packages : undefined),
		includes,
	};

}

// # stringify(obj)
// The function that actually generates the yaml to include from a json object. 
// All we have to do is make sure that the variant is folded and the includes 
// are quoted.
function stringify(obj) {
	const doc = new Document(obj);
	const variants = doc.get('variants');
	for (let item of variants.items) {
		item.get('variant', true).flow = true;
		let arr = item.getIn(['assets', 0, 'include'], true);
		if (arr) {
			arr.flow = true;
			arr.get(0, true).type = 'QUOTE_DOUBLE';
		}
	}
	return doc.toString();
}

// # generator(opts)
async function* generator({ input, assets, meta, global }) {

	// Find the folders to crawl first.
	const collection = path.resolve(plugins, input);
	const subfolders = await new Glob('*', {
		cwd: collection,
		absolute: true,
	}).walk();
	subfolders.sort();

	// Prepare a json document that has the keys in the right order.
	const doc = props => {
		const variants = structuredClone(meta.variants);
		for (let row of variants) {
			let { nightmode } = row.variant;
			row.assets[0].include = [`/${props.includes[nightmode]}/`];
		}
		return {
			group: meta.group,
			name: props.name,
			subfolder: meta.subfolder,
			version: meta.version,
			info: {
				summary: props.info.summary,
				author: meta.info.author,
				website: meta.info.website,
			},
			dependencies: props.dependencies,
			variants,
		};
	};

	// Generate the assets as yaml.
	for (let asset of assets) {
		yield yamlStringify(asset);
		yield '\n---\n';
	}

	// Gather the metadata specific for the package in that folder.
	const tracker = new DependencyTracker();
	const packages = [];
	for (let dir of subfolders) {
		const props = await getMetadata(tracker, dir);
		packages.push(`${meta.group}:${props.name}`);
		const json = doc(props);
		const yaml = stringify(json);
		yield `${yaml}\n`;
		yield `---\n`;
	}

	// At last we will still compile a global package.
	yield yamlStringify({
		group: global.group || meta.group,
		name: global.name,
		version: global.version || meta.version,
		subfolder: global.subfolder || meta.subfolder,
		info: {
			summary: global.info?.summary,
			description: global.info?.description,
			author: global.info?.author || meta.info?.author,
			website: global.info?.website || meta.info?.website,
			images: global.info?.images,
		},
		dependencies: packages,
	});

}

// # make()
// The entry function for 
export default async function make({ output, ...rest }) {
	let rs = Readable.from(generator(rest));
	let ws = fs.createWriteStream(output);
	await finished(rs.pipe(ws));
}

await make({
	input: '300-commercial/mattb325.commercial-w2w-pack-darknite.1.1.sc4pac/Commercial W2W',
	output: path.resolve(import.meta.dirname, '../sc4pac/src/yaml/mattb325/commercial-w2w-pack.yaml'),
	meta: {
		group: 'mattb325',
		subfolder: '300-commercial',
		version: '1.1',
		info: {
			author: 'mattb325',
			website: 'https://www.sc4evermore.com/index.php/downloads/download/12-commercial/104-sc4d-lex-legacy-mattb325-commercial-w2w-pack-darknite',
		},
		variants: [
			{
				variant: { nightmode: 'standard' },
				assets: [{ assetId: 'mattb325-commercial-w2w-pack-maxisnite' }],
			},
			{
				variant: { nightmode: 'dark' },
				assets: [{ assetId: 'mattb325-commercial-w2w-pack-darknite' }],
			},
		],
	},
	global: {
		name: 'commercial-w2w-pack',
		version: '1.1',
		info: {
			summary: 'Commercial W2W Pack',
			description: 'A collection of 41 commercial W2W lots',
			images: [
				'https://www.sc4evermore.com/images/jdownloads/screenshots/thumbnails/Amestoy_lg.jpg',
				'https://www.sc4evermore.com/images/jdownloads/screenshots/thumbnails/ImmoderateCur_s.jpg',
				'https://www.sc4evermore.com/images/jdownloads/screenshots/thumbnails/PWN_lg.jpg',
			],
		},
	},
	assets: [
		{
			assetId: 'mattb325-commercial-w2w-pack-darknite',
			version: '1.1',
			lastModified: '2023-08-20T10:04:31Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=104:sc4d-lex-legacy-mattb325-commercial-w2w-pack-darknite&catid=12',
		},
		{
			assetId: 'mattb325-commercial-w2w-pack-maxisnite',
			version: '1.1',
			lastModified: '2023-08-20T10:05:00Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=105:sc4d-lex-legacy-mattb325-commercial-w2w-pack-maxisnite&catid=12',
		},
	],
});
