// # track-sm2-deps.js
import traverse from '../lib/traverse-yaml.js';
import { DependencyTracker } from 'sc4/plugins';

const tracker = new DependencyTracker();
await traverse('**/mattb325/transportation-collection.yaml', async (json, doc) => {
	
	if (!json.group) return;
	if (json.name === 'transportation-collection') return;
	const pkg = `${json.group}:${json.name}`;
	try {
		const result = await tracker.track(pkg);
		let exclude = new Set([
			'simfox:day-and-nite-mod',
		]);
		let deps = result.packages
			.filter(pkg => !exclude.has(pkg))
			.sort();
		if (deps.length > 0) {
			json.dependencies = deps;
			return json;
		} else {
			console.log(pkg);
			delete json.dependencies;
			return json;
		}
		// const set = new Set(dependencies);
		// let extras = new Set(result.packages.filter(dep => !set.has(dep)));
		// extras.delete('bsc:essentials');
		// if (extras.size > 0) {
		// 	console.log(pkg, [...extras]);
		// 	console.log('packages', result.packages);
		// 	result.dump({ format: 'tree' });
		// }
	} catch (e) {
		console.log('ERROR in', pkg);
	}

});
