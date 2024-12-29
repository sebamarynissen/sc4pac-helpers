// # scrape-all.js
import fs from 'node:fs';
import path from 'node:path';
import { program } from 'commander';
import fetchAll from 'simtropolis-channel/fetch-all';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import parseDependencies from './parse-dependencies.js';
import stylize from './stylize-doc.js';
import { Document } from 'yaml';

program
	.name('scrape-all')
	.argument('<urls...>', 'All urls to scrape')
	.action(async function(urls) {
		let results = await fetchAll(urls);
		for (let result of results) {
			let [pkg] = result.metadata;
			if (!pkg.dependencies) {
				let jsdom = new JSDOM(marked(pkg.info.description));
				let links = [...jsdom.window.document.querySelectorAll('a')]
					.map(a => {
						let link = a.getAttribute('href');
						let text = a.textContent.trim();
						return { link, text };
					});
				let deps = parseDependencies({ links });
				let unmatched = deps.some(dep => dep.startsWith('['));
				if (unmatched) {
					let id = `${pkg.group}:${pkg.name}`;
					console.log(`${id} has unmatched dependencies and needs to be fixed manually!`);
				}
				pkg.dependencies = deps;
			}
			let file = `src/yaml/${pkg.group}/${result.id}-${pkg.name}`;
			let docs = result.metadata.map((data, i) => {
				let doc = new stylize(new Document(data));
				if (i > 0) {
					doc.directives.docStart = true;
				}
				return doc;
			});
			let contents = docs.map(doc => doc.toString()).join('\n');
			let fullPath = path.resolve(import.meta.dirname, '../../simtropolis-channel', file);
			await fs.promises.writeFile(fullPath, contents);
		}
	});

program.parse(process.argv);
