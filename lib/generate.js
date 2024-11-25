// # generate.js
import { Document } from 'yaml';
import * as tf from './transformations/index.js';

// # generate(metadata)
// Generates a yaml file from the parsed metadata. Note that we'll automatically 
// figure out whether we have to add a darknite variant or not.
export default function generate(metadata, opts = {}) {

	// Now generate the variants from what we've decided to include. This will 
	// multiply the available variants by 2 in every step.
	let includedVariants = findIncludedVariants(metadata);
	let variants = generateVariants(includedVariants, metadata);

	// If there are no variants, then we just include the assets as is.
	let assets;
	if (!variants || variants.length === 0) {
		assets = metadata.assets.map(asset => ({
			assetId: asset.assetId,
		}));
	}

	// Now compile the entire document.
	let { info } = metadata;
	let { summary, description, author, website, images } = info;
	let json = {
		group: metadata.group,
		name: metadata.name,
		version: metadata.version,
		subfolder: metadata.subfolder || '',
		info: {
			summary,
			description,
			author,
			website,
			images: (images?.length > 0 ? images : undefined),
		},
		dependencies: metadata.dependencies,
		assets,
		variants,
	};

	// Next we'll perform some author-specific transformations.
	transform(json);

	// Split it up in a resource file and a lot file if specified.
	let resource;
	if (opts.split) {
		let name = `${json.name}-resources`;
		let dep = `${json.group}:${name}`;
		json.dependencies.unshift(dep);
		let assets = [];
		const modifyAsset = asset => {
			let clone = structuredClone(asset);
			let include = asset.include ??= [];
			include.push('.*\\.SC4Lot$');
			let exclude = clone.exclude ??= [];
			exclude.push('.*\\.SC4Lot$');
			return clone;
		};
		for (let asset of json.assets ?? []) {
			assets.push(modifyAsset(asset));
		}
		let variants = [];
		for (let variant of json.variants ?? []) {
			let clone = structuredClone(variant);
			for (let asset of variant.assets) {
				clone.assets = modifyAsset(asset);
			}
			variants.push(clone);
		}
		resource = {
			...json,
			name,
			subfolder: '100-props-textures',
			info: {
				...json.info,
				summary: `${json.info.summary} Resources`,
				description: `Resource file for \`pkg=${json.group}:${json.name}\``,
			},
			assets: (assets.length > 0 ? assets : undefined),
			variants: (variants.length > 0 ? variants : undefined),
			dependencies: undefined,
		};
	}

	// Next we'll convert it into a document and apply the required 
	// transformations to the variants.
	let doc = stylize(new Document(json));
	let out = doc.toString();

	// Include the resource file if it exists as well.
	if (resource) {
		out += '\n---\n';
		out += stylize(new Document(resource)).toString();
	}

	// Now add all assets as well.
	for (let asset of metadata.assets) {
		out += '\n---\n';
		let doc = new Document({
			assetId: asset.assetId,
			version: asset.version || metadata.version,
			lastModified: asset.lastModified || metadata.modified,
			url: asset.url,
		});
		out += stylize(doc).toString();
	}
	return out;

}

// # transform(json)
// Transforms the generated metadata based on rules that we can define per 
// creator. This is useful if we know that certain creators have a specific way 
// of doing things.
function transform(json) {
	const fnName = kebabToCamelCase(json.group);
	const fn = tf[fnName];
	if (!fn) return;
	fn(json);
}

// # findIncludedVariants(metadata)
// Finds the variants that are supported by this package. Note that we have no 
// way yet of inspecting the actual package contents, we only support detecting 
// this when there are separate downloads.
function findIncludedVariants(metadata) {
	let variants = [];
	let { assets } = metadata;
	if (assets.some(asset => /-(maxisnite|darknite)$/.test(asset.assetId))) {
		variants.push('nightmode');
	}
	if (assets.some(asset => /-[rl]hd$/.test(asset.assetId))) {
		variants.push('driveside');
	}
	if (assets.some(asset => /-cam$/.test(asset.assetId))) {
		variants.push('CAM');
	}
	return variants;
}

// # generateVariants(variants, metadata)
function generateVariants(variants, metadata) {
	let output = [{}];
	for (let variant of variants) {
		let queue = output;
		output = [];
		let objects = generateVariant(variant, metadata);
		for (let variant of objects) {
			for (let q of queue) {
				output.push({
					variant: { ...q.variant, ...variant.variant },
					dependencies: mergeArray(q.dependencies, variant.dependencies),
					assets: mergeArray(q.assets, variant.assets),
				});
			}
		}
	}
	return output.length < 2 ? undefined : output;
}

// # mergeArray(a, b)
function mergeArray(a, b) {
	let merged = [...(a||[]), ...(b||[])];
	if (merged.length === 0) return;
	return structuredClone(merged);
}

// # generateVariant(type, metadata)
// Generates the essential variant information for the given type. For example, 
// for day-and-night, there are two possible variants. Subsequently we'll merge 
// this with the other variants.
function generateVariant(type, metadata) {
	let { assets } = metadata;
	if (type === 'nightmode') {
		return [
			{
				variant: { nightmode: 'standard' },
				assets: [
					{ assetId: findAsset(assets, 'maxisnite') },
				],
			},
			{
				variant: { nightmode: 'dark' },
				dependencies: ['simfox:day-and-nite-mod'],
				assets: [
					{ assetId: findAsset(assets, 'darknite') },
				],
			},
		];
	} else if (type === 'CAM') {
		return [
			{
				variant: { CAM: 'no' },
			},
			{
				variant: { CAM: 'yes' },
				assets: [
					{ assetId: findAsset(assets, 'cam') },
				],
			},
		];
	}
}

const regexes = {
	maxisnite: /-m(axis)?n(ite)?$/,
	darknite: /-d(ark)?n(ite)?$/,
	lhd: /-lhd$/,
	rhd: /-rhd$/,
	cam: /-cam$/,
};
function findAsset(assets, id) {
	const regex = regexes[id];
	return assets.find(asset => regex.test(asset.assetId)).assetId;
}

// # stylize(doc)
// Applies an opinionated way on how to stringify the metadata.
function stylize(doc) {

	// Versions will always be quoted.
	(doc.get('version', true) || {}).type = 'QUOTE_DOUBLE';

	// Handle styling assets. Here we have to make sure that the lastModified is 
	// quoted.
	if (doc.get('assetId')) {
		doc.get('lastModified', true).type = 'QUOTE_DOUBLE';
		return doc;
	}

	// Use block literals for the description?
	let desc = doc.getIn(['info', 'description'], true);
	if (desc) desc.type = 'BLOCK_LITERAL';

	// Make sure to use object serialization for the variants.
	let variants = doc.get('variants', true) || { items: [] };
	for (let variant of variants.items) {
		variant.get('variant').flow = true;

		// Also make sure to quote "no" and "yes" values.
		(variant.getIn(['variant', 'CAM'], true)||{}).type = 'QUOTE_DOUBLE';

		// If there's only 1 dependency, inline it - typically for SimFox day and nite.
		let deps = variant.get('dependencies', true);
		if (deps && deps.items.length < 2) {
			deps.flow = true;
			deps.get(0, true).type = 'QUOTE_DOUBLE';
		}

	}
	return doc;
}


function kebabToCamelCase(str) {
	return str
		.split('-')
		.map((word, i) => i > 0 ? ucfirst(word) : word)
        .join('');
}

function ucfirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
