// # simmer2.js
export function sm2(json) {
	
	// Polish the description a bit.
	let { description } = json.info;
	if (description) {
		description = description
			.split('\n')
			.filter((line, i) => {
				if (i > 0) return true;
				return !line.trim().match(/^(\*\*)?SM2\s/);
			})
			.map(str => str.trimEnd())
			.join('\n')
			.split(/\n(\*\*)?(no )?dependenc(ies|y)[!.]?(\*\*)?\n/i)
			.at(0)
			.replaceAll('Enjoy\n\n', '')
			.replaceAll(labelRegex, '\n - $<label>: $<value>\n')
			.replaceAll(/(provides|it offers|offser) (?<value>.*?) jobs\.?\n/ig, ' - Provides $<value> jobs\n')
			.replaceAll(/Medium Manufacturing industry\n/g, ' - Medium Manufacturing industry\n')
			.replace(/(?<value>Medium wealth (C\$+|dirty industry))/gi, ' - $<value>')
			.trim()
			.replace(/Simmer2$/, '')
			.trim()
			.replace(/Cheers!$/, '')
			.replace(/^Hello everyone\.?/gi, '')
			.trim()
			.replace(/(\*+)?custom textures included\.?(\*+)?/gi, '')
			.replaceAll(' I made', ' there are')
			.replaceAll('. I made', '. There are')
			.replaceAll('\nI also made', '\nThere are also')
			.replaceAll(/\nNo power or water required\n/gi, '\n - No power or water required\n')
			.replaceAll('This time I bring you', 'This package includes')
			.replaceAll('\\*\\*Bonus', 'Bonus')
			.trim();

		// Make sure that there's only 1 line break in the lists.
		let split = description.split('\n');
		description = split
			.filter((line, i) => {
				let prev = split.at(i-1);
				let next = split.at(i+1);
				if (
					prev.trim().startsWith('- ') &&
					line === '' &&
					next.trim().startsWith('- ')
				) {
					return false;
				}
				return true;
			})
			.join('\n');
		json.info.description = description;
	}

}

const labels = [
	'(growth )?stage',
	'Lots? size',
	'Plop cost',
	'Bulldoze cost',
	'Power? (req|used|generated|consumed|produced)',
	'Water (req|used|generated|consumed|produced)',
	'((transit (- ?))?)capacity',
	'Monthly (maintenance )?(cost|budget)',
	'Cap satisfied',
	'(.*?)Population served',
	'(.*?)Percent reduction',
	'jobs provided',
	'capacity satisfied',
	'freight capacity',
	'monthly maintenance',
	'Maintenance cost',
	'cost to (plop|bulldoze)',
	'life expectancy',
	'passenger capacity',
	'(landmark|park) effect',
	'monthly fee',
	'students capacity',
	'bus budget',
	'school effective radius',
];
const labelRegex = new RegExp(`\n(\\*\\*)?(?<label>${labels.join('|')}) (?<value>.*?)(\\*\\*)?\n`, 'ig');
