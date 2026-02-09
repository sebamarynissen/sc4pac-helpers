// # build-better-girafe-database.js
import path from 'node:path';
import build from '../lib/build-better-tree-database.js';

const withSnow = [
	'girafe:abies-grandis',
	'girafe:common-spruces',
	'girafe:conifers',
	'girafe:grand-firs',
	// Larches don't need to be in the array, as they have a different way of 
	// handling the snow model.
	// 'girafe:larches',
	'girafe:serbian-spruces',
	'girafe:subalpine-firs',
];

const hasSpring = [
	'girafe:wheat',
	'girafe:lupins',
	'girafe:narcissus',
	'girafe:poppies',
	'girafe:sparaxis',
	'girafe:daisy',
];

// From certain packages, we'll exclude all props because there's no clear 
// seasonal relation. Our goal is to include them later on as well, but they 
// might need to be added manually.
const excludeProps = [
	'girafe:wheat',
	// Sparaxis props need to be excluded because they have various summer 
	// models (different colours), but only one spring model. This means that 
	// if we create a summer patch, we have to choose a color for rendering the 
	// spring model, and then in summer it might change to another colour, 
	// depending on what summer prop was used on the lot. This is something we 
	// can't avoid, so for now we exclude this. We might figure out a way to do 
	// it in the future though. For now it means that sparaxis props will keep 
	// on changing. We could just accept this, but our tree database does not 
	// know how to handle it because the spring model is apart, so we ignore it 
	// for now.
	'girafe:sparaxis',
];

await build('girafe:daisy', {
	cwd: path.resolve(import.meta.dirname, '../packages/Girafe'),
	filter({ exemplar, pkg }) {

		// Exclude all props from the girafe:wheat package, as we're not sure 
		// how they work. We might add them manually later on to the database.
		if (excludeProps.includes(pkg)) {
			const type = exemplar.get('ExemplarType');
			if (type === 0x1e) return false;
		}

		// By default, we'll include.
		return true;

	},
	seasons({ pkg, model, names, flora, props }) {

		// If models are explicitly tagged with a season - which is the case 
		// for most props - then it's easy to figure out the season.
		if (match(names, /(fall|autumn)/)) return 'fall';
		if (match(names, /summer/)) return 'summer';
		if (match(names, /winter/)) {

			// If this is a coniferous tree, then being tagged with "winter" 
			// actually means it is a *snow* model, and hence we need to tag it 
			// as such.
			if (withSnow.includes(pkg)) {
				return 'snow';
			} else {
				return 'winter';
			}

		}
		if (match(names, /spring/)) return 'spring';
		if (match(names, /evergreen/)) return 'evergreen';

		// If no season can be detected explicitly, we're dealing with a Flora 
		// item that is not available as a prop (in which case it would be 
		// labeled with the appropriate season). In this case, we hence need to 
		// determine the what season this model is based on the flora exemplar.
		// const flora = exemplars.find(ex => ex.get('ExemplarType') === 0x0f);
		if (flora.length > 0) {
			const seasons = getSeasonsForModelFromFlora(model, flora[0], pkg);
			return seasons;
		}

		// If we reach this point, it means we're dealing with a prop that is 
		// not explictily tagged with a season. No problem, we can still look 
		// at the start date in the simulator.
		if (props.length > 0) {
			const seasons = getSeasonsFromProp(props[0]);
			return seasons;
		}

	},
	family({ pkg, names, flora }) {
		// Determining the family id is the hardest part. We need to make sure 
		// that every model only ever appears in 1 family! Therefore we 
		// generate an id for *each* exemplar name, and then we check whether 
		// all the names are the same. If that's the case, we can be sure that 
		// our id generation function is solid.
		const ids = names.map(name => {
			if (name.match(/haybale/i)) return 'haybale';
			return name
				.replace(/^Gi?ra?fe_/, '')
				.replace(/_(summer|winter|fall|autumn|spring|evergreen|seasonal)/, '')
				.replace('_empty', '')
				.toLowerCase()
				.replaceAll(/_+/g, '-');
		});
		const unique = new Set(ids);
		if (unique.size > 1) {
			this.croak(`ID function does not result in a unique value for ${names}!`);
		}
		const type = flora.length > 0 ? 'flora' : 'prop';
		const [id] = unique;
		const [author] = pkg.split(':');
		return `${author}:${id}-${type}`;
	},
});

function match(arr, regex) {
	return arr.some(str => regex.test(str));
}

// Helper function that inspects an RKT4 from a flora exemplar to figure out 
// the seasonal models used.
function getSeasonsForModelFromFlora(model, exemplar, pkg) {
	const rkt4 = exemplar.get('ResourceKeyType4');
	if (rkt4) {
		const models = [];
		for (let i = 0; i < rkt4.length; i += 8) {
			let season = getSequence(pkg)[rkt4[i]];
			let model = rkt4.slice(i+6, i+8);
			models.push({
				key: hash(model),
				season,
				model,
			});
		}
		const map = Object.groupBy(models, ({ model }) => hash(model));
		const row = map[hash(model)];
		return row.map(({ season }) => season);
	}
	return 'evergreen';
}

// Helper function that returns the sequence for seasonal flora per package. 
// Most of the time, the sequence is fall -> winter -> summer for trees, but 
// for certain flowers this can be spring -> summer -> winter as well.
function getSequence(pkg) {
	if (hasSpring.includes(pkg)) {
		return ['spring', 'summer', 'fall'];
	} else if (withSnow.includes(pkg)) {
		return ['fall', 'snow', 'summer'];
	} else {
		return ['fall', 'winter', 'summer'];
	}
}

function getSeasonsFromProp(exemplar) {
	let [month] = exemplar.get('SimulatorDateStart') || [0, 0];
	switch (month) {
		case 0: return 'summer';
		case 1: return 'winter';
		case 2: return 'winter';
		case 3: return 'summer';
		case 4: return 'summer';
		case 5: return 'summer';
		case 6: return 'summer';
		case 7: return 'summer';
		case 8: return 'summer';
		case 9: return 'fall';
		case 10: return 'fall';
		case 11: return 'fall';
		case 12: return 'winter';
	}
}

function hash(gi) {
	const [group, instance] = gi;
	return `${hex(group)},${hex(instance)}`;
}
