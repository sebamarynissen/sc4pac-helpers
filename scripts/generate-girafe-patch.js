// # generate-girafe-patch.js
import path from 'node:path';
import { DBPF, FileType } from 'sc4/core';
import generate from '../lib/generate-tree-patch.js';
import TreeDatabase from '../lib/tree-database.js';

let set = new Set();
const patches = await generate(['girafe:*', 'mgb204:girafe-mmp-*', 't-wrecks:maxis-tree-hd-replacement-mod'], {
	cwd: path.resolve(import.meta.dirname, '../packages/Girafe'),
	filter(exemplar, entry) {
		let { file } = entry.dbpf;
		if (file.match(/winter/i)) return false;
		if (file.match(/wheat/i)) return false;
		if (file.match(/parasol_pines/i)) return false;
		if (file.match(/cypress/i)) return false;
		if (file.match(/canary/i)) return false;
		set.add(file);
		return true;
	},
	name: 'z_static_season_girafe',
	labels: true,
	save: false,
});

const db = new TreeDatabase();
await db.load();

// Read in the 3D models from T-Wrecks' patch. We'll have to add them to a 
// different DBPF under a different tgi - more specifically a different *group*!
let dbpf = new DBPF(path.resolve(import.meta.dirname, '../packages/Girafe/180-flora/t-wrecks.maxis-tree-hd-replacement-mod.1.0.sc4pac/Maxis Tree HD Replacement.dat'));
for (let entry of dbpf.findAll({ type: FileType.S3D })) {
	let [type, group, instance] = entry.tgi;
	let tree = db.find(tree => {
		return tree.models.some(({ model }) => {
			return model[0] === group;
		});
	});
	for (let patch of patches) {
		let model = db.findSeasonModel(tree.id, patch.season);
		patch.dbpf.add({
			type,
			group: model[0],
			instance,
		}, entry.readRaw(), { compressed: entry.compressed });
	}
}
for (let { dbpf, season } of patches) {
	let fileName = `z_static_season_girafe_${season.toUpperCase()}.dat`;
	dbpf.save(path.join(process.env.SC4_PLUGINS, '849-my-overrides', fileName));
}
