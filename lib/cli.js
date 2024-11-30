// # cli.js
import fs from 'node:fs';
import path from 'node:path';
import { program } from 'commander';
import * as prompts from '@inquirer/prompts';
import scrape from './scrape.js';
import generate from './generate.js';

program
	.name('scrape')
	.argument('[url]', 'The Simtropolis or SC4E url to scrape')
	.option('-y, --yes', 'Accept the output without inspecting it')
	.option('--split', 'Splits the package up in a resource package and a lot package')
	.option('--silent')
	.action(async function(url, options) {

		if (!url) {
			url = await prompts.input({
				message: 'Paste the url to scrape',
			});
		}

		// Scrape the url and if we're unable to parse the subfolder, we'll request it.
		let metadata = await scrape(url);
		if (!metadata.subfolder && !options.yes) {
			metadata.subfolder = await prompts.select({
				message: 'Enter the subfolder',
				choices: [
					'200-residential',
					'300-commercial',
					'360-landmark',
					'050-load-first',
					'100-props-textures',
					'150-mods',
					'170-terrain',
					'180-flora',
					'400-industrial',
					'410-agriculture',
					'500-utilities',
					'600-civics',
					'610-safety',
					'620-education',
					'630-health',
					'640-government',
					'650-religion',
					'660-parks',
					'700-transit',
					'710-automata',
					'900-overrides',
				],
				pageSize: 21,
			});
		}
		let yaml = generate(metadata, {
			split: options.split,
		});

		if (!options.silent) {
			console.log('Generated file:');
			console.log(yaml);
		}
		let ok = options.yes || await prompts.confirm({ message: 'Is this ok?' });

		if (ok) {
			let output = path.join(process.cwd(), `sc4pac/src/yaml/${metadata.group}/${metadata.name}.yaml`);
			await fs.promises.mkdir(path.dirname(output), { recursive: true });
			await fs.promises.writeFile(output, yaml);
		}

	});

program.parse(process.argv);
