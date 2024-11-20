import chalk from 'chalk';
import DependencyTracker from '../lib/dependency-tracker.js';

const tracker = new DependencyTracker();
const sources = process.argv.slice(2);
const result = await tracker.track(sources);
result.dump();
// deps.forEach(dep => console.log(chalk.cyan(dep)));
