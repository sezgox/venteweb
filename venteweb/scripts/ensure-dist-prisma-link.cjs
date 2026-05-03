/**
 * Compiled files under dist/src do `require("../../../generated/prisma/...")` (depth varies),
 * which resolves to dist/generated/prisma. That path must exist at runtime.
 * Link dist/generated/prisma -> <repo>/generated/prisma (Windows: junction) so we do not copy files.
 * Run: before nest start, after nest build. Requires: npx prisma generate
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'generated', 'prisma');
const linkPath = path.join(root, 'dist', 'generated', 'prisma');

if (!fs.existsSync(path.join(source, 'index.js'))) {
  console.error('ensure-dist-prisma-link: missing generated client. Run: npx prisma generate');
  process.exit(1);
}

fs.mkdirSync(path.dirname(linkPath), { recursive: true });
const absSource = path.resolve(source);

if (fs.existsSync(path.join(linkPath, 'index.js'))) {
  try {
    if (fs.realpathSync.native(linkPath) === absSource) {
      process.exit(0);
    }
  } catch (_) {
    /* continue: replace with correct link */
  }
}

if (fs.existsSync(linkPath)) {
  try {
    fs.rmSync(linkPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (err) {
    if (fs.existsSync(path.join(linkPath, 'index.js'))) {
      console.warn(
        'ensure-dist-prisma-link: could not replace dist/generated/prisma (files in use). Using existing copy. Stop the API and run npm run clean:dist if you need a fresh link.',
      );
      process.exit(0);
    }
    console.warn('ensure-dist-prisma-link: could not remove (will try merge copy):', err && err.message);
    try {
      fs.cpSync(absSource, linkPath, { recursive: true, force: true });
      console.log('ensure-dist-prisma-link: merged Prisma client into', linkPath);
    } catch (cpErr) {
      console.error('ensure-dist-prisma-link: merge copy failed', cpErr && cpErr.message);
      process.exit(1);
    }
    process.exit(0);
  }
}

try {
  if (process.platform === 'win32') {
    fs.symlinkSync(absSource, linkPath, 'junction');
  } else {
    fs.symlinkSync(absSource, linkPath, 'dir');
  }
} catch (err) {
  console.error('ensure-dist-prisma-link: failed to create link', err && err.message);
  process.exit(1);
}
