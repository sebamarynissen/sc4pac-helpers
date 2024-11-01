// # get-versions.js
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { JSDOM } from 'jsdom';

let dir = path.join(import.meta.dirname, './src/yaml/diego-del-llano');
let tasks = fs.readdirSync(dir).map(async filename => {
  let fullPath = path.join(dir, filename);
  let buffer = fs.readFileSync(fullPath).toString('utf8');
  let parsed = yaml.parse(buffer.split('---')[0]);
  let { website } = parsed.info;
  if (!website.endsWith('/')) return;

  let html = await fetch(website).then(res => res.text());
  let jsdom = new JSDOM(html);
  let version = jsdom.window.document.querySelector('.stex-title-version').textContent;
  if (version !== parsed.version) {
    console.log('changing '+website);
    buffer = buffer.replaceAll(/version: [\d\.]+/g, `version: "${version}"`);
    console.log(buffer);
    fs.writeFileSync(fullPath, buffer);
  }
});
await Promise.all(tasks);
