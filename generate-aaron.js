import fs from 'node:fs';
import { JSDOM } from 'jsdom';

async function generate(input) {

	let url = new URL(input);
	url.searchParams.delete('confirm');
	url.searchParams.delete('t');
	url.searchParams.delete('csrfKey');
	let offset = +(url.searchParams.get('offset') || 1);
	url.searchParams.delete('offset');

	let next = new URL(url);
	next.searchParams.set('r', +url.searchParams.get('r')+offset);

	let link = new URL(url+'');
	for (let key of [...link.searchParams.keys()]) {
		link.searchParams.delete(key);
	}
	link = String(link);

	let html = await fetch(link).then(res => res.text());
	let jsdom = new JSDOM(html);
	let h2 = [...jsdom.window.document.querySelectorAll('h2')].find(node => node.textContent.toLowerCase().includes('about this file'));
	let text = [...h2.nextElementSibling.querySelectorAll('div > p')]
		.filter(p => {
			if (p.textContent.includes('notice')) return false;
			if (p.textContent.includes('File content')) return false;
			return true;
		})
		.slice(0, 2)
		.map(p => p.textContent.trim())
		.map(p => p.replaceAll('\u00a0', ' '))
		.filter(Boolean)
		.map(p => {
			return '    ' + p.split('. ').join('.\n    ');
		})
		.join('\n\n');

	let updated = [...jsdom.window.document.querySelectorAll('time')].find(time => {
		return time.parentElement?.previousElementSibling?.textContent.includes('Updated');
	}) || [...jsdom.window.document.querySelectorAll('time')].find(time => {
		return time.parentElement?.previousElementSibling?.textContent.includes('Submitted');
	});
	let modified = updated.getAttribute('datetime');

	let path = link.replace(/\/$/, '').split('/').at(-1);
	const regex = /[\d+]-(.*)/;
	let [, id] = path.match(regex);
	id = id.replace('nybt-', '');

	let hasMaxisNight = !!url.searchParams.get('r');
	let summary = jsdom.window.document.querySelector('title').textContent.split('-')[0].replace('NYBT ', '').trim();

	let output = `group: aaron-graham
name: ${id}
version: "1.0"
subfolder: 200-residential
info:
  summary: ${summary}
  description: >
${summary} is a ... in New York City.
The building grows as R$$ and R$$ on the New York tile set.
It is a (W2W) wall to wall building and will fit perfectly in the middle of your city block.

  author: Aaron Graham
  website: ${link}

dependencies: ["nybt:essentials"]
variants:
  - variant: { nightmode: dark }
    dependencies: ["simfox:day-and-nite-mod"]
    assets:
      - assetId: aaron-graham-${id}-darknite
`;
	if (hasMaxisNight) output += `  - variant: { nightmode: standard }
    assets:
      - assetId: aaron-graham-${id}-maxisnite
`;

	output += `
---
assetId: aaron-graham-${id}-darknite
version: "1.0"
lastModified: "${modified}"
url: ${url}
archiveType:
  format: Clickteam
  version: "35"
`;
	if (hasMaxisNight) output += `
---
assetId: aaron-graham-${id}-maxisnite
version: "1.0"
lastModified: "${modified}"
url: ${next}
archiveType:
  format: Clickteam
  version: "35"
`;

	fs.writeFileSync(`sc4pac/src/yaml/aaron-graham/${id}.yaml`, output);

}

let urls = `
https://community.simtropolis.com/files/file/30118-nybt-barton-paul/?do=download&r=147472&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&offset=-1
`;

for (let url of urls.trim().split('\n')) {
	await generate(url.trim());
}
