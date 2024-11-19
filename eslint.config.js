import wh from '@whisthub/eslint-config/flat';

export default [
	wh,
	{
		files: ["lib/data.js"],
		rules: {
			"sort-keys": ["error", "asc", { "natural": true }],
		},
	},
];
