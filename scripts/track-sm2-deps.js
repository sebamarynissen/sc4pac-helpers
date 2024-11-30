// # track-sm2-deps.js
import traverse from '../lib/traverse-yaml.js';
import { DependencyTracker } from 'sc4/plugins';

const tracker = new DependencyTracker();
await traverse('**/sm2/**', async json => {
	
	if (!json.group) return;
	const pkg = `${json.group}:${json.name}`;
	const { dependencies = [] } = json;
	try {
		const result = await tracker.track(pkg);
		const set = new Set(dependencies);
		let extras = new Set(result.packages.filter(dep => !set.has(dep)));
		extras.delete('bsc:essentials');
		if (extras.size > 0) {
			console.log(pkg, [...extras]);
		}
	} catch (e) {
		console.log('ERROR in', pkg);
	}

});
