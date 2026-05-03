export type ExternalInvitationEmailContent = {
  recipientFirstName: string;
  recipientLastName: string;
  eventName: string;
  organizerName: string;
  invitationText?: string;
  /** Public URL to ventewebf event page with token (single primary link). */
  eventGuestUrl: string;
};

export function buildExternalInvitationEmailSubject(
  params: Pick<ExternalInvitationEmailContent, 'eventName'>,
): string {
  return `You're invited: ${params.eventName}`;
}

export function buildExternalInvitationEmailText(
  params: ExternalInvitationEmailContent,
): string {
  const name =
    `${params.recipientFirstName} ${params.recipientLastName}`.trim() ||
    'there';
  const msg = params.invitationText?.trim();
  return `Hi ${name},

${params.organizerName} invited you to "${params.eventName}" on Vente.
${msg ? `\nMessage from the organizer:\n${msg}\n` : ''}
Open the link to view the event and respond (guest access):

${params.eventGuestUrl}

If the button does not work, copy the full URL into your browser.

— The Vente team`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Same inline mark as activation emails (rounded + V). */
function venteIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" role="img" aria-hidden="true">
  <rect width="56" height="56" rx="14" fill="#ef4444"/>
  <text x="28" y="38" text-anchor="middle" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="26" font-weight="700">V</text>
</svg>`;
}

export function buildExternalInvitationEmailHtml(
  params: ExternalInvitationEmailContent,
): string {
  const displayName =
    `${params.recipientFirstName} ${params.recipientLastName}`.trim() ||
    'there';
  const safeName = escapeHtml(displayName);
  const safeEvent = escapeHtml(params.eventName);
  const safeOrganizer = escapeHtml(params.organizerName);
  const safeUrl = escapeHtml(params.eventGuestUrl);
  const msg = params.invitationText?.trim();
  const safeMsg = msg ? escapeHtml(msg) : '';
  const icon = venteIconSvg();

  const messageBlock = msg
    ? `<p style="margin:14px 0 0 0;font-size:14px;line-height:1.5;color:#5f5f5f;border-left:3px solid #ef4444;padding-left:12px;">
        <span style="display:block;font-weight:600;color:#2f2f2f;margin-bottom:4px;">Message</span>
        ${safeMsg.replace(/\n/g, '<br/>')}
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Event invitation</title>
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
              <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.25;color:#2f2f2f;">You're invited</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px 28px;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:#2f2f2f;">Hi ${safeName},</p>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#5f5f5f;">
                <strong style="color:#2f2f2f;">${safeOrganizer}</strong> invited you to
                <strong style="color:#2f2f2f;">${safeEvent}</strong>.
              </p>
              ${messageBlock}
              <p style="margin:24px 0 0 0;text-align:center;">
                <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;background:#ef4444;color:#ffffff;font-weight:600;text-decoration:none;border-radius:10px;font-size:15px;">
                  View event &amp; respond
                </a>
              </p>
              <p style="margin:22px 0 0 0;font-size:12px;line-height:1.5;color:#5f5f5f;word-break:break-all;border-top:1px solid #e6e8ef;padding-top:16px;">
                <span style="display:block;margin-bottom:6px;color:#2f2f2f;font-weight:600;">Link</span>
                <a href="${safeUrl}" style="color:#ef4444;">${safeUrl}</a>
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
