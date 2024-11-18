// # track-multi-units.js
import os from 'node:os';
import path from 'node:path';
import { globSync } from 'glob';
import DependencyTracker from './dependency-tracker.js';

const plugins = path.resolve(os.homedir(), 'Documents/SimCity 4/Plugins');

// # readDeps(dir)
async function readDeps(dir) {
	const sourceFiles = globSync('**/*.{dat,sc4*}', {
		cwd: dir,
		absolute: true,
		nocase: true,
		nodir: true,
	});
	const files = await tracker.track(sourceFiles);

	// Filter out the dependencies that can be found in the directory itself.
	let deps = new Set();
	for (let file of files) {
		if (file.match(/SimCity_[1-6]\.dat$/)) continue;
		if (!file.startsWith(dir+path.sep)) {
			let id = getPackageId(file);
			if (id) deps.add(id);
		}
	}
	return [...deps].sort();

}

// # getPackageId(folder)
// Extracts the package id from the given folder. Luckily this is easy with the 
// convention used by sc4pac.
function getPackageId(folder) {
	let rel = path.relative(plugins, folder);
	if (!/^[\d]{3}-/.test(rel)) return null;
	if (rel.includes('777-network-addon-mod')) return null;
	let [, pkg] = rel.split(path.sep);
	let [group, name] = pkg.split('.');
	return `${group}:${name}`;
}

const folder = path.resolve(plugins, '660-parks');
const tracker = new DependencyTracker();
let deps = await readDeps(folder);
console.log(deps);
