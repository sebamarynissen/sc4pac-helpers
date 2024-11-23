// # jasoncw.js
// If we're dealing with jasoncw and a CAMelot, we have to add exclude 
// patterns to the cam versions.
export function jasoncw(json) {
	for (let variant of json.variants || []) {
		if (variant.variant.CAM === 'yes') {
			variant.assets[0].exclude = [
				'/.*Grow.*.SC4Lot',
			];
		}
	}

	// Jasoncw sometimes includes information about MaxisNite and Darknite in 
	// the description, this is not needed.
	const { description } = json.info;
	if (description) {
		json.info.description = description
			.split('\n')
			.filter(line => {
				let trimmed = line.trim().toLowerCase();
				if (trimmed.startsWith('- ')) {
					if (trimmed.includes('darknite')) return false;
					if (trimmed.includes('maxisnite')) return false;
					if (trimmed.includes('cam version included')) return false;
					if (trimmed.includes('mipro essentials')) return false;
				}
				if (trimmed.includes('20 years')) return false;
				if (trimmed.includes('january 14')) return false;
				return true;
			})
			.join('\n')
			.split(/installation instructions/i)
			.at(0)
			.trim()
			.replaceAll(/\n\n+/g, '\n\n');
	}

}
