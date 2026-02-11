// # build-vip-database.js
import build from '#lib/build-better-tree-database.js';
import { hex } from 'sc4/utils';

await build('vip:rural-pack', {
	dry: true,
	filter({ exemplar }) {
		const type = exemplar.get('ExemplarType');
		const name = exemplar.get('ExemplarName');

		// Narcissus and fougere flora need to be excluded because they have a 
		// shared winter model. They should be handled by our props instead.
		if (type === 0x0f) {
			if (name.match(/Narcissus/)) return false;
			if (name.match(/Fougere/)) return false;
		}

		if (name.includes('Tree')) return true;
		if (name.match(/_(winter|hivers?|spring|summer|fall|autumn|ete)/i)) {
			return true;
		}

		// Some flora is seasonal, but isn't tagged as such.
		if (type === 0x0f) {
			if (name.match(/^VIP_RP-FL_Or_Narcissus\d+/)) return true;
			if (name.match(/^VV_TSC_ploppable_Fougere\d+/)) return true;
			if (name.match(/^R6_VIP_Iris des Marais\d+/)) return true;
			if (name.match(/^Or_VIP_Populus\d+/)) return true;
			if (name.match(/^Or_VIP_Corylus\d+/)) return true;
			if (name.match(/^VV_VIP_ploppable_Genet\d+/)) return true;
		}
		return false;
	},
	seasons({ model, entries, names, flora }) {
		if (match(names, /snow$/i)) return 'snow';
		if (match(names, /_(fall|autumn)/i)) return 'fall';
		if (match(names, /_spring/i)) return 'spring';
		if (match(names, /_(summer|ete)/i)) return 'summer';
		if (match(names, /_winter/i)) return 'winter';

		// As always, if we're dealing with a flora exemplar, let's look up the 
		// seasons from the rkt4.
		if (flora.length > 0) {
			const seasons = getSeasonsForModelFromFlora({
				model,
				entry: entries[0],
				exemplar: flora[0],
			});
			return seasons;
		}
		return 'evergreen';
	},
	family({ model, names }) {
		const ids = names
			.map(name => {
				const match = name.match(/Tree_(?<nr>\d+)/);
				if (match) {
					const author = name
						.trim()
						.replace(/^VIP_/, '')
						.replace(/^RP-FL_/, '')
						.split('_')
						.at(0)
						.toLowerCase();
					const { nr } = match.groups;
					return `${author}-tree-${nr}`;
				}
				return name
					.trim()
					.replace(/^VIP_/, '')
					.replace(/^RP-FL_/, '')
					.toLowerCase()
					.replaceAll(/[_ ]+/g, '-')
					.replace(/-(spring|summer|ete|fall|autumn|hivers?|winter|snow-winter)$/i, '')
					.replace('-seasonal-', '-')
					.replace('vv-vip-', 'vv-')
					// Some aliases that use the same model underneath.
					.replace('vv-cherry-tree', 'vv-tree-02')
					.replace('vv-fougere-001', 'vv-fern-001')
					.replace('vv-fougere-001-large', 'vv-fern-002')
					.replace('vv-fougere-001-xl', 'vv-fern-003')
					.replace('vv-fougere-001-xxl', 'vv-fern-004')
					.replace('vv-fougere-001-xxxl', 'vv-fern-005')
					.replace('vv-fougere-001-4xl', 'vv-fern-006')
					.replace('vv-fern-001', 'vv-fern-001')
					.replace('vv-fern-001-larg', 'vv-fern-002')
					.replace('vv-fern-001-xl', 'vv-fern-003')
					.replace('vv-fern-001-xxl', 'vv-fern-004')
					.replace('vv-fern-001-xxxl', 'vv-fern-005')
					.replace('vv-fern-001-4xl', 'vv-fern-006');
			});
		const unique = new Set(ids);
		if (unique.size > 1) {
			console.log([...unique], names, model);
			this.croak(`ID function does not result in a unique value for ${names}!`);
		}
		const [id] = unique;
		return `vip:${id}`;
	},
});

function match(arr, regex) {
	return arr.some(str => regex.test(str));
}

function getSeasonsForModelFromFlora({ model, exemplar }) {
	const name = exemplar.get('ExemplarName');
	let order = name.match(/Cherry_Tree/)
		? ['spring', 'summer', 'winter']
		: ['fall', 'winter', 'summer'];
	if (name.match(/narcissus/i)) {
		order = ['fall', 'winter', 'spring'];
	}
	const rkt = exemplar.get('ResourceKeyType4');
	if (rkt) {
		const models = [];
		for (let i = 0; i < rkt.length; i += 8) {
			let season = order[rkt[i]];
			let model = rkt.slice(i+6, i+8);
			models.push({
				key: hash(model),
				season,
				model,
			});
		}
		const map = Object.groupBy(models, ({ model }) => hash(model));
		const row = map[hash(model)];
		return row.map(({ season }) => season);
	} else {
		return 'evergreen';
	}
}

function hash(gi) {
	const [group, instance] = gi;
	return `${hex(group)},${hex(instance)}`;
}
