// # rretail.js
export function rretail(json) {
	let { description } = json.info;
	if (description) {
		description = description
			.split('\n')
			.map(line => line.trimEnd())
			.join('\n')
			.split(/\n\n(\*\*)?dependencies:(\*\*)?\n/i)
			.at(0);
		json.info.description = description;
	}
}
