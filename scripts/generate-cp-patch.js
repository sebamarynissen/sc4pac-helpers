// # generate-girafe-patch.js
import path from 'node:path';
import generate from '../lib/generate-tree-patch.js';

await generate('*', {
	cwd: path.resolve(import.meta.dirname, '../packages/Endless summer'),
	name: 'everseasonal_cycledogg',
});
