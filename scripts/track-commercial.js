// # track-commercial.js
import path from 'node:path';
import make from '../lib/generate-matt-pack.js';

const appendix = `
group: mattb325
name: commercial-shared-resources
version: "1.0"
subfolder: 100-props-textures
info:
  summary: Commercial shared resources
  description: A dependency containing a few resources used in \`pkg=mattb325:commercial-pack\`

variants:
  - variant: { nightmode: standard }
    assets:
      - assetId: mattb325-commercial-pack-maxisnite
        include: [ "/Shared Resources/" ]
  - variant: { nightmode: dark }
    assets:
      - assetId: mattb325-commercial-pack-darknite
        include: [ "/Shared Resources/" ]

`;

await make({
	input: '../packs/mattb325.commercial-pack/Commercial',
	output: path.resolve(import.meta.dirname, '../sc4pac/src/yaml/mattb325/commercial-pack.yaml'),
	meta: {
		group: 'mattb325',
		subfolder: '300-commercial',
		version: '1.0',
		info: {
			author: 'mattb325',
			website: 'https://www.sc4evermore.com/index.php/downloads/download/12-commercial/102-sc4d-lex-legacy-mattb325-commercial-pack-darknite',
		},
		variants: [
			{
				variant: { nightmode: 'standard' },
				assets: [{ assetId: 'mattb325-commercial-pack-maxisnite' }],
			},
			{
				variant: { nightmode: 'dark' },
				assets: [{ assetId: 'mattb325-commercial-pack-darknite' }],
			},
		],
	},
	global: {
		name: 'commercial-pack',
		version: '1.0',
		info: {
			summary: 'Commercial Pack',
			description: 'A collection of 75 commercial lots',
			images: [
				'https://www.sc4evermore.com/images/jdownloads/screenshots/UK_DN_lg.jpg',
				'https://www.sc4evermore.com/images/jdownloads/screenshots/McDonalds_lg.jpg',
				'https://www.sc4evermore.com/images/jdownloads/screenshots/DHL_sn.jpg',
			],
		},
	},
	assets: [
		{
			assetId: 'mattb325-commercial-pack-darknite',
			version: '1.0',
			lastModified: '2023-08-20T10:01:46Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=102:sc4d-lex-legacy-mattb325-commercial-pack-darknite&catid=12',
		},
		{
			assetId: 'mattb325-commercial-pack-maxisnite',
			version: '1.0',
			lastModified: '2023-08-20T10:02:34Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=103:sc4d-lex-legacy-mattb325-commercial-pack-maxisnite&catid=12',
		},
	],
	appendix,
});
