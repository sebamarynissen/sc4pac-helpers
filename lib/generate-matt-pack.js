// # generate-matt-pack.js
// # track-commercial-w2w.js
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { Glob } from 'glob';
import { plugins } from './directories.js';
import DependencyTracker from './dependency-tracker.js';
import { Document, stringify as yamlStringify } from 'yaml';

// # getMetaData(tracker, dir)
// Extracts the basic metadata from the a directory name.
async function getMetadata(tracker, dir) {

	let base = path.basename(dir);
	let summary = base
		.replaceAll('#', '')
		.replace(/[_ ][dm]n$/i, '');
	let name = summary
		.toLowerCase()
		.trim()
		.replaceAll('&', 'and')
		.replaceAll(/\([a-z]+\)$/g, '')
		.trim()
		.replaceAll(/[\s'_]/g, '-');

	// Determine what we have to include from the assets. This is just the 
	// folder name, but take into account that some folders are prefixed 
	// with MN and DN.
	let includes;
	if (base.match(/_[DM]N(#?)$/i)) {
		includes = {
			standard: base.replace(/_[DM]N(#?)$/, '_MN$1'),
			dark: base.replace(/_[DM]N(#?)$/, '_DN$1'),
		};
	} else {
		includes = { standard: base, dark: base };
	}

	// Now track all dependencies.
	const result = await tracker.track(dir);
	const { packages, missing } = result;
	if (missing.length > 0) {
		result.dump({ missing: true, dependencies: false  });
	}
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
		let simfox = item.get('dependencies', true);
		if (simfox) {
			simfox.flow = true;
			simfox.get(0, true).type = 'QUOTE_DOUBLE';
		}
	}
	return doc.toString();
}

// # generator(opts)
async function* generator({ input, assets, meta, global, appendix }) {

	// Find the folders to crawl first.
	const collection = path.resolve(plugins, input);
	const subfolders = await new Glob('*', {
		cwd: collection,
		absolute: true,
	}).walk();
	subfolders.sort();

	// Prepare a json document that has the keys in the right order.
	const doc = props => {
		const variants = [];
		for (let row of meta.variants) {
			let { variant, assets } = row;
			let { nightmode } = variant;
			let dependencies;

			// IMPORTANT! The include dirctory is to be interpreted as a regular 
			// expression, so we have to escape stuff like brackets.
			let include = props.includes[nightmode];
			if (!include) continue;
			let clean = include.replaceAll(/([()$^])/g, '\\$1');
			row.assets[0].include = [`/${clean}/`];
			if (nightmode === 'dark') {
				dependencies = ['simfox:day-and-nite-mod'];
			}

			variants.push({
				variant: { ...variant },
				dependencies,
				assets,
			});

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
	const tracker = new DependencyTracker({ scan: collection });
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

	if (appendix) {
		yield `\n---\n`;
		yield appendix.trim();
	}

}

// # make()
// The entry function for 
export default async function make({ output, ...rest }) {
	let rs = Readable.from(generator(rest));
	let ws = fs.createWriteStream(output);
	await finished(rs.pipe(ws));
}
