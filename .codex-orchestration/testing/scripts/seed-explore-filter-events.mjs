#!/usr/bin/env node
/**
 * Seeds several events for Explore filter / map QA (public + private, categories, coords, collaboration).
 *
 * Prerequisites:
 * - venteweb running (e.g. http://localhost:3000/api)
 * - VENTE_ACCESS_TOKEN: JWT from POST /api/auth/login
 * - VENTE_ORGANIZER_ID: user id (must match token subject for create)
 *
 * Usage (PowerShell):
 *   $env:VENTE_ACCESS_TOKEN="eyJ..."
 *   $env:VENTE_ORGANIZER_ID="<uuid>"
 *   node .codex-orchestration/testing/scripts/seed-explore-filter-events.mjs
 *
 * Optional: VENTE_API_URL (default http://localhost:3000/api)
 */

const API = (process.env.VENTE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const TOKEN = process.env.VENTE_ACCESS_TOKEN;
const ORG = process.env.VENTE_ORGANIZER_ID;

function startEnd() {
  const start = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { start, end };
}

async function createEvent(body) {
  const form = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => form.append(`${k}[${i}]`, String(item)));
    } else if (v instanceof Date) {
      form.append(k, v.toISOString());
    } else {
      form.append(k, String(v));
    }
  }

  const res = await fetch(`${API}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  if (!TOKEN || !ORG) {
    console.error('Set VENTE_ACCESS_TOKEN and VENTE_ORGANIZER_ID');
    process.exit(1);
  }

  const { start, end } = startEnd();
  const baseName = `QA Explore ${Date.now()}`;

  const fixtures = [
    {
      name: `${baseName} Public Art Madrid A`,
      description: 'Seed A — search keyword QASEEDART',
      visibility: 'Public',
      lat: 40.42,
      lng: -3.71,
      location: 'Madrid West QASEED',
      locationAlias: 'West',
      categories: ['Art'],
      maxCollaborators: 2,
      maxAttendees: 100,
      requiresRequest: 'false',
    },
    {
      name: `${baseName} Public Music Madrid B`,
      description: 'Seed B — search keyword QASEEDMUSIC (no volunteer slots / maxCollaborators 0)',
      visibility: 'Public',
      lat: 40.48,
      lng: -3.36,
      location: 'Alcala area QASEED',
      locationAlias: 'East',
      categories: ['Music'],
      maxCollaborators: 0,
      maxAttendees: 50,
      requiresRequest: 'true',
    },
    {
      name: `${baseName} Public Meetup Madrid C`,
      description: 'Seed C — volunteers needed QASEEDVOL',
      visibility: 'Public',
      lat: 40.45,
      lng: -3.5,
      location: 'Madrid Central QASEED',
      locationAlias: 'Central',
      categories: ['Meetup'],
      maxCollaborators: 3,
      maxAttendees: 80,
      requiresRequest: 'false',
    },
    {
      name: `${baseName} Private Party (friends only)`,
      description: 'Seed D private QASEEDPRIV',
      visibility: 'Private',
      lat: 40.44,
      lng: -3.55,
      location: 'Private spot QASEED',
      locationAlias: 'Private',
      categories: ['Party'],
      maxCollaborators: 1,
      maxAttendees: 20,
      requiresRequest: 'false',
    },
  ];

  console.log(`API: ${API}`);
  const created = [];

  for (const f of fixtures) {
    const payload = {
      organizerId: ORG,
      name: f.name,
      description: `<p>${f.description}</p>`,
      visibility: f.visibility,
      startDate: start,
      endDate: end,
      location: f.location,
      locationAlias: f.locationAlias,
      lat: f.lat,
      lng: f.lng,
      categories: f.categories,
      maxCollaborators: f.maxCollaborators,
      maxAttendees: f.maxAttendees,
      requiresRequest: f.requiresRequest,
    };
    const json = await createEvent(payload);
    const id = json?.results?.id;
    created.push({ id, name: f.name });
    console.log('Created', id, f.name);
  }

  console.log('\nDone. Use QASEED* search terms, map panning, and filters F1–F8 per mobile-explore-map-vpn-qa.md');
  console.log(JSON.stringify(created, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
