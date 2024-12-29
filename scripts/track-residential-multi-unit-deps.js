import traverse from '../lib/traverse-yaml.js';
import { DependencyTracker } from 'sc4/plugins';

const tracker = new DependencyTracker();
await traverse('**/mattb325/residential-multi-unit-collection.yaml', async (json, doc) => {
	
	if (!json.group) return;
	if (json.name === 'residential-multi-unit-collection') return;
	const pkg = `${json.group}:${json.name}`;
	try {
		const result = await tracker.track(pkg);
		let exclude = new Set([
			'bsc:essentials',
			'simfox:day-and-nite-mod',
		]);
		let deps = result.packages
			.filter(pkg => !exclude.has(pkg))
			.sort();
		if (json.dependencies.includes('bsc:essentials')) {
			deps.unshift('bsc:essentials');
		}
		if (deps.length > 0) {
			json.dependencies = deps;
			return json;
		} else {
			console.log(pkg);
			delete json.dependencies;
			return json;
		}
	} catch (e) {
		console.log('ERROR in', pkg);
	}

});
