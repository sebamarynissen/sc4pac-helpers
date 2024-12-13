// # generate-girafe-patch.js
import path from 'node:path';
import generate from '../lib/generate-tree-patch.js';
import { getId } from './build-girafe-database.js';

let set = new Set();
await generate(['{girafe,orange}:*', 'mgb204:girafe-mmp-*'], {
	id: getId,
	cwd: path.resolve(import.meta.dirname, '../packages/Girafe'),
	filter(exemplar, entry) {
		let { file } = entry.dbpf;
		if (file.match(/winter/i)) return false;
		set.add(file);
		return true;
	},
	name: 'z_static_season_girafe',
});
