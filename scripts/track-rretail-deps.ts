import traverse from '../lib/traverse-yaml.js';
import chalk from 'chalk';
import { DependencyTracker } from 'sc4/plugins';

const tracker = new DependencyTracker();
await traverse('**/rretail/**', async json => {
	
	if (!json.group) return;
	const pkg = `${json.group}:${json.name}`;
	const { dependencies = [] } = json;
	try {
		const result = await tracker.track(pkg);
		const set = new Set(dependencies);
		let extras = new Set(result.packages.filter(dep => !set.has(dep)));
		extras.delete('bsc:essentials');
		if (result.missing.length > 0) {
			let { tree } = result;
			for (let dep of tree as any) {
				if (dep.kind !== 'lot') continue;
				if (!dep.building || dep.building.models.filter(dep => dep.kind === 'missing').length > 0) {
					console.log(pkg);
					console.log(String(dep));
				}
			}
		}
		if (extras.size > 0) {
			console.log(pkg);
			for (let extra of extras) {
				console.log(` - ${chalk.cyan(extra)}`);
				json.dependencies.push(extra);
			}
			return json;
		}
	} catch (e) {
		console.log('ERROR in', pkg);
	}

});
