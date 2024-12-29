import traverse from '../lib/traverse-yaml.js';
import scrape from '../lib/scrape.js';

let had = new Set();
await traverse('src/yaml/rretail/*', async json => {
	if (!json.group) return;
	if (!json.info?.website) {
		console.log(`No website for ${json.name}`);
		return;
	}
	let { website } = json.info;
	if (had.has(website)) {
		console.log('double website!');
		console.log(website);
		return;
	}
	had.add(website);
	let metadata = await scrape(website, { assets: false });
	json.info.description = metadata.info.description;
	return json;
}, {
	cwd: 'C:\\Users\\sebam\\Documents\\SimCity 4 modding\\simtropolis-channel',
});
