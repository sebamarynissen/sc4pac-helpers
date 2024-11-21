import DependencyTracker from '../lib/dependency-tracker.js';

const tracker = new DependencyTracker();
const sources = process.argv.slice(2);
const result = await tracker.track(sources);
result.dump();
