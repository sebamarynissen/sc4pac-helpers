// # build-cp-database.js
import path from 'node:path';
import build from '#lib/build-tree-database.js';
import { DBPF } from 'sc4/core';
import { FileScanner } from 'sc4/plugins';

// First of all, we'll use the "endless summer" package to figure out all the 
// tgis of the cycledogg trees, as it's hard to do that from the prop packs alone.
const glob = new FileScanner('*', {
	cwd: path.resolve(import.meta.dirname, '../packages/Endless summer'),
});
let ids = new Set();
for (let file of glob) {
	let dbpf = new DBPF(file);
	for (let entry of dbpf.exemplars) {
		ids.add(entry.id);
	}
}

// Now build the tree database.
await build('bsc:mega-props-cp-vol0*', {
	filter(exemplar, entry) {
		if (!ids.has(entry.id)) return false;
		let name = exemplar.get('ExemplarName');
		if (!name.match(/(fall|spring|summer|winter|semiseasonal)/i)) return false;
		return true;
	},
	id(exemplar) {
		let name = exemplar.get('ExemplarName');
		let regex = /(summer|spring|fall|winter)/gi;
		let match = name.match(regex);
		if (!match) {
			let id = name
				.replace(/^CP[_ ]/, '')
				.replace(/^CP([A-Z])/, '$1')
				.replace(/semiseasonal/i, '')
				.trim()
				.replace(/[_-]$/, '')
				.trim()
				.replaceAll(/_/g, '-')
				.replaceAll(/ +/g, ' ')
				.replaceAll(/ /g, '-')
				.toLowerCase();
			return `cp:${id}`;
		}
		let id = name
			.replace(/^CP[_ ]/, '')
			.replace(/^CP([A-Z])/, '$1')
			.replace(regex, '')
			.replace(/^seasonal/i, '')
			.replace(/(\d{2})?_$/, '')
			.replaceAll(/_/g, '-')
			.replace(/-$/, '')
			.toLowerCase();
		return `cp:${id}`;
	},
	models(exemplar, entry) {

		// Find out whether the tree has a RKT1 or RKT4 set. From that we'll 
		// determine the model to use.
		let rkt4 = exemplar.get('ResourceKeyType4');

		// If the RKT4 has 16 reps, then this is a semi-seasonal tree.
		if (rkt4 && rkt4.length === 16) {
			let winter = rkt4.slice(5, 8);
			let summer = rkt4.slice(13, 16);
			console.log(
				exemplar.get('ExemplarName'),
				winter.slice(1).map(x => x.toString(16)),
				summer.slice(1).map(x => x.toString(16)),
			);
			return { winter, summer };
		}

		// Otherwise we assume this is a one-season model.
		let name = exemplar.get('ExemplarName');
		let rkt1 = exemplar.get('ResourceKeyType1');
		let rkt = rkt1 ? [...rkt1] : rkt4.slice(5);
		if (name.match(/summer/i)) {
			return { summer: rkt };
		} else if (name.match(/fall/i)) {
			return { fall: rkt };
		} else if (name.match(/winter/i)) {
			return { winter: rkt };
		} else if (name.match(/spring/i)) {
			return { spring: rkt };
		};
		console.warn(`Could not determine season for ${name}`);

	},
	// dry: true,
});
