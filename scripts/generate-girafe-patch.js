// # generate-girafe-patch.js
import path from 'node:path';
import fs from 'node:fs';
import { DBPF, FileType } from 'sc4/core';
import generate from '../lib/generate-tree-patch.js';
import TreeDatabase from '../lib/tree-database.js';
import { getCompressionInfo } from 'sc4/utils';

fs.rmSync(String.raw`C:\Users\sebam\Documents\SimCity 4\Plugins\849-my-overrides\smf_16.everseasonal-flora`, {
	recursive: true,
	force: true,
});

const cwd = path.resolve(import.meta.dirname, '../packages/Girafe');
const opts = {
	cwd,
	// seasons: ['summer'],
	// labels: true,
};

const db = new TreeDatabase();
await db.load();

// Evergreen flora that does not need to be patched.
const evergreens = [
	'girafe:canary-date-palms',
	'girafe:cypresses',
	'girafe:parasol-pines',
];

// For certain packages, we have to exclude patching the props because they 
// can't be easily patched - meaning there's no 4 different timed props to 
// simulate a season.
const excludeProps = [
	'girafe:wheat',
	'girafe:sparaxis',
];

await generate([
	'girafe:*',
	'orange:*',
], {
	...opts,
	filter({ entry, pkg, type }) {
		let { file } = entry.dbpf;

		// If this is a winter coniferous tree, then we leave it untouched as 
		// they shouldn't be affected.
		if (file.match(/winter/i)) return false;

		// Ignore evergreen packages.
		if (evergreens.includes(pkg)) return false;

		// For sparaxis and wheat, we exclude patching the props.
		// For the girafe:sparaxis package, we exclude patching the props.
		if (type === 'prop' && excludeProps.includes(pkg)) {
			return false;
		}
		return true;
	},
	labels: true,
});

// Handle mgb204:mmp-pack-vol2 which adds some of Girafes props as flora as 
// well.
await generate('mgb204:mmp-pack-vol2', {
	...opts,
	filter({ exemplar }) {

		// Exclude some evergreen trees.
		const name = exemplar.get('ExemplarName');
		if (name.match(/parasol_pine/)) {
			return false;
		}
		return true;
	},
	labels: true,
});

// Handle t-wrecks:maxis-tree-hd-replacement-mod. Note that this one is a bit 
// more complicated because it also includes rescaled models that rely on the 
// original *textures*. In that case, the model instance looks like 0x10030000 
// instead of 0x00030000, so we filter those out as no model will be found in 
// the database.
const patches = await generate('t-wrecks:maxis-tree-hd-replacement-mod', {
	...opts,
	filter({ exemplar }) {
		const name = exemplar.get('ExemplarName');
		return !name.match(/Palm|_palm_/);
	},
});

// Read in the 3D models form T-Wreck's patch. We'll have to add them to the 
// patch under a different tgi - more specifically a different *group*.
const dbpf = new DBPF(path.join(cwd, '180-flora/t-wrecks.maxis-tree-hd-replacement-mod.1.0.1.sc4pac/Maxis Tree HD Replacement.dat'));
for (let entry of dbpf.findAll({ type: FileType.S3D })) {
	const [type, group, instance] = entry.tgi;
	const model = [group, 0x10030000];
	const raw = entry.readRaw();
	const { compressed } = getCompressionInfo(raw);
	const [family] = db.findMatchingFamilies({
		model,
		type: 'prop',
		pkg: 't-wrecks:maxis-tree-hd-replacement-mod',
	});
	// If the family was not found, we're dealing with a non-seasonal tree (
	// i.e. the palms).
	if (!family) continue;
	const { seasons = ['summer', 'fall', 'winter', 'snow', 'spring'] } = opts;
	for (let season of seasons) {
		const [newGroup] = db.findSeasonModelFromFamily(family, season);
		// If the group hasn't changed, no need to do anything. This is the 
		// case for summer and spring normally, and for the palms.
		if (group === newGroup) continue;
		const { dbpf } = patches.find(patch => patch.season === season);
		dbpf.add({
			type,
			group: newGroup,
			instance,
		}, raw, { compressed });
	}
}
for (const { dbpf, fullPath } of patches) {
	await dbpf.save(fullPath);
}

// Generate a patch for the rural pack
await generate('vip:rural-pack', {
	...opts,
	filter({ exemplar }) {
		const type = exemplar.get('ExemplarType');
		const name = exemplar.get('ExemplarName');
		if (name.includes('Tree')) return true;
		if (name.match(/_(winter|hivers?|spring|summer|fall|autumn|ete)/i)) {
			return true;
		}

		// Some flora is seasonal, but isn't tagged as such.
		if (type === 0x0f) {
			if (name.match(/^VIP_RP-FL_Or_Narcissus\d+/)) return true;
			if (name.match(/^VV_TSC_ploppable_Fougere\d+/)) return true;
			if (name.match(/^R6_VIP_Iris des Marais\d+/)) return true;
			if (name.match(/^Or_VIP_Populus\d+/)) return true;
			if (name.match(/^Or_VIP_Corylus\d+/)) return true;
			if (name.match(/^VV_VIP_ploppable_Genet\d+/)) return true;
		}
		return false;
	},
	choose(families, { exemplar }) {
		const name = exemplar.get('ExemplarName');
		const match = name.match(/_Narcissus(\d+)/);
		if (match) {
			const nr = match[1];
			return families.find(({ id }) => id.includes(`narcissus${nr}`));
		}
	},
});

// Generate a patch for 11241036:vip-trees-as-props as well. In this case, we 
// only need to handle the Aesculus and Fagus, as those are the only seasonal 
// ones.
await generate('11241036:vip-trees-as-props', {
	...opts,
	filter({ exemplar }) {
		const name = exemplar.get('ExemplarName');
		if (name.match(/PinusNigra/)) return false;
		return true;
	},
});

// Generate a patch for cycledogg's trees as well.
const exclude = new Set([
	'CPDecid2NewFlat10x10x10_evergreen',
	'CP_PlanterBed8x4_SHADED_Ortho_Brick_E_ShrubEvergreen',
	'CP_PlanterBed4x4_SHADED_Diag_Brick_E_ShrubEvergreen',
	'CP_PlanterBed4x4_SHADED_Diag_Conc_E_ShrubEvergreen',
	'CP_SHADED_SparseDeciduousTree_Summer',
	'CP_SHADED_TreeForked_Summer',
	'CP_SHADED_TreeWeeping_Summer',
]);
await generate('bsc:mega-props-cp-vol0*', {
	...opts,
	filter({ exemplar }) {
		const name = exemplar.get('ExemplarName');
		if (name.match(/Vehicle/)) return false;
		if (exclude.has(name)) return false;

		// Some flowers that use shared models (probably for spring) need to be 
		// excluded.
		if (name.match(/mjb(Shrub|Flower)/)) return false;
		if (name.match(/saguaro/i)) return false;
		if (name.match(/^SummerOnly/)) return false;
		if (!exemplar.get('ResourceKeyType4')) return false;
		if (name.match(/(fall|spring|summer|winter|semiseasonal|evergreen)/i)) {
			return true;
		}
		return false;
	},
});

// Generate a patch for the CETC as well. Note that we need to generate a patch 
// for both the seasonal as evergreen variants, but for the vergreen variants 
// we only need 1.
await generate('11241036:central-european-tree-controller', {
	...opts,
});
