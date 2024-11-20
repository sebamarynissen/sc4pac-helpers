import chalk from 'chalk';
import track from '../lib/track.js';

const deps = await track(process.argv[2]);
deps.forEach(dep => console.log(chalk.cyan(dep)));
