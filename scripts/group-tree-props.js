// # group-props.js
import TreeDatabase from '#lib/tree-database.js';

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
