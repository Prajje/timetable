import { readFileSync, writeFileSync } from 'node:fs';

const INDEX = new URL('../index.html', import.meta.url);
let html = readFileSync(INDEX, 'utf8');

let bumped = 0;
html = html.replace(/(\.(css|js))\?v=(\d+)/g, (_, ext, _ext, n) => {
  bumped++;
  return `${ext}?v=${Number(n) + 1}`;
});

if (!bumped) {
  console.error('No ?v=N markers found in index.html — nothing to bump.');
  process.exit(1);
}

writeFileSync(INDEX, html);
console.log(`Bumped ${bumped} cache-bust marker${bumped === 1 ? '' : 's'} in index.html`);
