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
				let trimmed = line.trim();
				if (trimmed.startsWith('- ')) {
					if (trimmed.includes('DarkNite')) return false;
					if (trimmed.includes('MaxisNite')) return false;
					if (trimmed.includes('CAM version included')) return false;
				}
				return true;
			})
			.join('\n')
			.split(/installation instructions/i)
			.at(0)
			.trim();
	}

}
