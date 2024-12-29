import traverse from '../lib/traverse-yaml.js';
import bsc from '#lib/data/deps-bsc.js';
import girafe from '#lib/data/deps-girafe.js';
import { DependencyTracker } from 'sc4/plugins';
const tracker = new DependencyTracker();

let set = new Set([...bsc, ...girafe]);
await traverse('src/yaml/pclark06/*', async json => {
	if (!json.group) return;
	if (!json.dependencies) return;
	const pkg = `${json.group}:${json.name}`;
	try {
		const result = await tracker.track(pkg);

		// Instead of replacing the dependencies, we'll only filter out the ones 
		// that seem to be unnecessary. The dependencies are one big mess so it 
		// seems, and there's a lot of cross-referencing somehow, so we'll still 
		// rely on the ST dependencies as much as possible.
		json.dependencies = json.dependencies.filter(dep => {
			if (!set.has(dep)) return true;
			return result.packages.includes(dep);
		});

		// nos17 essentials is apparently nowhere listed as a dependency, but 
		// our tracking script does find it that way, so make sure it is added.
		if (result.packages.includes('nos17:essentials')) {
			json.dependencies.push('nos17:essentials');
		}

		json.dependencies.sort();
		return json;

	} catch (e) {
		console.log('ERROR in', pkg);
		console.error(e);
	}
}, {
	cwd: 'C:\\Users\\sebam\\Documents\\SimCity 4 modding\\simtropolis-channel',
});
