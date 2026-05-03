/**
 * Full rating matrix against a running API (default http://localhost:3000/api).
 * Usage: node scripts/rating-qa-api-test.mjs
 * Env: API_BASE=http://host:port/api
 */
const base = (process.env.API_BASE || 'http://localhost:3000/api').replace(/\/$/, '');
const EVENT_FIN = 'rating-qa-evt-finished-1';
const EVENT_FIN2 = 'rating-qa-evt-finished-2';
const EVENT_FUT = 'rating-qa-evt-future-1';
const PWD = 'RatingQA_Seed_2026!';

async function login(email) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PWD }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`login ${email}: ${j.message || r.status}`);
  return j.results.access_token;
}

function line(pass, name, res, body) {
  const snippet =
    typeof body === 'string' ? body.slice(0, 220) : JSON.stringify(body).slice(0, 320);
  console.log(pass ? 'PASS' : 'FAIL', name, res.status, snippet);
  if (!pass) process.exitCode = 1;
  return pass;
}

async function main() {
  console.log('API_BASE=', base, '\n');

  const tokenOrg = await login('ratingqa.org@vente.test');
  const tokenP1 = await login('ratingqa.p1@vente.test');
  const tokenStranger = await login('ratingqa.stranger@vente.test');

  // --- Auth / authz ---
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 5 }),
    });
    const body = await res.json();
    line(res.status === 401, 'POST without Authorization (expect 401)', res, body);
  }
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.jwt.here',
      },
      body: JSON.stringify({ score: 5 }),
    });
    const body = await res.json();
    line(res.status === 401, 'POST with invalid JWT (expect 401)', res, body);
  }
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStranger}`,
      },
      body: JSON.stringify({ score: 4 }),
    });
    const body = await res.json();
    line(res.status === 403, 'Stranger: not a participant (expect 403)', res, body);
  }
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOrg}`,
      },
      body: JSON.stringify({ score: 5 }),
    });
    const body = await res.json();
    line(res.status === 403, 'Organizer: cannot rate own event (expect 403)', res, body);
  }
  {
    const res = await fetch(`${base}/events/${EVENT_FUT}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenP1}`,
      },
      body: JSON.stringify({ score: 3 }),
    });
    const body = await res.json();
    line(res.status === 400, 'P1: event not finished yet (expect 400)', res, body);
  }

  // --- Validation (DTO) ---
  for (const [label, bodyJson, wantStatus] of [
    ['score 0', { score: 0 }, 400],
    ['score 6', { score: 6 }, 400],
    ['score missing', {}, 400],
  ]) {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenP1}`,
      },
      body: JSON.stringify(bodyJson),
    });
    const body = await res.json();
    line(
      res.status === wantStatus,
      `P1: invalid DTO — ${label} (expect ${wantStatus})`,
      res,
      body,
    );
  }

  // --- Happy path: P1 on finished-1 (upsert) ---
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenP1}`,
      },
      body: JSON.stringify({ score: 4, text: 'QA matrix run' }),
    });
    const body = await res.json();
    line(
      (res.status === 200 || res.status === 201) && body.success,
      'P1 POST rating finished-1 (200/201)',
      res,
      body,
    );
  }
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenP1}`,
      },
      body: JSON.stringify({ score: 5 }),
    });
    const body = await res.json();
    line(res.status === 200 && body.success, 'P1 PATCH /ratings/me → 5 (200)', res, body);
  }

  // P1 also participant on finished-2: rate that event
  {
    const res = await fetch(`${base}/events/${EVENT_FIN2}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenP1}`,
      },
      body: JSON.stringify({ score: 3 }),
    });
    const body = await res.json();
    line(
      (res.status === 200 || res.status === 201) && body.success,
      'P1 POST rating finished-2 (second event) (200/201)',
      res,
      body,
    );
  }

  // --- Read APIs (no auth) public event ---
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings?page=1&limit=10`);
    const body = await res.json();
    line(
      res.status === 200 && body.success && Array.isArray(body.results),
      'GET /ratings anonymous (200)',
      res,
      body,
    );
  }
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings/summary`);
    const body = await res.json();
    const ok =
      res.status === 200 &&
      body.success &&
      body.results &&
      typeof body.results.histogram === 'object';
    line(ok, 'GET /ratings/summary anonymous (200, histogram)', res, body);
  }
  {
    const res = await fetch(
      `${base}/events/${EVENT_FIN}/ratings?page=99&limit=5`,
    );
    const body = await res.json();
    line(
      res.status === 200 && body.metadata && 'hasNextPage' in body.metadata,
      'GET /ratings page=99 (pagination metadata)',
      res,
      body,
    );
  }
  {
    const res = await fetch(`${base}/events/${EVENT_FIN}`);
    const body = await res.json();
    const ev = body.results;
    const ok =
      res.status === 200 &&
      body.success &&
      ev &&
      (typeof ev.totalRate === 'number' || ev.totalRate === null) &&
      typeof ev.ratingCount === 'number';
    line(
      ok,
      'GET /events/:id — totalRate + ratingCount on payload',
      res,
      { totalRate: ev?.totalRate, ratingCount: ev?.ratingCount },
    );
  }

  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenStranger}` },
    });
    const body = await res.json();
    line(res.status === 200 && body.success, 'GET /ratings with stranger token (public ok)', res, {
      n: body.results?.length,
    });
  }

  {
    const res = await fetch(`${base}/events/${EVENT_FIN}/ratings`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenOrg}` },
    });
    const body = await res.json();
    line(res.status === 200 && body.success, 'GET /ratings as organizer (200)', res, { n: body.results?.length });
  }

  console.log('\n--- matrix done (exit ' + (process.exitCode || 0) + ') ---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
