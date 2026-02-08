// # build-cp-database.js
import build from '#lib/build-tree-database.js';

// Now build the tree database.
await build('bsc:mega-props-cp-vol0*', {
	filter(exemplar, entry) {
		let name = exemplar.get('ExemplarName');
		if (name.match(/Vehicle/)) return false;
		if (name.match(/(fall|spring|summer|winter|semiseasonal|evergreen)/i)) return true;
		return false;
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
				.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
				.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
				.toLowerCase();
			return `cp:semi-${id}`;
		}
		let id = name
			.replace(/^CP[_ ]/, '')
			.replace(/^CP([A-Z])/, '$1')
			.replace(regex, '')
			.replace(/^seasonal/i, '')
			.replace(/^seas/i, '')
			.replaceAll(/_/g, '-')
			.replace(/^-/, '')
			.replace(/-$/, '')
			// To kebab case
			.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
			.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
			.toLowerCase()
			.replaceAll(/--+/g, '-');
		return `cp:${id}`;
	},
	models(exemplar) {

		// Find out whether the tree has a RKT1 or RKT4 set. From that we'll 
		// determine the model to use.
		let rkt4 = exemplar.get('ResourceKeyType4');

		// If the RKT4 has 16 reps, then this is a semi-seasonal tree.
		if (rkt4 && rkt4.length === 16) {
			let winter = rkt4.slice(5, 8);
			let summer = rkt4.slice(13, 16);
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
		} else if (name.match(/evergreen/i)) {
			return { evergreen: rkt };
		}
		console.warn(`Could not determine season for ${name}`);

	},
	dry: true,
});
