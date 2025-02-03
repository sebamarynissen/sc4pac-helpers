// # scrape-sc4e.js
import ora from 'ora';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
import parseDescription from './parse-description.js';

// # scrape(link, opts)
// Scrapes a sc4evermore url and returns the extracted package metadata.
export default async function scrape(link, opts) {

	let url = new URL(link);
	let spinner = ora(`Fetching ${chalk.cyan(url)}`);
	let html = await fetch(url).then(res => res.text());
	spinner.succeed();
	let { document } = new JSDOM(html).window;
	const { $$, $ } = wrap(document);

	// Parse the name from the url.
	let path = url.pathname.replace(/\/$/, '').split('/').at(-1);
	let [, group, ...nameArray] = path
		.split('-');

	// Parse the package name, but filter out some stuff.
	let name = nameArray
		.join('-')
		.replace(/^(props)-/, '');

	// Find the summary in the h5 tag.
	let summary = ucfirst([...$('h5').childNodes]
		.find(node => !node.tagName)
		.textContent
		.trim()
		.slice(path.length - (group.length+name.length+1)+1));

	// Find the author by looking for "original author".
	let author = [...$$('span')]
		.filter(node => {
			return node.textContent.toLowerCase().includes('original author');
		})
		.at(0)
		?.nextElementSibling
		?.textContent;

	// Version will be read from the table.
	let table = [...$$('.jd_field_row')];
	let lastModified = find(table, 'changed') || find(table, 'created');
	let version = (find(table, 'version') ?? '')
		.replace(/^v(ersion)?/i, '')
		.trim();

	// Note: the last modified is often given with a timezone offset, we don't 
	// want that and convert back to zulu.
	lastModified = new Date(lastModified).toISOString();

	// Find the download url.
	let assetPath = [...$$('a')]
		.find(node => {
			return node.textContent.trim().toLowerCase() === 'download';
		})
		.getAttribute('href');
	let assetUrl = new URL(assetPath, url);
	assetUrl.searchParams.delete('catid');

	// The subfolder might be found from the tags.
	let tags = [...$$('ul.tags > li')]
		.map(li => li.textContent.trim().toLowerCase());
	let subfolder;
	if (tags.includes('props')) {
		subfolder = '100-props-textures';
	} else if (tags.includes('dependency')) {
		subfolder = '100-props-textures';
	}

	// Find the description and parse it to markdown.
	let description = parseDescription($('.jd_main'));

	// Find the images.
	let images = [...$$('.jd_screenshot img')]
		.map(img => img.getAttribute('src'));

	return {
		group,
		name,
		subfolder,
		version,
		info: {
			summary,
			description,
			author,
			website: url.href,
			images,
		},
		assets: [
			{
				assetId: `${group}-${name}`,
				version,
				url: assetUrl.href,
				lastModified,
			},
		],
	};

}

// # ucfirst(str)
function ucfirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// # find(table, label)
// Helper function for finding a certain value from the table.
function find(table, label) {
	return table
		.find(node => {
			let text = node.querySelector('span:first-child')?.textContent ?? '';
			return text.toLowerCase().trim() === label;
		})
		?.querySelector('span:nth-child(2)')
		.textContent
		.trim();
}

// # wrap(document)
// Returns two jQuery-like functions for easier querying.
function wrap(document) {
	const $ = (...args) => document.querySelector(...args);
	const $$ = (...args) => document.querySelectorAll(...args);
	return { $, $$ };
}
