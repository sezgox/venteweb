const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
const { PrismaClient } = require('../generated/prisma');

const p = new PrismaClient();
const EVENT = 'rating-qa-evt-finished-1';
const EMAIL = 'segtox@gmail.com';

(async () => {
  const events = await p.event.findMany({
    where: { id: { startsWith: 'rating-qa-evt' } },
    select: { id: true, name: true, endDate: true },
  });
  const segtox = await p.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true, username: true },
  });
  const part = segtox
    ? await p.participation.findUnique({
        where: { userId_eventId: { userId: segtox.id, eventId: EVENT } },
        include: { event: { select: { name: true } } },
      })
    : null;

  const testUsers = await p.user.findMany({
    where: {
      email: {
        in: [
          'ratingqa.org@vente.test',
          'ratingqa.p1@vente.test',
          'ratingqa.stranger@vente.test',
        ],
      },
    },
    select: { email: true, username: true },
  });

  console.log('QA events:', JSON.stringify(events, null, 2));
  console.log('Seed test users:', JSON.stringify(testUsers, null, 2));
  console.log('segtox user:', segtox);
  console.log('segtox participation on rating-qa-evt-finished-1:', part);
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
