import path from 'node:path';
import fs from 'node:fs';
import { DBPF } from 'sc4/core';
import { FileScanner, folderToPackageId } from 'sc4/plugins';
import { hex } from 'sc4/utils';
import chalk from 'chalk';
import { serialize } from './serialize-database.js';
import { parseAllDocuments } from 'yaml';

export default async function build(...args) {
	const ctx = new BuildContext();
	return await ctx.build(...args);
}

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
			dry = false,
		} = opts;
		const glob = new FileScanner(patterns, {
			absolute: true,
			cwd: path.resolve(process.cwd(), cwd),
		});
		for await (let file of glob) {
			let dbpf = new DBPF(file);
			const dir = path.basename(path.dirname(file));
			const version = dir.split('.').at(2);
			const pkg = folderToPackageId(dir);
			for (let entry of dbpf.exemplars) {
				let exemplar = entry.read();
				let name = exemplar.get('ExemplarName');
				let type = exemplar.get('ExemplarType') === 0x1e
					? 'prop'
					: 'flora';
				if (!filter({ exemplar, entry, name, type, pkg })) continue;
				let models = this
					.getModelsFromExemplar(exemplar)
					.filter(([group, instance]) => {
						return !(group === 0 && instance === 0);
					});
				for (let model of models) {
					const key = `${hash(model)}/${type}`;
					const value = this.modelIndex[key] ??= {
						model,
						pkg,
						version,
						type,
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
		let file = new URL(import.meta.resolve('./data/trees.yaml'));
		let yaml = String(fs.existsSync(file) ? await fs.promises.readFile(file) : '');
		let docs = parseAllDocuments(yaml);
		let index = {};
		for (let doc of docs) {
			let json = doc.toJSON();
			index[json.id] = json;
		}

		// Now merge.
		const modified = new Set();
		for (let meta of Object.values(this.modelIndex)) {
			const json = index[meta.family] ??= {
				id: meta.family,
				package: meta.pkg,
				type: meta.type,
				models: [],
			};
			for (let season of meta.seasons) {
				json.models.push({ season, model: [...meta.model] });
			}
			modified.add(json);
		}
		if (dry) {
			console.log(serialize([...modified]));
		} else {
			let buffer = serialize(Object.values(index));
			await fs.promises.writeFile(file, buffer);
		}

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

function hash(gi) {
	const [group, instance] = gi;
	return `${hex(group)},${hex(instance)}`;
}
