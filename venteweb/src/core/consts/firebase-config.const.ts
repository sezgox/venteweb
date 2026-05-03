process.loadEnvFile('./.env');

function parseFirebasePrivateKey(raw: string | undefined): string | undefined {
  if (raw == null || raw === '') {
    return undefined;
  }
  // .env stores PEM as one line with literal \n; deployment may use real newlines.
  return raw.replace(/\\n/g, '\n').trim();
}

export const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
  privateKey: parseFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
};

export const firebaseAdminAppName = 'venteweb-mobile-auth';
