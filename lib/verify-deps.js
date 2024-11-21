// # verify-deps.js
import { Glob } from 'glob';
import DependencyTracker from './dependency-tracker.js';
import { plugins } from './directories.js';

const tracker = new DependencyTracker();
const glob = new Glob('200-residential/*/', {
	cwd: plugins,
	absolute: true,
});

for (let dir of glob) {
	const result = await tracker.track(dir);
	if (result.missing.length > 0) {
		console.log(dir);
		result.dump();
	}
}
