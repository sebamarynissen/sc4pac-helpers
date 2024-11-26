// # pasture-flora.js
const arr = [
  'ALN_BlueBonnets-B_1020.dat',
  'ALN_BlueBonnets.dat',
  'ALN_Cat Tails.dat',
  'ALN_Grasses_1060.dat',
  'ALN_Grass_green.dat',
  'ALN_HayBales_1080.dat',
  'ALN_Johnson Grass_1030.dat',
  'ALN_Lillypads.dat',
  'ALN_Marsh.dat',
  'ALN_Medium Scrub Brush.dat',
  'ALN_Pink Wild Flowers-B_1010.dat',
  'ALN_Reed Grass_1038.dat',
  'ALN_Straws_1070.dat',
  'ALN_Stumps.dat',
  'ALN_WeedsA_1050.dat',
  'ALN_WeedsB_1058.dat',
  'ALN_White Wild Flowers.dat',
  'ALN_Yellow Wild Flowers-B_1018.dat',
  'ALN_Yellow Wild Flowers.dat',
];

for (let el of arr) {
	let [, summary] = el
		.split('.')
		.at(0)
		.split('_');
	summary = camelToKebab(summary);
	let name = summary.replaceAll(' ', '-').toLowerCase();
	console.log(`---
group: aln
name: ${name}
version: "2.0"
subfolder: 180-flora
info:
  summary: ${summary}
  author: Chrisadams3997
  website: https://www.sc4evermore.com/index.php/downloads/download/25-flora-fauna-and-mayor-mode-ploppables/167-bsc-aln-rrp-pasture-flora
dependencies:
  - aln:rrp-pasture-flora-props
assets:
  - assetId: aln-rrp-pasture-flora
    include:
      - /${el}
`);
}

function camelToKebab(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1 $2');
}
