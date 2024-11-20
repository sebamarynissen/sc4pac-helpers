// # scrape.js
import st from './scrape-st.js';
import sc4e from './scrape-sc4e.js';

// # scrape(link, opts)
// Entry point for scraping urls. It inspects the url and then calls the 
// appropriate scraping function for the host in question.
export default async function scrape(link, opts) {
	let url = new URL(link);
	if (url.hostname.includes('community.simtropolis.com')) {
		return await st(link, opts);
	} else if (url.hostname.includes('sc4evermore.com')) {
		return await sc4e(link, opts);
	} else {
		throw new Error(`Unable to scrape ${link}. No scraping function is known for ${url.hostname}!`);
	}
}
