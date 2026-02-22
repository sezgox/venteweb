# VenteWeb Backend

NestJS backend for a social events platform.

## Tech Stack
- Node.js + TypeScript
- NestJS 10
- PostgreSQL + Prisma
- JWT authentication
- Google Sign-In and Firebase mobile authentication
- Cloudinary uploads
- Jest

## Run Locally
1. Start PostgreSQL:
   ```bash
   docker-compose up -d
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env`.
4. Start in development:
   ```bash
   npm run start:dev
   ```

## Environment Variables
Required variables include:

```env
DATABASE_URL=

JWT_SECRET=
JWT_MOBILE_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES=
JWT_REFRESH_EXPIRES=
JWT_ISSUER=
JWT_AUDIENCE=

GOOGLE_CLIENT_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EVENT_ENCRYPTION_KEY=
EVENT_INVITATION_EXPIRES_IN=
```

`FIREBASE_PRIVATE_KEY` must keep escaped line breaks (`\\n`) in `.env`.

## Authentication Flows
All routes use the `/api` global prefix.

### Web
- `POST /api/auth/login`
  - Returns short-lived `access_token`.
  - Sets `refresh_token` cookie (7d by default).
- `POST /api/auth/google`
  - Same token behavior as web login.
- `POST /api/auth/refresh`
  - Rotates refresh token and returns new access token.

### Mobile
- `POST /api/auth/google/mobile`
  - Body: `{ "idToken": "<firebase-id-token>" }`
  - Verifies Firebase ID token in backend using Firebase Admin SDK.
  - Finds or creates user in DB.
  - Returns one app JWT token (`access_token`) signed with `JWT_MOBILE_SECRET` and no expiration.
  - Does not set refresh-token cookie.

## Build and Test
```bash
npm run build
npm run test
npm run test:e2e
```
