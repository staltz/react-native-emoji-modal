const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const pick = require('just-pick');
const sortBy = require('just-sort-by');
const pkg = require(path.join(__dirname, '../package.json'));

const VERSION = pkg.devDependencies['emoji-datasource'];
const URL = `https://github.com/iamcal/emoji-data/raw/v${VERSION}/emoji.json`;
const OUTPUT_FILE = path.join(__dirname, '../emoji.json');

(async function main() {
  const response = await fetch(URL);
  const allEmojis = await response.json();

  const sortedEmojis = sortBy(allEmojis, 'sort_order');

  const liteAndSortedEmojis = sortedEmojis.map((emoji) =>
    pick(emoji, ['category', 'unified', 'short_name', 'added_in']),
  );

  const fileContents = JSON.stringify(liteAndSortedEmojis);

  await fs.promises.writeFile(OUTPUT_FILE, fileContents, {encoding: 'utf-8'});
})();
