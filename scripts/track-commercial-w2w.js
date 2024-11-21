// # track-commercial-w2w.js
import path from 'node:path';
import make from '../lib/generate-matt-pack.js';

const appendix = `
---
group: mattb325
name: post-office-models
version: "1.1"
subfolder: 100-props-textures
info:
  summary: Post office models
  description: A dependency containing a few post model offices used in \`pkg=mattb325:commercial-w2w-pack\`

variants:
  - variant: { nightmode: standard }
    assets:
      - assetId: mattb325-commercial-w2w-pack-maxisnite
        include: [ "/Shared Resources/" ]
  - variant: { nightmode: dark }
    assets:
      - assetId: mattb325-commercial-w2w-pack-darknite
        include: [ "/Shared Resources/" ]

`;

await make({
	input: '../packs/mattb325.commercial-w2w-pack/Commercial W2W',
	output: path.resolve(import.meta.dirname, '../sc4pac/src/yaml/mattb325/commercial-w2w-pack.yaml'),
	meta: {
		group: 'mattb325',
		subfolder: '300-commercial',
		version: '1.1',
		info: {
			author: 'mattb325',
			website: 'https://www.sc4evermore.com/index.php/downloads/download/12-commercial/104-sc4d-lex-legacy-mattb325-commercial-w2w-pack-darknite',
		},
		variants: [
			{
				variant: { nightmode: 'standard' },
				assets: [{ assetId: 'mattb325-commercial-w2w-pack-maxisnite' }],
			},
			{
				variant: { nightmode: 'dark' },
				assets: [{ assetId: 'mattb325-commercial-w2w-pack-darknite' }],
			},
		],
	},
	global: {
		name: 'commercial-w2w-pack',
		version: '1.1',
		info: {
			summary: 'Commercial W2W Pack',
			description: 'A collection of 41 commercial W2W lots',
			images: [
				'https://www.sc4evermore.com/images/jdownloads/screenshots/thumbnails/Amestoy_lg.jpg',
				'https://www.sc4evermore.com/images/jdownloads/screenshots/thumbnails/ImmoderateCur_s.jpg',
				'https://www.sc4evermore.com/images/jdownloads/screenshots/thumbnails/PWN_lg.jpg',
			],
		},
	},
	assets: [
		{
			assetId: 'mattb325-commercial-w2w-pack-darknite',
			version: '1.1',
			lastModified: '2023-08-20T10:04:31Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=104:sc4d-lex-legacy-mattb325-commercial-w2w-pack-darknite&catid=12',
		},
		{
			assetId: 'mattb325-commercial-w2w-pack-maxisnite',
			version: '1.1',
			lastModified: '2023-08-20T10:05:00Z',
			url: 'https://www.sc4evermore.com/index.php/downloads?task=download.send&id=105:sc4d-lex-legacy-mattb325-commercial-w2w-pack-maxisnite&catid=12',
		},
	],
	appendix,
});
