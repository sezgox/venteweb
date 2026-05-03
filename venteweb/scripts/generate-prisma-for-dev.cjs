const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const result = spawnSync('npx', ['prisma', 'generate'], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status === 0) {
  process.exit(0);
}

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const generatedClient = path.join(__dirname, '..', 'generated', 'prisma', 'client.js');

if (output.includes('EPERM') && fs.existsSync(generatedClient)) {
  console.warn(
    '[generate-prisma-for-dev] Prisma generate hit a Windows file lock, using the existing generated client.',
  );
  process.exit(0);
}

process.exit(result.status ?? 1);
