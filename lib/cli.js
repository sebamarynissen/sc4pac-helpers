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
	.option('--prefix', 'Whether to prefix the filename with the Simtropolis id')
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
			let basename = `${metadata.name}.yaml`;
			if (options.prefix) {
				let id = parseSimtropolisIdFromUrl(url);
				basename = `${id}-${basename}`;
			}
			let output = path.resolve(process.cwd(), `../simtropolis-channel/src/yaml/${metadata.group}/${basename}`);
			await fs.promises.mkdir(path.dirname(output), { recursive: true });
			await fs.promises.writeFile(output, yaml);
		}

	});

program.parse(process.argv);

function parseSimtropolisIdFromUrl(href) {
	href = String(href).replace(/\/(%20|%C2%A0)$/, '');
	let url = new URL(href);
	if (url.pathname.includes('.cfm')) {
		return url.searchParams.get('id');
	} else {
		return url.pathname
			.replace(/\/$/, '')
			.split('/')
			.at(-1)
			.split('-')
			.at(0);
	}
}
