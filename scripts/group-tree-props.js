// # group-props.js
import path from 'node:path';
import TreeDatabase from '#lib/tree-database.js';
import { DBPF, FileType, LotObject } from 'sc4/core';

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

const sourceLot = path.resolve(process.env.SC4_PLUGINS, 'Girafe_park.SC4Lot');
const lot = new DBPF(sourceLot);
let config = lot.find({
	type: FileType.Exemplar,
	group: 0xa8fbd372,
}).read();

const size = 20;
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
lot.save(
	path.resolve(process.env.SC4_PLUGINS, 'z_Girafe_park.SC4Lot'),
);

// # findUniqueProps(tree)
// Returns the unique props for the given tree. This means that we group the 
// props together that are meant to be used as a "single prop". This means that 
// if the prop has a simulator date start, we group it together with the other 
// props, as this means it's meant to be used as a seasonal tree.
function findUniqueProps(tree) {
	let statics = [];
	let timed = [];
	for (let config of Object.values(tree.models)) {

		// If this prop exemplar does not have a simulator start date, then it's 
		// a static - probably evergreen - prop.
		let { exemplar: [, instance], start } = config;
		if (!start) {
			statics.push([instance]);
		} else {
			timed.push(instance);
		}
	}
	return [...statics, ...timed.length ? [timed] : []];
}
