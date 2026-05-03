"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const prisma_1 = require("../generated/prisma");
function loadEnvFile() {
    const p = path.join(__dirname, '../.env');
    if (!fs.existsSync(p))
        return;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#'))
            continue;
        const i = t.indexOf('=');
        if (i === -1)
            continue;
        const k = t.slice(0, i).trim();
        let v = t.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
        }
        if (process.env[k] === undefined)
            process.env[k] = v;
    }
}
loadEnvFile();
const prisma = new prisma_1.PrismaClient();
const SEED_PASSWORD = 'RatingQA_Seed_2026!';
const EVENT_FINISHED_1 = 'rating-qa-evt-finished-1';
const EVENT_FINISHED_2 = 'rating-qa-evt-finished-2';
const EVENT_FUTURE_1 = 'rating-qa-evt-future-1';
const USERS = {
    org: {
        email: 'ratingqa.org@vente.test',
        username: 'ratingqa_org',
        name: 'Rating QA Org',
    },
    p1: {
        email: 'ratingqa.p1@vente.test',
        username: 'ratingqa_p1',
        name: 'Rating QA Participant',
    },
    stranger: {
        email: 'ratingqa.stranger@vente.test',
        username: 'ratingqa_stranger',
        name: 'Rating QA Stranger',
    },
};
const SEGTOX_EMAIL = 'segtox@gmail.com';
async function main() {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    async function upsertSeedUser(u) {
        const existing = (await prisma.user.findUnique({ where: { email: u.email } })) ??
            (await prisma.user.findUnique({ where: { username: u.username } }));
        const data = {
            email: u.email,
            username: u.username,
            name: u.name,
            password: passwordHash,
            active: true,
            activatedAt: new Date(),
        };
        const row = existing
            ? await prisma.user.update({ where: { id: existing.id }, data })
            : await prisma.user.create({ data });
        return { id: row.id, email: row.email };
    }
    const org = await upsertSeedUser(USERS.org);
    const p1 = await upsertSeedUser(USERS.p1);
    const stranger = await upsertSeedUser(USERS.stranger);
    const segtox = await prisma.user.findUnique({
        where: { email: SEGTOX_EMAIL },
    });
    if (!segtox) {
        console.warn(`[seed-rating-qa] User ${SEGTOX_EMAIL} not found — add them manually, then re-run, or create account in app first.`);
    }
    const endPast = new Date();
    endPast.setDate(endPast.getDate() - 1);
    endPast.setHours(12, 0, 0, 0);
    const startPast = new Date(endPast);
    startPast.setDate(startPast.getDate() - 1);
    const startFuture = new Date();
    startFuture.setDate(startFuture.getDate() + 1);
    const endFuture = new Date();
    endFuture.setDate(endFuture.getDate() + 7);
    const eventIds = [EVENT_FINISHED_1, EVENT_FINISHED_2, EVENT_FUTURE_1];
    await prisma.rating.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.participation.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    const baseEvent = (id, name, start, end) => ({
        id,
        organizerId: org.id,
        name,
        description: 'Rating QA seed event (public). ' + name,
        categories: [prisma_1.Category.Meetup],
        visibility: prisma_1.Visibility.Public,
        lat: 40.4168,
        lng: -3.7038,
        location: 'Madrid (QA seed)',
        startDate: start,
        endDate: end,
        requiresRequest: false,
        maxAttendees: 100,
        maxCollaborators: 10,
        totalRate: null,
        ratingCount: 0,
        tags: ['rating-qa', 'seed'],
        language: 'en',
        allowPosts: true,
    });
    await prisma.event.create({
        data: baseEvent(EVENT_FINISHED_1, 'QA Rating — Finished (segtox + p1)', startPast, endPast),
    });
    await prisma.event.create({
        data: baseEvent(EVENT_FINISHED_2, 'QA Rating — Finished (p1 only)', startPast, endPast),
    });
    await prisma.event.create({
        data: baseEvent(EVENT_FUTURE_1, 'QA Rating — Not finished yet', startFuture, endFuture),
    });
    await prisma.participation.create({
        data: {
            userId: p1.id,
            eventId: EVENT_FINISHED_1,
            type: prisma_1.ParticipationType.Attendance,
        },
    });
    if (segtox) {
        await prisma.participation.create({
            data: {
                userId: segtox.id,
                eventId: EVENT_FINISHED_1,
                type: prisma_1.ParticipationType.Attendance,
            },
        });
    }
    await prisma.participation.create({
        data: {
            userId: p1.id,
            eventId: EVENT_FINISHED_2,
            type: prisma_1.ParticipationType.Attendance,
        },
    });
    console.log('--- seed-rating-qa done ---');
    console.log('Events:', EVENT_FINISHED_1, EVENT_FINISHED_2, EVENT_FUTURE_1);
    console.log('Organizer (cannot rate self):', org.id, org.email, SEED_PASSWORD);
    console.log('Participant p1 (can rate finished):', p1.id, p1.email, SEED_PASSWORD);
    console.log('Stranger (no participation, expect 403):', stranger.id, stranger.email, SEED_PASSWORD);
    if (segtox) {
        console.log('Segtox (participant on finished-1, use your phone / Google):', segtox.id, segtox.email);
    }
    console.log('API base: GET /api/events/' + EVENT_FINISHED_1 + ' — POST /api/events/' + EVENT_FINISHED_1 + '/ratings');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-rating-qa.js.map