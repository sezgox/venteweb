export type ActivationEmailContent = {
  recipientName: string;
  /** Public URL to ventewebf /validate-account (single link in email). */
  webActivationUrl: string;
};

export function buildActivationEmailSubject(): string {
  return 'Activate your Vente account';
}

/** Inline mark: rounded square + V (matches app primary ~ #ef4444). */
function venteIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" role="img" aria-hidden="true">
  <rect width="56" height="56" rx="14" fill="#ef4444"/>
  <text x="28" y="38" text-anchor="middle" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="26" font-weight="700">V</text>
</svg>`;
}

export function buildActivationEmailText(params: ActivationEmailContent): string {
  const { recipientName, webActivationUrl } = params;
  return `Hi ${recipientName},

Thanks for signing up for Vente. Open the link below to activate your account:

${webActivationUrl}

This link expires in 7 days. If you did not create an account, you can ignore this message.

— The Vente team`;
}

export function buildActivationEmailHtml(params: ActivationEmailContent): string {
  const { recipientName, webActivationUrl } = params;
  const safeName = escapeHtml(recipientName);
  const safeWeb = escapeHtml(webActivationUrl);
  const icon = venteIconSvg();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Activate your account</title>
</head>
<body style="margin:0;background:#f6f8fc;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fc;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8ef;box-shadow:0 4px 24px rgba(47,47,47,0.06);">
          <tr>
            <td align="center" style="padding:28px 28px 12px 28px;">
              ${icon}
              <p style="margin:16px 0 0 0;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#ef4444;">Vente</p>
              <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.25;color:#2f2f2f;">Activate your account</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px 28px;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:#2f2f2f;">Hi ${safeName},</p>
              <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#5f5f5f;">
                Thanks for signing up. Tap the button below to activate your account.
              </p>
              <p style="margin:24px 0 0 0;text-align:center;">
                <a href="${safeWeb}" style="display:inline-block;padding:14px 28px;background:#ef4444;color:#ffffff;font-weight:600;text-decoration:none;border-radius:10px;font-size:15px;">
                  Activate account
                </a>
              </p>
              <p style="margin:22px 0 0 0;font-size:12px;line-height:1.5;color:#5f5f5f;word-break:break-all;border-top:1px solid #e6e8ef;padding-top:16px;">
                <span style="display:block;margin-bottom:6px;color:#2f2f2f;font-weight:600;">Link</span>
                <a href="${safeWeb}" style="color:#ef4444;">${safeWeb}</a>
              </p>
              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#8c8c8c;">
                This link expires in 7 days. If you did not create an account, you can ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px 22px 28px;background:#f6f8fc;border-top:1px solid #e6e8ef;">
              <p style="margin:0;font-size:11px;color:#8c8c8c;">— The Vente team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
