import path from 'node:path';
import { DBPF } from 'sc4/core';
import { FileScanner, folderToPackageId } from 'sc4/plugins';
import { hex } from 'sc4/utils';
import chalk from 'chalk';
import { parseAllDocuments, Document } from 'yaml';

class BuildContext {
	db = {};
	modelIndex = {};

	// ## build(patterns, opts)
	// The function that performs the boilerplate of updating the tree database.
	// Our new approach is *model* based, and no longer *exemplar based*. This 
	// means that we compile a list of all models and link them with all the 
	// exemplars we can find them in. As a last step, we try to tag each model 
	// with an id and a season based on a user-defined *guessing* function.
	async build(patterns, opts = {}) {
		const {
			filter = () => true,
			cwd = process.env.SC4_PLUGINS ?? '',
			seasons: getSeasons,
			family: getFamily,
		} = opts;
		const glob = new FileScanner(patterns, {
			absolute: true,
			cwd: path.resolve(process.cwd(), cwd),
		});
		for await (let file of glob) {
			let dbpf = new DBPF(file);
			const pkg = folderToPackageId(path.dirname(file))
			for (let entry of dbpf.exemplars) {
				let exemplar = entry.read();
				let name = exemplar.get('ExemplarName');
				let type = exemplar.get('ExemplarType');
				if (!filter({ exemplar, entry, name, type, pkg })) continue;
				let models = this
					.getModelsFromExemplar(exemplar)
					.filter(([group, instance]) => {
						return !(group === 0 && instance === 0);
					});
				for (let model of models) {
					const key = hash(model);
					const value = this.modelIndex[key] ??= {
						model,
						pkg,
						entries: [],
						exemplars: [],
						names: [],
						family: undefined,
						season: undefined,
						get props() {
							return this.exemplars.filter(ex => {
								return ex.get('ExemplarType') === 0x1e;
							});
						},
						get flora() {
							return this.exemplars.filter(ex => {
								return ex.get('ExemplarType') === 0x0f;
							});
						},
					};
					value.entries.push(entry);
					value.exemplars.push(exemplar);
					value.names.push(exemplar.get('ExemplarName'));
				}
			}
		}

		// Our model index has been built up. Next we'll loop every model we've 
		// collected an use the user-provided guessing function to tag it.
		const seen = new Set();
		for (let meta of Object.values(this.modelIndex)) {
			const seasons = [getSeasons.call(this, meta) ?? []].flat();
			if (seasons.length === 0) {
				this.croak(`Unable to determine season(s) for model ${hash(meta.model)} (${meta.pkg})`);
				continue;
			}
			const family = getFamily.call(this, meta);
			if (!family) {
				this.croak(`Unable to determine family id for model ${hash(meta.model)} (${meta.pkg})`);
				continue;
			}
			meta.family = family;
			meta.seasons = seasons;
			for (let season of seasons) {
				const key = `${family}/${season}`;
				if (seen.has(key)) {
					this.croak(`Model for ${chalk.greenBright(season)} already exists for family ${chalk.magentaBright(family)}!`);
					continue;
				}
				seen.add(key);
			}
		}

		// Now that all our models have been tagged with their family and 
		// season, it's time to merge it with the existing database.
		let file = new URL(import.meta.resolve('./data/trees-new.yaml'));
		// let yaml = String(await fs.promises.readFile(file));
		let yaml = String('');
		let docs = parseAllDocuments(yaml);
		let index = {};
		for (let doc of docs) {
			let id = doc.get('id');
			index[id] = doc;
		}

		// Now merge.
		for (let meta of Object.values(this.modelIndex)) {
			const doc = index[meta.family];
			const json = doc ? doc.toJSON() : {
				id: meta.family,
				package: meta.pkg,
				models: [],
			};
			for (let season of meta.seasons) {
				json.models.push({ season, model: [...meta.model] });
			}
			json.models.sort((a, b) => compareSeasons(a.season, b.season));
			index[meta.family] = stylize(new Document(json));
		}
		let zipped = [...Object.values(index)].sort((a, b) => a.get('id') < b.get('id') ? -1 : 1);
		for (let doc of zipped) {
			doc.directives.docStart = true;
		}
		zipped.length > 0 && (zipped.at(0).directives.docStart = null);
		let buffer = zipped.map(doc => doc.toString()).join('\n');
		console.log(buffer);

	}

	// ## getModelsFromExemplar(exemplar)
	getModelsFromExemplar(exemplar) {
		let rkt1 = exemplar.get('ResourceKeyType1');
		if (rkt1) {
			let [, group, instance] = rkt1;
			return [[group, instance]];
		}
		let rkt5 = exemplar.get('ResourceKeyType5');
		if (rkt5) {
			let [, group, instance] = rkt5;
			return [[group, instance]];
		}
		let rkt4 = exemplar.get('ResourceKeyType4');
		if (rkt4) {
			let models = [];
			for (let i = 0; i < rkt4.length; i += 8) {
				let [group, instance] = rkt4.slice(i+6, i+8);
				models.push([group, instance]);
			}
			return models;
		}
		return [];
	}

	// ## croak(message)
	croak(message) {
		// throw new Error(message);
		console.warn(message);
	}

}

// # stylize(doc)
// Ensures a consistent style for the documents
function stylize(doc) {
	let seasons = doc.get('models', true);
	for (let season of seasons.items) {
		let keys = ['model'];
		for (let key of keys) {
			let arr = season.get(key, true);
			arr.flow = true;
			for (let item of arr.items) {
				item.format = 'HEX';
			}
		}
	}
	return doc;
}

// # compareSeasons(a, b)
const order = [
	'spring',
	'summer',
	'fall',
	'winter',
	'snow',
	'evergreen',
];
function compareSeasons(a, b) {
	return order.indexOf(a) - order.indexOf(b);
}

function hash(gi) {
	const [group, instance] = gi;
	return `${hex(group)},${hex(instance)}`;
}

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
];

const ctx = new BuildContext();
await ctx.build('girafe:narcissus', {
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
