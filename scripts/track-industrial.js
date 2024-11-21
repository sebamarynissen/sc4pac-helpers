// # track-industrial.js
import path from 'node:path';
import make from '../lib/generate-matt-pack.js';

const appendix = `
group: mattb325
name: industrial-pack-shared-resources
version: "1.0"
subfolder: 100-props-textures
info:
  summary: Industrial pack shared resources
  description: A dependency containing a few resources used in \`pkg=mattb325:industrial-pack\`

variants:
  - variant: { nightmode: standard }
    assets:
      - assetId: mattb325-industrial-pack-maxisnite
        include: [ "/Shared Resources/" ]
  - variant: { nightmode: dark }
    assets:
      - assetId: mattb325-industrial-pack-darknite
        include: [ "/Shared Resources/" ]

`;

await make({
	input: '../packs/mattb325.industrial-pack/Industrial',
	output: path.resolve(import.meta.dirname, '../sc4pac/src/yaml/mattb325/industrial-pack.yaml'),
	meta: {
		group: 'mattb325',
		subfolder: '400-industrial',
		version: '2',
		info: {
			author: 'mattb325',
			website: 'https://www.sc4evermore.com/index.php/downloads/download/13-industrial/114-sc4d-lex-legacy-mattb325-industrial-pack-dark-nite',
		},
		variants: [
			{
				variant: { nightmode: 'standard' },
				assets: [{ assetId: 'mattb325-industrial-pack-maxisnite' }],
			},
			{
				variant: { nightmode: 'dark' },
				assets: [{ assetId: 'mattb325-industrial-pack-darknite' }],
			},
		],
	},
	global: {
		name: 'industrial-pack',
		version: '1.0',
		info: {
			summary: 'Industrial Pack',
			description: 'A collection of 23 industrial lots',
		},
	},
	assets: [
		{
			assetId: 'mattb325-industrial-pack-darknite',
			version: '2',
			lastModified: '2023-08-21T11:21:24.000Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=114:sc4d-lex-legacy-mattb325-industrial-pack-dark-nite&catid=13',
		},
		{
			assetId: 'mattb325-industrial-pack-maxisnite',
			version: '2',
			lastModified: '2023-08-20T09:40:24.000Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=115:sc4d-lex-legacy-mattb325-industrial-pack-maxis-nite&catid=13',
		},
	],
	appendix,
});
