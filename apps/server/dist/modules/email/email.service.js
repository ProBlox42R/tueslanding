import { Resend } from "resend";
import { env } from "../../config/env.js";
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
/**
 * Тъмен "glass" дизайн за имейлите — тъмен фон, карта с фина рамка,
 * полупрозрачен pill бутон. Използва се еднакво за всички транзакционни
 * имейли (verification, reset, purchase, refund), за консистентен брандинг.
 */
function baseLayout(params) {
    const { title, bodyHtml, ctaLabel, ctaUrl } = params;
    const ctaBlock = ctaLabel && ctaUrl
        ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
        <tr>
          <td align="left">
            <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: -0.2px; text-align: center; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);">
              <!--[if mso]><i style="letter-spacing: 24px; mso-font-width: -100%; mso-text-raise: 18px;">&#8202;</i><![endif]-->
              <span style="mso-text-raise: 9px;">${ctaLabel} &rarr;</span>
              <!--[if mso]><i style="letter-spacing: 24px; mso-font-width: -100%;">&#8202;</i><![endif]-->
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #737373;">
        Ако бутонът не работи, копирайте този линк в браузъра си:
      </p>
      <p style="margin: 0 0 28px 0; font-size: 12px; line-height: 1.5; color: #a1a1a1; word-break: break-all;">
        <a href="${ctaUrl}" style="color: #a1a1a1; text-decoration: underline;">${ctaUrl}</a>
      </p>`
        : "";
    return `<!doctype html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body {
            height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important;
            background-color: #0d0d0d;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #ededed;
        }
        .glass-btn { transition: background-color 0.2s ease, border-color 0.2s ease; }
        .glass-btn:hover { background-color: rgba(255, 255, 255, 0.15) !important; border-color: rgba(255, 255, 255, 0.4) !important; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0d0d0d; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #141414; border: 1px solid #262626; border-radius: 16px; overflow: hidden; border-collapse: separate;">
                    <tr>
                        <td style="padding: 36px 36px 20px 36px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                            &#127915; Билети
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 36px 36px 36px;">
                            <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 500; color: #ffffff; letter-spacing: -0.4px; line-height: 1.3;">
                                ${title}
                            </h1>
                            ${bodyHtml}
                            ${ctaBlock}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 36px; background-color: #0f0f0f; border-top: 1px solid #222222; border-radius: 0 0 16px 16px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-size: 12px; color: #525252; line-height: 1.5;">
                                        &copy; Билети. Всички права запазени.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
function paragraph(text) {
    return `<p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #a1a1a1; font-weight: 400;">${text}</p>`;
}
function greeting(username) {
    return paragraph(`Здравейте, <strong style="color: #ffffff;">${escapeHtml(username)}</strong>,`);
}
async function send(to, subject, html) {
    if (!resend) {
        console.warn(`[email] RESEND_API_KEY не е зададен — пропускане на изпращане до ${to}: ${subject}`);
        return;
    }
    await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to,
        subject,
        html,
    });
}
export const emailService = {
    async sendVerificationEmail(to, username, verifyUrl) {
        const html = baseLayout({
            title: "Потвърдете вашия имейл",
            bodyHtml: greeting(username) +
                paragraph("Благодарим Ви, че се регистрирахте в „Билети“. Моля, потвърдете имейл адреса си, за да активирате акаунта си. Линкът е валиден за ограничено време."),
            ctaLabel: "Потвърди имейл",
            ctaUrl: verifyUrl,
        });
        await send(to, "Потвърдете вашия имейл — Билети", html);
    },
    async sendPasswordResetEmail(to, username, resetUrl) {
        const html = baseLayout({
            title: "Възстановяване на парола",
            bodyHtml: greeting(username) +
                paragraph("Получихме заявка за възстановяване на паролата на Вашия акаунт. Линкът е валиден за ограничено време.") +
                paragraph("Ако не сте заявили това, можете спокойно да игнорирате този имейл."),
            ctaLabel: "Задай нова парола",
            ctaUrl: resetUrl,
        });
        await send(to, "Възстановяване на парола — Билети", html);
    },
    async sendPurchaseConfirmationEmail(to, username, eventName, ticketUrl) {
        const html = baseLayout({
            title: "Вашият билет е готов",
            bodyHtml: greeting(username) +
                paragraph(`Благодарим Ви за покупката! Билетът Ви за <strong style="color:#ffffff;">${escapeHtml(eventName)}</strong> е готов — приятно изживяване!`),
            ctaLabel: "Отвори билета",
            ctaUrl: ticketUrl,
        });
        await send(to, `Вашият билет за ${eventName} — Билети`, html);
    },
    async sendRefundConfirmationEmail(to, username, eventName) {
        const html = baseLayout({
            title: "Потвърждение за възстановена сума",
            bodyHtml: greeting(username) +
                paragraph(`Плащането Ви за <strong style="color:#ffffff;">${escapeHtml(eventName)}</strong> беше възстановено успешно.`) +
                paragraph("Сумата ще постъпи по картата Ви според сроковете на Вашата банка."),
        });
        await send(to, `Възстановена сума за ${eventName} — Билети`, html);
    },
};
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
//# sourceMappingURL=email.service.js.map