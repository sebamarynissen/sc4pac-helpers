// # build-twrecks-database.js
import build from '../lib/build-tree-database.js';
import TreeDatabase from '../lib/tree-database.js';

// We'll build up a custom index by model id so that we can identify the trees 
// used by their model TGI in t-wrecks' files.
const db = new TreeDatabase();
await db.load();
const index = {};
for (let row of db) {
	if (!row.id.match(/^(girafe|orange)/)) continue;
	for (let { model: [g, i] } of row.models) {
		let id = [g, i].join('/');
		(index[id] ??= new Set()).add(row);
	}
}

await build('t-wrecks:maxis-tree-hd-replacement-mod', {
	id(_exemplar, entry) {
		return `t-wrecks:maxis-tree-hd-replacement-mod-${entry.id}`;
	},
	models(exemplar, entry) {

		// For the seasonal models, we'll look them up based on the *summer* 
		// model.
		let [, g, i] = exemplar.get('ResourceKeyType1');
		let id = [g, i].join('/');
		let [row] = index[id] ?? [];

		// Apparently the models can be mirrored (I think) by setting the first 
		// bit of the tgi to 1.
		if (!row) {
			if (i > 0x10000000) {
				let id = [g, i & 0x0fffffff].join('/');
				[row] = index[id];
				if (!row) {
					console.log(entry.id, exemplar.get('ExemplarName'));
					return {};
				}
				return row.models.map(row => {
					let [group] = row.model;
					return {
						season: row.season,
						model: [group, i],
					};
				});
			} else {
				console.log(entry.id, exemplar.get('ExemplarName'));
				return {};
			}
		}
		return row.models.map(row => {
			return {
				season: row.season,
				model: row.model,
			};
		});
	},
	// dry: true,
});
