process.loadEnvFile('./.env');
export const resendConfig = {
  apiKey: process.env.RESEND_API_KEY,
  /** Verified sender in Resend (e.g. noreply@yourdomain.com). */
  fromEmail: process.env.RESEND_FROM_EMAIL,
  /** Display name for the From header (e.g. Vente). */
  fromName: process.env.RESEND_FROM_NAME,
  /** Receiving address (e.g. Cloudflare routing). Optional Reply-To on transactional mail. */
  inboundContactEmail: process.env.VENTE_INBOUND_EMAIL,
  /**
   * Public origin of **ventewebf** for mailed links: activation (`/validate-account?token=...`)
   * and external event invitations (`/events/event/:id?invitation=...&guest=true`).
   * Prod: https://your-domain. Override with ACTIVATION_PUBLIC_BASE_URL.
   * Default below is Tailscale host:4200 so mailed links work from phone (not localhost).
   */
  activationPublicWebOrigin:
    process.env.ACTIVATION_PUBLIC_BASE_URL?.trim() ||
    'http://100.103.144.82:4200',
};
