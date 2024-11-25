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
			.split(/(\*\*)?(no )?dependencies(\*\*)?\n\n/i)
			.at(0)
			.replaceAll('Enjoy\n\n', '')
			.replace(/\nStage (\d)/, ' - Growth stage: $1')
			.replaceAll(/(Lot size|Plop cost|Bulldoze cost|Power req|Water req|Monthly maintenance cost) (.*)\n/g, ' - $1: $2\n')
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
