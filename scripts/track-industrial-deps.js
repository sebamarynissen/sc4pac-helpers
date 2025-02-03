// # track-industrial-deps.js
import traverse from '../lib/traverse-yaml.js';
import { DependencyTracker } from 'sc4/plugins';

const tracker = new DependencyTracker();
await traverse('**/mattb325/industrial-collection.yaml', async (json, doc) => {
	
	if (!json.group) return;
	const pkg = `${json.group}:${json.name}`;
	if (pkg === 'mattb325:industrial-collection') return;
	if (pkg === 'mattb325:industrial-pack-shared-resources') return;
	try {
		const result = await tracker.track(pkg);
		let exclude = new Set([
			'simfox:day-and-nite-mod',
			'bsc:essentials',
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
	} catch (e) {
		console.log('ERROR in', pkg);
	}

});
