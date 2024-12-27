import TreeDatabase from '#lib/tree-database.js';
import { DBPF, Cohort, FileType } from 'sc4/core';
import { randomId } from 'sc4/utils';
import path from 'node:path';

const replacements = {
	'cp:larchprop11x11x63': 'girafe:poplar-e-prop',
	'cp:larchprop6x6x27': 'girafe:poplar-c-prop',
	'cp:bigjeronimaple': 'girafe:ash-h-prop',
	'cp:beech': 'girafe:beech-e-prop',
	'cp:vlaakhas-oak': 'girafe:oak-d-prop',
	'cp:valleyoakprop15x15x22': 'girafe:oak-e-prop',
	'cp:streetvalleyoak': 'girafe:oak-c-prop',
	'cp:streetscarletoak': 'girafe:oak-b-prop',
	'cp:streetelm': 'girafe:elm-d-prop',
	'cp:streetcottonwoodsm': 'girafe:poplar-c-prop',
	'cp:streetcottonwoodlg': 'girafe:poplar-e-prop',
	'cp:street-valleyoak': 'girafe:oak-d-prop',
	'cp:street-tree-small': 'girafe:linden-b-prop',
	'cp:street-scarletoak': 'girafe:beech-d-prop',
	'cp:street-rftreesmall': 'girafe:beech-a-prop',
	'cp:street-rf2tree': 'girafe:rowan-tree-b-prop',
	'cp:street-oak-tree': 'girafe:norway-maple-b-prop',
	'cp:street-madrona3': 'girafe:elm-a-prop',
	'cp:street-jeronitree9': 'girafe:maple-a-prop',
	'cp:street-jeronitree8': 'girafe:birch-a-prop',
	'cp:street-jeronitree5': 'girafe:birch-b-prop',
	'cp:street-jdtree4a': 'girafe:ash-h-prop',
	'cp:street-jdtree2a': 'girafe:ash-g-prop',
	'cp:street-jdtree1a': 'girafe:ash-b-prop',
	'cp:street-cottonwoodsm': 'girafe:birch-e-prop',
	'cp:sprawlyshrub': 'girafe:bush-c-prop',
	'cp:shaded-shrubround': 'girafe:bush-b-prop',
	'cp:shaded-mtree4': 'girafe:rowan-tree-b-prop',
	'cp:shaded-mjbpoplarb': 'girafe:poplar-a-prop',
	'cp:shaded-mjbpoplara': 'girafe:poplar-a-prop',
	'cp:shaded-minitreemaple': 'girafe:linden-a-prop',
	'cp:shaded-minitreecott': 'girafe:linden-b-prop',
	'cp:shaded-minioak': 'girafe:beech-a-prop',
	'cp:hornbeamb': 'girafe:chestnut-e-prop',
	'cp:poplar': 'girafe:beech-d-prop',
	'cp:riverbirch': 'girafe:beech-e-prop',
	'cp:plum': 'girafe:alder-e-prop',
	'cp:maple': 'girafe:maple-h-prop',
	'cp:seas-scarletoak': 'girafe:oak-e-prop',
	'cp:cherry': 'girafe:honey-locust-b-prop',
	'cp:horsechestnut': 'girafe:chestnut-b-prop',
	'cp:cottonwood-11x11x': 'girafe:poplar-d-prop',
	'cp:cottonwood-10x10x': 'girafe:poplar-e-prop',
};

let dbpf = new DBPF();
let db = new TreeDatabase();
await db.load();

for (let [target, replacement] of Object.entries(replacements)) {
	let [tree] = db.index[target] || [];
	if (!tree) {
		console.log(target);
		continue;
	}
	let patchTargets = [];
	for (let { exemplar } of tree.models) {
		patchTargets.push(...exemplar);
	}

	let [newTree] = db.index[replacement] || [];
	if (!newTree) {
		console.log(replacement);
		continue;
	}
	let { models } = newTree;
	let { model } =
		models.find(data => data.season === 'fall') ||
		models.find(data => data.season === 'summer') ||
		models.find(data => data.season === 'evergreen') || {};
	if (!model) continue;
	let cohort = new Cohort();
	cohort.addProperty(0x0062e78a, patchTargets);
	cohort.addProperty('ResourceKeyType1', [FileType.S3D, ...model]);
	cohort.addProperty('ItemName', `${tree.id}/${newTree.id}`);
	dbpf.add([FileType.Cohort, 0xb03697d1, randomId()], cohort);
}

dbpf.save(
	path.join(process.env.SC4_PLUGINS, '849-my-overrides/zzz_cp-replacement.dat'),
);
