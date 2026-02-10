// # build-cp-database.js
import build from '#lib/build-better-tree-database.js';

// Raw excludes that don't fit other rules.
const exclude = new Set([
	'CPDecid2NewFlat10x10x10_evergreen',
	'CP_PlanterBed8x4_SHADED_Ortho_Brick_E_ShrubEvergreen',
	'CP_PlanterBed4x4_SHADED_Diag_Brick_E_ShrubEvergreen',
	'CP_PlanterBed4x4_SHADED_Diag_Conc_E_ShrubEvergreen',
	'CP_SHADED_SparseDeciduousTree_Summer',
	'CP_SHADED_TreeForked_Summer',
	'CP_SHADED_TreeWeeping_Summer',
]);

// Now build the tree database.
await build('bsc:mega-props-cp-vol0*', {
	dry: true,
	filter({ exemplar }) {
		const name = exemplar.get('ExemplarName');
		if (name.match(/ /)) return false;
		if (name.match(/Vehicle/)) return false;
		if (exclude.has(name)) return false;

		// Some flowers that use shared models (probably for spring) need to be 
		// excluded.
		if (name.match(/mjb(Shrub|Flower)/)) return false;
		if (name.match(/saguaro/i)) return false;
		if (name.match(/^SummerOnly/)) return false;
		if (name.match(/(fall|spring|summer|winter|semiseasonal|evergreen)/i)) {
			return true;
		}
		return false;
	},
	seasons({ model, props, names }) {

		// For some models, the seasons have been tagged incorrectly, so we'll 
		// manually intercept those.
		if (eq(model, [0xe274fb2, 0x667d0000])) return 'winter';
		if (eq(model, [0xe274fb2, 0x667f0000])) return 'winter';

		// For the oak-c there are apparently 5 seasons. We'll tag one as 
		// late-fall.
		if (eq(model, [0xe274fb2, 0x64ea0000])) return 'late-fall';

		if (match(names, /_fall|Fall/)) return 'fall';
		if (match(names, /_spring|Spring/)) return 'spring';
		if (match(names, /_summer|Summer/)) return 'summer';
		if (match(names, /_winter|Winter/)) return 'winter';
		if (match(names, /_evergreen|Evergreen/)) return 'summer';

		// If we reach this point, then we're dealing with a semiseasonal prop.
		// In that case we use the two possible states of the prop and look at 
		// the interval in which both are present. Based on that, we determine 
		// the seasons for each model.
		const [prop] = props;
		const models = getModels(prop.get('ResourceKeyType4'));
		const duration = prop.get('SimulatorDateDuration');
		let map;
		if (duration < 160) {
			map = {
				[models[0]]: 'spring',
				[models[1]]: 'summer',
			};
		} else {
			map = {
				[models[0]]: 'summer',
				[models[1]]: 'winter',
			};
		}
		return map[model];
	},
	family({ names }) {
		const ids = names
			.map(name => {
				const id = name
					.replace(/^CP([A-Z])/, 'CP_$1')
					.replace(/Prop/, '')
					.replace(/_(Fall|Spring|Summer|Winter|Semiseasonal|Evergreen)/i, '')
					.replace(/(fall|spring|summer|winter|evergreen|semiseasonal)(\d)/i, '$2')
					.replace(/^CP_?/, '')
					.replace(/^Seas_/, '')
					.replace(/^Seasonal/, '')
					.replace(/^SemiSeasonal/, '')
					.replace(/^SHADED_Seas_/, 'shaded_')
					.replace(/^SeasStreet/, 'Street')
					.replaceAll(/_/g, '-')
					.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
					.toLowerCase()
					.replace(/-(winter|evergreen|summer|fall|spring)([\d-x])/, '$2')
					.replace(/-(winter|evergreen|summer|fall|spring)$/, '')
					.replace(/([a-z])(\d+x\d+x\d+)/, '$1-$2')
					.replace(/^tri-seasonal-/, '')
					// Some aliases for things that use the same models, 
					// apparently.
					.replace('shaded-mini-tree-maple', 'shaded-cott-shrub-lg')
					.replace('cottonwood-lg-11x11x32', 'cottonwood-11x11x32')
					.replace('valley-oak-15x15x22', 'oak-b')
					.replace('oak-12x12x15', 'oak-c')
					.replace('cottonwood-10x10x27', 'cottonwood-sm')
					.replace('shaded-maple-shaded9a-51', 'shaded-maple9a-51')
					.replace(/-+$/, '');
				return id;
			});
		const unique = new Set(ids);
		if (unique.size > 1) {
			console.log([...unique], names);
			this.croak(`ID function does not result in a unique value for ${names}!`);
		}
		const [id] = unique;
		return `cp:${id}`;
	},
});

function eq(a, b) {
	return a[0] === b[0] && a[1] === b[1];
}

// Helper function for getting the two models from an RKT4 prop.
function getModels(rkt) {
	const models = [];
	for (let i = 0; i < rkt.length; i += 8) {
		const index = rkt[i];
		const group = rkt[i+6];
		const instance = rkt[i+7];
		models[index] = [group, instance];
	}
	return models;
}

function match(arr, regex) {
	return arr.some(str => regex.test(str));
}
