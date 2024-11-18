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
		if (!file.startsWith(dir+path.sep)) {
			let id = getPackageId(file);
			if (id) deps.add(id);
		}
	}

	// Well, we have all dependencies now. One more thing to do: parse the 
	// package name of the folder we're looking for.
	let include = path.relative(path.resolve(dir, '../..'), dir).replace('\\', '/');
	let base = path.basename(dir);
	let alias = aliases[base] || base;
	let summary = alias.replace(/_[dm]n$/i, '').replace('#', '');
	let name = summary
		.toLowerCase()
		.replaceAll(/[\s']/g, '-')
		.replaceAll('#', '');

	// Determine what we have to include from the assets. This is just the folder
	// name, but take into account that some folders are prefixed with MN and DN.
	let includes;
	if (include.endsWith('_DN') || include.endsWith('_MN')) {
		includes = [
			include.replace(/_[DM]N$/, '_MN'),
			include.replace(/_[DM]N$/, '_DN'),
		];
	} else {
		includes = [include, include];
	}

	// Make sure to include ourselves from the dependencies.
	let group = 'mattb325';
	deps.delete(`${group}:${name}`);

	return {
		group: 'mattb325',
		name,
		info: {
			summary,
			author: 'mattb325',
			website: 'https://www.sc4evermore.com/index.php/downloads/download/19-transportation/315-sc4d-lex-legacy-mattb325-transportation-collection-darknite',
		},
		dependencies: [...deps].sort(),
		includes,
	};

}

// # getPackageId(folder)
// Extracts the package id from the given folder. Luckily this is easy with the 
// convention used by sc4pac.
function getPackageId(folder) {
	let rel = path.relative(plugins, folder);
	if (!/^\d\d[02468]-/.test(rel)) return null;
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
version: "1.0"
subfolder: 700-transit
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
      - assetId: mattb325-transportation-collection-maxisnite
        include:
          - "/${props.includes[0]}/"
      - assetId: mattb325-multifunction-stations-maxisnite
  - variant: { nightmode: dark }
    dependencies: [ "simfox:day-and-nite-mod" ]
    assets:
      - assetId: mattb325-transportation-collection-darknite
        include: 
          - "/${props.includes[1]}/"
      - assetId: mattb325-multifunction-stations-darknite
`;
  return str.trim();
}

const assets = `
assetId: mattb325-transportation-collection-darknite
version: "1.0"
lastModified: "2024-10-27T04:25:27-07:00"
url: https://www.sc4evermore.com/index.php/downloads?task=download.send&id=315:sc4d-lex-legacy-mattb325-transportation-collection-darknite&catid=19

---
assetId: mattb325-transportation-collection-maxisnite
version: "1.0"
lastModified: "2024-10-27T04:25:54-07:00"
url: https://www.sc4evermore.com/index.php/downloads?task=download.send&id=316:sc4d-lex-legacy-mattb325-transportation-collection-maxisnight&catid=19

---
assetId: mattb325-multifunction-stations-darknite
version: "2.0"
lastModified: "2024-10-26T08:14:24-07:00"
url: https://www.sc4evermore.com/index.php/downloads?task=download.send&id=112:mattb325-multifunction-stations-prop-pack-dark-nite&catid=22

---
assetId: mattb325-multifunction-stations-maxisnite
version: "2.0"
lastModified: "2024-10-26T08:13:53-07:00"
url: https://www.sc4evermore.com/index.php/downloads?task=download.send&id=113:mattb325-multifunction-stations-prop-pack-maxis-nite&catid=22

---
group: mattb325
name: terminus-stations
version: "1.0"
subfolder: 100-props-textures
variants:
  - variant: { nightmode: standard }
    assets:
      - assetId: mattb325-transportation-collection-maxisnite
        include: ["/BSCProps#/"]
  - variant: { nightmode: dark }
    dependencies: [ "simfox:day-and-nite-mod" ]
    assets:
      - assetId: mattb325-transportation-collection-darknite
        include: ["/BSCProps#/"]

---
group: mattb325
name: multifunction-stations
version: "2.0"
subfolder: 100-props-textures
variants:
  - variant: { nightmode: standard }
    assets:
      - assetId: mattb325-multifunction-stations-maxisnite
  - variant: { nightmode: dark }
    dependencies: [ "simfox:day-and-nite-mod" ]
    assets:
      - assetId: mattb325-multifunction-stations-darknite
`.trim();

// # generator()
// Async generator.
async function* generator(dir) {
	yield assets+'\n\n';
	const collection = path.resolve(plugins, dir);
	const glob = new Glob('*/', {
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

const folder = path.resolve(plugins, '700-transit');
const tracker = new DependencyTracker({
	cache: '../dist/transport.json',
});

const rs = Readable.from(generator(folder));
// const ws = fs.createWriteStream('../../sc4pac/src/yaml/mattb325/transporation-collection.yaml');
for await (let chunk of rs);
// await finished(rs.pipe(ws));
