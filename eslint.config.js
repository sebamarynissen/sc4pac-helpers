import wh from '@whisthub/eslint-config/flat';

export default [
	wh,
	{
		files: ["lib/data.js", "lib/data/**"],
		rules: {
			"sort-keys": ["error", "asc", { "natural": true }],
			"quotes": "off",
		},
	},
];
