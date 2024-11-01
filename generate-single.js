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

	let hasMaxisNight = !!url.searchParams.get('r');

	let output = `group: diego-del-llano
name: ${id}
version: 1.0.0
subfolder: 300-commercial
info:
  summary: ${id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
  description: >
${text}

  author: Diego Del Llano
  website: ${link}

dependencies: ["simfox:day-and-nite-mod"]
assets:
  - assetId: diego-del-llano-${id}

---
assetId: diego-del-llano-${id}
version: 1.0.0
lastModified: "${modified}"
url: ${url}
`;

	fs.writeFileSync(`src/yaml/diego-del-llano/${id}.yaml`, output);

}

let urls = `
https://community.simtropolis.com/files/file/30991-olympia-centre/?do=download
https://community.simtropolis.com/files/file/30985-wells-fargo-center-denver/?do=download
https://community.simtropolis.com/files/file/30984-centurylink-tower-denver-1801-california-street/?do=download
https://community.simtropolis.com/files/file/30972-fiestamericana-guadalajara/?do=download
https://community.simtropolis.com/files/file/30964-denver-art-museum-frederic-c-hamilton-building/?do=download
https://community.simtropolis.com/files/file/30952-john-hancock-center/?do=download
https://community.simtropolis.com/files/file/30946-oneamerica-tower-indianapolis/?do=download
`;

for (let url of urls.trim().split('\n')) {
	await generate(url.trim());
}
