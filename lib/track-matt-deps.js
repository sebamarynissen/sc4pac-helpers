// # track.js
import ora from 'ora';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import os from 'node:os';
import { Glob } from 'glob';
import 'sc4/utils/register';
import { DBPF, FileType } from 'sc4/core';
import FileIndex from 'sc4/api/file-index.js';

// Constants
const LotConfigurations = 0x00000010;

// First we'll build up an index from our entire plugins folder.
const plugins = path.resolve(os.homedir(), 'Documents/SimCity 4/Plugins');
const index = new FileIndex(plugins);
let spinner = ora('Building index').start();
await index.build();
await index.buildFamilies();
spinner.succeed();

// # readPackage(dir)
// Loops all files in a package folder and collects all the dependencies from it.
async function readPackage(dir) {

	// Find all dbpfs in the folder.
	let filesToScan = new Glob('**/*.{dat,sc4*}', {
		cwd: dir,
		absolute: true,
		nocase: true,
	});

	// Initialze the set containing all exemplar iids that will be collected 
	// when looping the exemplars.
	let iids = new Set();
	let lots = 0;
	let wealth = '';
	for await (let file of filesToScan) {
		let dbpf = new DBPF(file);
		for (let entry of dbpf.exemplars) {
			readExemplar(entry, iids);
		}
		let basename = path.basename(file);
		if (path.extname(basename).toLowerCase() === '.sc4lot') {
			lots++;
			let match = basename.match(/^R\$+/);
			if (match) {
				[wealth] = match;
			}
		}
	}

	// Now translate every unique id into the files that they can be found in.
	let files = new Set();
	for (let iid of iids) {
		let family = index.family(iid);
		if (family) {
			for (let entry of family) {
				files.add(entry.dbpf.file);
			}
		} else {
			let entry = index.find({ type: FileType.exemplar, instance: iid });
			if (!entry) continue;
			files.add(entry.dbpf.file);
		}
	}
	
	// Filter out the dependencies that can be found in the directory itself.
	let deps = new Set();
	for (let file of files) {
		if (!file.startsWith(dir+path.sep)) {
			deps.add(getPackageId(file));
		}
	}

	// Well, we have all dependencies now. One more thing to do: parse the 
	// package name of the folder we're looking for.
	let summary = path.basename(dir).replace(/_[dm]n$/i, '');
	let name = summary
		.toLowerCase()
		.replaceAll(/\s/g, '-');

	return {
		group: 'mattb325',
		name,
		info: {
			summary,
			description: `${lots} ${wealth} house models for small lots`,
			author: 'mattb325',
			website: 'https://www.sc4evermore.com/index.php/downloads/download/11-residential/100-sc4d-lex-legacy-mattb325-residential-houses-pack-darknite',
		},
		dependencies: [...deps].sort(),
	};

}

// # readExemplar(entry, deps)
// Reads the given exemplar and collects all dependencies from it.
function readExemplar(entry, deps = new Set()) {

	// If the exemplar is not a LotConfigurations exemplar, skip it.
	let exemplar = entry.read();
	let type = exemplar.value(0x10);
	if (type !== LotConfigurations) return;

	// Cool, now read in all lot objects.
	let { lotObjects } = exemplar;
	for (let lotObject of lotObjects) {
		let iids = lotObject.IIDs;
		for (let iid of iids) {
			deps.add(iid);
		}
	}

}

// # getPackageId(folder)
// Extracts the package id from the given folder. Luckily this is easy with the 
// convention used by sc4pac.
function getPackageId(folder) {
	let rel = path.relative(plugins, folder);
	let [, pkg] = rel.split(path.sep);
	let [group, name] = pkg.split('.');
	return `${group}:${name}`;
}

// # generate(props)
function generate(props) {
	return `
group: ${props.group}
name: ${props.name}
version: "1.1"
subfolder: 200-residential
info:
  summary: ${props.info.summary}
  description: ${props.info.description}
  author: ${props.info.author}
  website: ${props.info.website}

dependencies:
${props.dependencies.map(x => `  - ${x}`).join('\n')}
variants:
  - variant: { nightmode: standard }
    assets:
      - assetId: mattb325-residential-houses-maxisnite
  - variant: { nightmode: dark }
    dependencies: [ "simfox:day-and-nite-mod" ]
    assets:
      - assetId: mattb325-residential-houses-darknite
`.trim();
}

// # generator()
// Async generator.
async function* generator(dir) {
	const collection = path.join(plugins, dir);
	const glob = new Glob('*', {
		cwd: collection,
		absolute: true,
	});
	for await (let dir of glob) {
		const props = await readPackage(dir);
		let output = `---\n${generate(props)}\n\n`;
		console.log(output);
		yield output;
	}
}

console.time('parse');
const rs = Readable.from(generator('200-residential/mattb325.residential-collection.dark.1.1.sc4pac'));
const ws = fs.createWriteStream('./mattb325.yaml');
await finished(rs.pipe(ws));
console.timeEnd('parse');
