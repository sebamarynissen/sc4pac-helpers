import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

const cache = path.join(
	process.env.LOCALAPPDATA,
	'io.github.memo33/sc4pac/cache',
);

// # Downloader
// A helper class for downloading urls to the configured cache. Adds support for 
// ensuring that a certain url is only downloaded once.
export class Downloader {

	cache = '';
	pending = new Map();

	// ## constructor()
	constructor(opts = {}) {
		this.cache = opts.cache;
	}

	// ## async download(url)
	async download(url) {
		if (this.pending.has(url)) return this.pending.get(url);
		let promise = this.doDownload(url);
		this.pending.set(url, promise);
		return await promise;
	}

	// ## download(url)
	// Actually downloads the asset. Here no protection is guaranteed that only 
	// 1 unique url is downloaded at a time.
	async doDownload(url) {

		// If the destination file already exists, then return as is. Note 
		// however that we'll need a way to remove this as well when the url 
		// changes.
		const destination = path.join(
			cache,
			'coursier',
			urlToPath(url),
		);
		try {
			await fs.promises.stat(destination);
			return destination;
		} catch (e) {
			if (e.code !== 'ENOENT') throw e;
		}

		// Ensure that the folder where we'll write the file to exists.
		const dir = path.dirname(destination);
		await fs.promises.mkdir(dir, { recursive: true });

		// Perform the actual download. Note that we need to handle certain 
		// statuses as errors.
		const res = await fetch(url, {
			headers: getHeaders(url),
		});
		if (res.status >= 400) {
			throw new Error(`HTTP ${res.status}`);
		}
		const ws = fs.createWriteStream(destination);
		await finished(Readable.fromWeb(res.body).pipe(ws));

		// Return where the file can be found.
		return destination;

	}

}

// # getHeaders(link)
// Returns the headers to use for the given url. It's here that we might need to 
// lookup credentials and set them as cookie header, or Authorization header.
function getHeaders(link) {
	const url = new URL(link);
	if (url.hostname.includes('simtropolis.com')) {
		return {
			Cookie: process.env.SC4PAC_SIMTROPOLIS_COOKIE,
		};
	}
}

// # urlToPath(url)
// Converts a url to a file path to be used in the cache.
function urlToPath(url) {
	const { protocol, hostname, pathname, search } = new URL(url);
	const rest = pathname.replace(/^\//, '') + search;
	const parts = [
		protocol.replace(':', ''),
		encodeURIComponent(hostname),
		...rest.split('/').map(part => encodeURIComponent(part)),
	];
	return parts.join('/');
}

// const link = 'https://community.simtropolis.com/files/file/
// 31555-sm2-heritage-roundhouse/?do=download';
const dl = new Downloader({ cache });
await dl.download('https://community.simtropolis.com/files/file/31555-sm2-heritage-roundhouse/?do=download');
