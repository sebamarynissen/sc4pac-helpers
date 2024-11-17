// # track-multi-units.js
import fs from 'node:fs';
import os from 'node:os';
import { Glob } from 'glob';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import path from 'node:path';
import { globSync } from 'glob';
import DependencyTracker from './dependency-tracker.js';

const aliases = {};
const plugins = path.resolve(os.homedir(), 'Documents/SimCity 4/Plugins');

// # readPackage(dir)
async function readPackage(dir) {
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

	// Well, we have all dependencies now. One more thing to do: parse the 
	// package name of the folder we're looking for.
	let base = path.basename(dir);
	let alias = aliases[base] || base;
	let summary = alias.replace(/_[dm]n$/i, '');
	let name = summary
		.toLowerCase()
		.replaceAll(/\s/g, '-');

	// Determine what we have to include from the assets. This is just the folder
	// name, but take into account that some folders are prefixed with MN and DN.
	let includes;
	if (base.endsWith('_DN') || base.endsWith('_MN')) {
		includes = [
			base.replace(/_[DM]N$/, '_MN'),
			base.replace(/_[DM]N$/, '_DN'),
		];
	} else {
		includes = [base, base];
	}

	// Make sure to include ourselves from the dependencies.
	let group = 'mattb325';
	deps.delete(`${group}:${name}`);

	// Count the amount of lots of each wealth type there are in this directory.
	let lots = 0;
	let wealth = '';
	for (let file of sourceFiles) {
		let basename = path.basename(file);
		if (path.extname(basename).toLowerCase() === '.sc4lot') {
			lots++;
		}
		let match = basename.match(/^R\$+/);
		if (match) {
			[wealth] = match;
		}
	}

	return {
		group: 'mattb325',
		name,
		info: {
			summary,
			description: `${lots} ${wealth} multi-unit condos`,
			author: 'mattb325',
			website: 'https://www.sc4evermore.com/index.php/downloads/download/11-residential/98-sc4d-lex-legacy-mattb325-residential-multi-unit-pack-darknite',
		},
		dependencies: ['bsc:essentials', ...[...deps].sort()],
		includes,
	};

}

// # getPackageId(folder)
// Extracts the package id from the given folder. Luckily this is easy with the 
// convention used by sc4pac.
function getPackageId(folder) {
	let rel = path.relative(plugins, folder);
	if (!/^[\d]{3}-/.test(rel)) return null;
	let [, pkg] = rel.split(path.sep);
	let [group, name] = pkg.split('.');
	return `${group}:${name}`;
}

// # generate(props)
function generate(props) {
	let deps = '';
	if (props.dependencies.length > 0) {
		deps = '\ndependencies:\n'+props.dependencies.map(x => `  - ${x}`).join('\n');
	}
	let str = `
group: ${props.group}
name: ${props.name}
version: "1.2"
subfolder: 200-residential
info:
  summary: ${props.info.summary}
  `;

	if (props.info.description) {
	  str += `description: ${props.info.description}\n  `;
	}

	str += `author: ${props.info.author}
  website: ${props.info.website}
${deps}
variants:
  - variant: { nightmode: standard }
    assets:
      - assetId: mattb325-residential-multi-units-maxisnite
        include: ["/${props.includes[0]}/"]
  - variant: { nightmode: dark }
    dependencies: [ "simfox:day-and-nite-mod" ]
    assets:
      - assetId: mattb325-residential-multi-units-darknite
        include: ["/${props.includes[1]}/"]
`;
  return str.trim();
}

const assets = `
assetId: mattb325-residential-multi-units-darknite
version: "1.2"
lastModified: "2023-08-20T05:50:16-07:00"
url: https://www.sc4evermore.com/index.php/downloads?task=download.send&id=98:sc4d-lex-legacy-mattb325-residential-multi-unit-pack-darknite&catid=11

---
assetId: mattb325-residential-multi-units-maxisnite
version: "1.2"
lastModified: "2023-08-20T03:08:11-07:00"
url: https://www.sc4evermore.com/index.php/downloads?task=download.send&id=99:sc4d-lex-legacy-mattb325-residential-multi-unit-pack-maxisnite&catid=11
`.trim();

// # generator()
// Async generator.
async function* generator(dir) {
	yield assets+'\n\n';
	const collection = path.resolve(plugins, dir);
	const glob = new Glob('*', {
		cwd: collection,
		absolute: true,
	});
	for await (let dir of glob) {
		const props = await readPackage(dir);
		let output = `---\n${generate(props)}\n\n`;
		yield output;
		console.log(props.group + ':' + props.name);
	}
}

const folder = path.resolve(import.meta.dirname, '../../Residential Multi-Unit');
const tracker = new DependencyTracker({
	scan: [folder],
});

const rs = Readable.from(generator(folder));
const ws = fs.createWriteStream('../../sc4pac/src/yaml/mattb325/residential-multi-units.yaml');
await finished(rs.pipe(ws));
