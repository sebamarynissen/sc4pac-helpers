// # scrape.js
import path from 'node:path';
import { JSDOM } from 'jsdom';
import chalk from 'chalk';
import ora from 'ora';
import parseDependencies from './parse-dependencies.js';
import { authors, prefixes } from './data.js';

// # parse()
// Parses the main metadata from the main Simtropolis page.
export function parse(url = window.location.href, document = window.document) {

	// Make querying eaqier with jQuery-style $'s.
	const { $, $$ } = wrap(document);

	// The file id is parsed from the url.
	let parsedUrl = new URL(url);
	let [, name] = parsedUrl.pathname
		.replace(/\/$/, '')
		.split('/')
		.at(-1)
		.match(/[\d+]-(.*)/);

	// We'll look up the author by looking for the "Find their other files" text.
	let author = [...$$('ul.ipsList_inline')]
		.find(node => {
			return node.textContent
				.toLowerCase()
				.includes('find their other files');
		})
		.previousElementSibling
		.textContent
		.trim()
		.replace(/^By /, '')
		.trim();

	// Create a slugified version of the author. Note that it's also here that 
	// we apply any acronyms if applicable.
	let group = slugify(author);

	// Find the summary as the h1 title. Note that we'll also look for prefix 
	// filters here and filter them out accordingly.
	let summary = $('h1 > span:last-child').childNodes[0].textContent.trim();
	let prefix = prefixes[group];
	if (prefix) {
		name = name.replace(prefix, '').trim().replace(/^-+/, '');
		summary = summary.replace(prefix, '').trim();
	}

	// Next we'll find the description paragraph.
	let h2 = [...$$('h2')]
		.find(node => {
			return node.textContent.toLowerCase().includes('about this file');
		});
	let description = [...h2.parentElement.querySelectorAll('section > div:first-child')]
		.map(p => p.textContent.trim())
		.join('\n');

	// Find all urls in the description.
	let links = [...h2.parentElement.querySelectorAll('section > div:first-child a')]
		.filter(a => a.textContent.trim() !== '')
		.map(a => {
			let link = a.getAttribute('href');
			let text = a.textContent.trim();
			return { link, text };
		});

	// Find the version.
	let version = document.querySelector('.stex-title-version').textContent;

	// Find the modified date.
	const has = text => time => time.parentElement
		?.previousElementSibling
		?.textContent
		.includes(text);
	let modified = (
		[...$$('time')].find(has('Updated')) ||
		[...$$('time')].find(has('Submitted'))
	).getAttribute('datetime');

	// Find the full images. If they don't exist, search for the thumbnails 
	// instead.
	let images = [...$$('ul.cDownloadsCarousel [data-fullURL]')]
		.map(span => span.getAttribute('data-fullURL'));
	if (images.length === 0) {
		images = [...$$('ul.cDownloadsCarousel img')]
			.map(img => img.getAttribute('src'));
	}

	return {
		group,
		name,
		version,
		modified,
		links,
		info: {
			summary,
			author,
			description,
			website: url,
			images,
		},
	};

}

// # parseMultipleAssets(main, document)
// Parses a html document that contains the various assets that can be 
// downloaded.
function parseMultipleAssets(main, document) {
	const { $ } = wrap(document);
	let baseId = `${main.group}-${main.name}`;
	let assets = [...wrap($('ul.ipsDataList')).$$('* > li')]
		.map((li, i) => {

			// Extract the actual download url.
			let a = li.querySelector('a');
			if (!a) return;
			let href = a.getAttribute('href');
			let url = new URL(href);
			url.searchParams.delete('confirm');
			url.searchParams.delete('t');
			url.searchParams.delete('csrfKey');

			// Extract the name of the download. From this we'll detect whether 
			// it's a maxisnite or darknite download.
			let name = li.querySelector('h4 span').textContent;
			let suffix = getAssetSuffix(name, i);
			return {
				assetId: `${baseId}-${suffix}`,
				url: url.href,
				lastModified: main.modified,
			};

		}).filter(Boolean);
	return assets;
}

