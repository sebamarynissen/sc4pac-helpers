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
			.join('\n')
			.split(/(\*\*)?(no )?dependencies(!\.)?(\*\*)?\n/i)
			.at(0)
			.replaceAll('Enjoy\n\n', '')
			.replaceAll(/\n(?<label>(growth )?stage|Lots? size|Plop cost|Bulldoze cost|Power? (req|used|generated)|Water (req|used)|((transit (- ?))?)capacity|Monthly (maintenance )?(cost|budget)|Cap satisfied|(.*?)Population served|(.*?)Percent reduction|jobs provided|capacity satisfied|monthly maintenance) (?<value>.*)\n/ig, '\n - $<label>: $<value>\n')
			.replaceAll(/(provides|it offers|offser) (?<value>.*?) jobs\.?\n/ig, ' - Provides $<value> jobs\n')
			.replaceAll(/Medium Manufacturing industry\n/g, ' - Medium Manufacturing industry\n')
			.trim()
			.replace(/Simmer2$/, '')
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
