import fs from 'node:fs';
import { JSDOM } from 'jsdom';

async function generate(input) {

	// Allow urls to be commented out.
	if (input.startsWith('#')) return;

	let url = new URL(input);
	url.searchParams.delete('confirm');
	url.searchParams.delete('t');
	url.searchParams.delete('csrfKey');
	let offset = +(url.searchParams.get('offset') || -1);
	let version = +(url.searchParams.get('version') || 40);
	url.searchParams.delete('offset');
	let year = url.searchParams.get('year') || '19XX';
	let where = url.searchParams.get('where') || 'Manhattan';

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
	let corner = url.searchParams.has('corner');

	let tileset = text.includes('Chicago') ? 'the New York and Chicago tilesets' : 'the New York tile set';
	let wealth = text.includes('R$$$') ? 'R$$ and R$$$' : 'R$ and R$$';

	let output = `group: aaron-graham
name: ${id}
version: "1.0"
subfolder: 200-residential
info:
  summary: ${summary}
  description: >
    ${where === 'fictional' ? `${summary} is a fictitious apartment inspired by New York City.` : `${summary} is a ${year} X story apartment located in ${where}, New York City.`}
    The building grows as ${wealth} on ${tileset}.
    ${corner ? 'It is a (W2W) wall to wall corner building and will fit perfectly on the end of your city block.' : 'It is a (W2W) wall to wall building and will fit perfectly in the middle of your city block.' }
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
  version: "${version}"
`;
	if (hasMaxisNight) output += `
---
assetId: aaron-graham-${id}-maxisnite
version: "1.0"
lastModified: "${modified}"
url: ${next}
archiveType:
  format: Clickteam
  version: "${version}"
`;

	let filePath = `sc4pac/src/yaml/aaron-graham/${id}.yaml`;
	fs.writeFileSync(filePath, output);

}

let urls = `
# https://community.simtropolis.com/files/file/30167-nybt-2639-and-2641-jerome-avenue/?do=download&r=148489&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&version=35
# https://community.simtropolis.com/files/file/30118-nybt-barton-paul/?do=download&r=147472&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&version=40
# https://community.simtropolis.com/files/file/29835-nybt-25-e-193-street/?do=download&r=140597&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/29147-aronic-place/?do=download&r=122091&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/29076-nybt-655-e-228-street/?do=download&r=121140&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/29031-nybt-townsley/?do=download&r=120762&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/28949-nybt-1225-morris-avenue/?do=download&r=120960&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/28900-nybt-dover-house/?do=download&r=120750&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/28818-nybt-32-48-30th-street/?do=download&r=116815&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/28741-nybt-785-park-avenue/?do=download&r=115636&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/28649-nybt-201-e-19-street/?do=download&r=114199&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/28572-nybt-30-e-81-street/?do=download&r=113248&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&corner=true
# https://community.simtropolis.com/files/file/28414-nybt-hattan-house/?do=download&r=111371&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&corner=true
# https://community.simtropolis.com/files/file/28340-nybt-915-west-end-avenue/?do=download&r=115416&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&corner=true
# https://community.simtropolis.com/files/file/28321-nybt-walesbridge/?do=download&r=110163&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1
# https://community.simtropolis.com/files/file/28152-worthington-apartments/?do=download&r=108055&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&corner=true
# https://community.simtropolis.com/files/file/28083-nybt-605-park-avenue/?do=download&r=108025&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&year=1952
# https://community.simtropolis.com/files/file/27913-nybt-41-park-avenue/?do=download&r=109903&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&year=1950&corner=true
# https://community.simtropolis.com/files/file/27493-eyrene-apartments/?do=download&r=107880&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&where=fictional
# https://community.simtropolis.com/files/file/27463-johnson-apartments/?do=download&r=99612&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&where=fictional
# https://community.simtropolis.com/files/file/27204-hogan-apartments/?do=download&r=96260&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&where=fictional
# https://community.simtropolis.com/files/file/27149-franklin-apartments/?do=download&r=95755&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&where=fictional&corner=true
# https://community.simtropolis.com/files/file/27123-graham-apartments/?do=download&r=95720&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&where=fictional&corner=true
# https://community.simtropolis.com/files/file/27036-nybt-concord-arms/?do=download&r=95448&confirm=1&t=1&csrfKey=c13d4da7be09f234b9fd0ae232f5bca1&corner=true&where=The%20Bronx
`;

for (let url of urls.trim().split('\n')) {
	await generate(url.trim());
}
