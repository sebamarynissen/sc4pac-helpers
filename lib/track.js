// # track.js
import path from 'node:path';
import { Glob } from 'glob';
import { plugins } from './directories.js';
import DependencyTracker from './dependency-tracker.js';

// First we'll find the folder we have to scan for dependencies.
async function findFolder(id) {
	if (id.includes(':')) {
		let glob = new Glob('*/*/', {
			cwd: plugins,
			absolute: true,
		});
		for await (let folder of glob) {
			if (!folder.endsWith('.sc4pac')) continue;
			let pkg = folderToPackageId(folder);
			if (pkg === id) return folder;
		}
	} else {
		return path.resolve(plugins, id);
	}
}

// # folderToPackageId(folder)
// Returns the corresponding sc4pac package id from a given folder. If this is 
// not an sc4pac folder, we return nothing.
function folderToPackageId(folder) {
	let basename = path.basename(folder);
	while (!basename.endsWith('.sc4pac')) {
		folder = path.resolve(folder, '..');
		basename = path.basename(folder);
		if (!basename) return null;
	}
	let [group, name] = basename.split('.');
	return `${group}:${name}`;
}

// # track(pkg)
// The main function to call for tracking down all dependencies of a certain 
// package.
export default async function track(pkg) {

	// First of all we'll translate the input to an actual folder inside our 
	// plugins folder. When using the group:name format, we automatically find 
	// the corresponding sc4pac folder.
	const folder = await findFolder(pkg);

	// Now find all files to scan in this folder.
	const sourceFiles = await new Glob('**/*', {
		absolute: true,
		nodir: true,
		cwd: folder,
	}).walk();

	// Use our dependency tracker to find all referenced files.
	const tracker = new DependencyTracker();
	const files = await tracker.track(sourceFiles);

	// Now convert the referenced files back to group:name ids if possible.
	const deps = files.map(dep => {
		const dir = path.dirname(dep);
		const pkg = folderToPackageId(dir) || dir;
		return pkg;
	});

	// Filter out duplicates, sort and then return.
	return [...new Set(deps)].sort();

}
