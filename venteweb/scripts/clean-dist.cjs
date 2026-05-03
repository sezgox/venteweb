/**
 * Remove venteweb/dist (stop `npm run start:dev` / any node using the API first).
 * Use after Prisma/client path changes or when you need a fully clean `nest build`.
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '../dist');
if (!fs.existsSync(dist)) {
  console.log('clean-dist: nothing to remove (no dist/).');
  process.exit(0);
}
try {
  fs.rmSync(dist, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log('clean-dist: removed', dist);
} catch (e) {
  console.error(
    'clean-dist: could not remove dist/ (files in use). Stop the Nest process and any node using venteweb, then retry.\n',
    e.message,
  );
  process.exit(1);
}
