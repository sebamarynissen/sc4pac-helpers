import { Document } from 'yaml';

export function serialize(families) {
	families.forEach(family => {
		family.models.sort((a, b) => compareSeasons(a.season, b.season));
	});
	const docs = families
		.toSorted((a, b) => {
			if (a.package === b.package) {
				return a.id < b.id ? -1 : 1;
			} else {
				return a.package < b.package ? -1 : 1;
			}
		})
		.map(family => {
			const doc = new Document(family);
			doc.directives.docStart = true;
			return stylize(doc);
		});
	if (docs.length > 0) {
		docs.at(0).directives.docStart = null;
	}
	return docs.map(doc => doc.toString()).join('\n');
}

// # stylize(doc)
// Ensures a consistent style for the documents
function stylize(doc) {
	let seasons = doc.get('models', true);
	for (let season of seasons.items) {
		let keys = ['exemplar', 'model'];
		for (let key of keys) {
			let arr = season.get(key, true);
			if (!arr) continue;
			arr.flow = true;
			for (let item of arr.items) {
				item.format = 'HEX';
			}
		}
	}
	return doc;
}

// # compareSeasons(a, b)
const order = [
	'spring',
	'summer',
	'fall',
	'winter',
	'snow',
	'evergreen',
];
function compareSeasons(a, b) {
	return getSeasonIndex(a) - getSeasonIndex(b);
}

function getSeasonIndex(season) {
	let index = order.indexOf(season);
	if (index === -1) {
		return 1000;
	} else {
		return index;
	}
}