// # getAssetSuffix(name, index)
// This function intelligently determines the asset suffix. This is mostly 
// useful for detecting maxis nite and dark nite versions.
export function getAssetSuffix(name, index) {
	let src = path.parse(name.trim()).name.toLowerCase();
	if (/dark\s?ni(te|ght)/.test(src)) return 'darknite';
	if (/maxis\s?ni(te|ght)/.test(src)) return 'maxisnite';
	if (/[_-\s]dn/.test(src)) return 'darknite';
	if (/[_-\s]mn/.test(src)) return 'maxisnite';
	if (/\(lhd\)/.test(src)) return 'lhd';
	if (/\(rhd\)/.test(src)) return 'rhd';
	return `part-${index}`;
}

// # wrap(document)
// Returns two jQuery-like functions for easier querying.
function wrap(document) {
	const $ = (...args) => document.querySelector(...args);
	const $$ = (...args) => document.querySelectorAll(...args);
	return { $, $$ };
}

// # slugify(name)
// Converts the name of the author into a slugged version.
function slugify(name) {
	let lc = name.toLowerCase();
	if (lc in authors) {
		return authors[lc];
	}
	return lc.replaceAll(/\s+/g, '-');
}

// # scrape(url, opts)
// Fetches a url information from Simtropolis and returns the metadata from it.
export default async function scrape(url, opts = {}) {

	// Clean the url fisrt.
	let parsedUrl = new URL(url);
	parsedUrl.search = '';
	url = String(parsedUrl);
	let spinner = ora(`Fetching ${chalk.cyan(url)}`).start();
	let html = await get(url).then(res => res.text());
	spinner.succeed();
	let { document } = new JSDOM(html).window;
	let props = parse(url, document);

	// Parse the depedencies
	let deps = parseDependencies(props);
	if (deps.length > 0) {
		props.dependencies = deps;
	}

	// If the assets don't need to be parsed, return as is.
	if (opts.assets === false) return props;

	// Fetch the headers of the download link as well. That way we can determine 
	// whether there are multiple assets or not.
	let downloadUrl = new URL(url);
	downloadUrl.searchParams.set('do', 'download');
	spinner = ora(`Fetching headers from ${chalk.cyan(downloadUrl)}`).start();
	let head = await get(downloadUrl, { method: 'HEAD' });
	spinner.succeed();
	let content = head.headers.get('Content-Type');

	// If the download link is *not* an html file, then there's only a single 
	// asset. Include it that way.
	if (!content.includes('text/html')) {
		props.assets = [{
			assetId: `${props.group}-${props.name}`,
			version: props.version,
			lastModified: props.modified,
			url: downloadUrl.href,
		}];
	} else {

		// If the download link is an html file, then it's a page listing the 
		// various downloads. We'll fetch this page and then extract the data 
		// from it.
		let spinner = ora(`Fetching assets from ${chalk.cyan(downloadUrl)}`);
		spinner.start();
		let html = await get(downloadUrl).then(res => res.text());
		spinner.succeed();

		// Parse the html and extract the assets info from it.
		let { document } = new JSDOM(html).window;
		props.assets = parseMultipleAssets(props, document);

	}
	return props;

}

// # get(...args)
// Small wrapper around fetch to handle Simtropolis' 520 errors.
async function get(url, opts = {}) {
	let res = await fetch(url, {
		...opts,
		headers: {
			Cookie: process.env.SC4PAC_SIMTROPOLIS_COOKIE,
			...opts.headers,
		},
	});
	if (res.status === 520) {
		throw new Error(`Simtropolis returned 520, it might be down!`);
	} else if (res.status === 403) {
		throw new Error(`Simtropolis returned 403. You may be at the download limit!`);
	}
	return res;
}
