const fs = require('fs');
const path = require('path');
const pick = require('just-pick');
const sortBy = require('just-sort-by');
const allEmojis = require('emoji-datasource/emoji.json');

const OUTPUT_FILE = path.join(__dirname, '../emoji.json');

(async function main() {
  const sortedEmojis = sortBy(allEmojis, 'sort_order');

  const liteAndSortedEmojis = sortedEmojis.map((emoji) =>
    pick(emoji, ['category', 'unified', 'short_name', 'added_in']),
  );

  const fileContents = JSON.stringify(liteAndSortedEmojis);

  await fs.promises.writeFile(OUTPUT_FILE, fileContents, {encoding: 'utf-8'});
})();
