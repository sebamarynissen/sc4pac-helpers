// # stylize-doc.js
// # stylize(doc)
// Applies an opinionated way on how to stringify the metadata.
export default function stylize(doc) {

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

		// Uncomment this if you want to collapse "include" for assets.
		// let assets = variant.get('assets', true);
		// if (assets) {
		// 	for (let asset of assets.items) {
		// 		(asset.get('include', true) || {}).flow = true;
		// 		for (let inc of asset.get('include', true).items) {
		// 			inc.type = 'QUOTE_DOUBLE';
		// 		}
		// 	}
		// }

	}
	return doc;
}
