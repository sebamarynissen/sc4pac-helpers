// # create-girafe-test-lot.ts
import path from 'node:path';
import createLot from '#lib/create-test-lot.js';
import TreeDatabase from '#lib/tree-database.js';
import { FileType, LotObject } from 'sc4/core';
import type { Exemplar } from 'sc4/core';

const db = new TreeDatabase();
await db.load();

// Filter out only Girafe's props.
const girafe = db.filter(({ package: pkg, type }) => {
	return pkg.match(/^girafe:/) && type === 'prop';
});

const props = [];
for (let tree of girafe) {
	props.push(...findUniqueProps(tree));
}

// Cool, now create the test lot.
let size = Math.floor(Math.sqrt(props.length))+1;
let lot = createLot({
	size: [size, size],
	name: '00000000000_girafe',
	title: 'Girafe test lot',
	description: 'A lot containing all of Girafe\'s tree props',
});
let config = lot.find({
	type: FileType.Exemplar,
	group: 0xa8fbd372,
})!.read() as Exemplar;
const factor = 1;
const n = size/factor;
for (let i = 0; i < props.length; i++) {
	let x = factor*(i % n);
	let z = factor*Math.floor(i / n);
	for (let prop of props[i]) {
		let object = new LotObject({
			type: LotObject.Prop,
			x,
			z,
			minxX: x,
			minZ: z,
			maxX: x,
			maxZ: z,
			OID: 0x912 + config.lotObjects.length,
			IID: prop,
		});
		config.lotObjects.push(object);
	}
}

// Now save the lot.
lot.save(
	path.join(process.env.SC4_PLUGINS, 'Girafe_test_lot.SC4Lot'),
);

// # findUniqueProps(tree)
// Returns the unique props for the given tree. This means that we group the 
// props together that are meant to be used as a "single prop". This means that 
// if the prop has a simulator date start, we group it together with the other 
// props, as this means it's meant to be used as a seasonal tree.
function findUniqueProps(tree: any) {
	let statics = [];
	let timed = [];
	for (let config of Object.values(tree.models)) {

		// If this prop exemplar does not have a simulator start date, then it's 
		// a static - probably evergreen - prop.
		let { exemplar: [, instance], start } = config as any;
		if (!start) {
			statics.push([instance]);
		} else {
			timed.push(instance);
		}
	}
	return [...statics, ...timed.length ? [timed] : []];
}
