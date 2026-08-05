import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { generateSecureToken } from "../../utils/tokens.js";
import { storageService } from "../storage/storage.service.js";
import { withTransaction } from "../../config/db.js";
import { ticketsRepository } from "./tickets.repository.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Растерирано (PNG) лого вместо векторно SVG вграждане: PDFKit винаги
// строго "изрязва" растерни изображения до зададената им кутия (width/
// height), докато SVG-to-PDF конверсията невинаги зачита истинските
// визуални граници на оригиналния SVG (напр. при завъртяно съдържание
// извън номиналния viewBox) — точно това причиняваше застъпването с
// текста до логото. PNG-то е предварително изрязано до реалното си
// съдържание (packages/shared/assets/logo.png).
const LOGO_PATH = path.resolve(__dirname, "../../../../../packages/shared/assets/logo.png");
const FONT_REGULAR_PATH = path.resolve(__dirname, "../../../assets/fonts/DejaVuSans.ttf");
const FONT_BOLD_PATH = path.resolve(__dirname, "../../../assets/fonts/DejaVuSans-Bold.ttf");
let cachedLogoPng = null;
async function loadLogoPng() {
    if (!cachedLogoPng) {
        cachedLogoPng = await fs.readFile(LOGO_PATH);
    }
    return cachedLogoPng;
}
const BRAND_COLOR = "#ED6C66";
export const ticketService = {
    /**
     * Генерира случаен, криптографски сигурен QR token за билета.
     * В QR-а отива само суровият token (непредвидим, несвързан пряко с
     * личните данни) — самоличността на притежателя се търси в базата чрез
     * hash-а на token-а, никога от съдържанието на кода.
     */
    generateQrToken() {
        return generateSecureToken(24);
    },
    async generateTicketPdf(ticket, qrToken) {
        const logoPng = await loadLogoPng();
        const qrDataUrl = await QRCode.toDataURL(qrToken, {
            margin: 0,
            width: 400,
            color: { dark: "#1B1B1B", light: "#FFFFFF" },
        });
        const qrPngBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
        return new Promise((resolve, reject) => {
            // A4, за да се разпечатва спретнато на стандартен принтер у дома/офиса.
            const doc = new PDFDocument({ size: "A4", margin: 0 });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            // PDFKit-овите вградени 14 стандартни шрифта (Helvetica и т.н.) НЕ
            // съдържат кирилски глифи — без изрично регистриран Unicode шрифт
            // всеки кирилски текст излиза като нечетливи символи. DejaVu Sans
            // покрива 100% от основния кирилски блок (виж assets/fonts/).
            doc.registerFont("Sans", FONT_REGULAR_PATH);
            doc.registerFont("Sans-Bold", FONT_BOLD_PATH);
            const pageWidth = doc.page.width; // 595.28
            const margin = 40;
            const contentWidth = pageWidth - margin * 2;
            // ---- Цветова палитра — нарочно светла/бяла, за да се разпечатва
            // евтино и четливо на обикновен принтер (без тъмни фонове). ----
            const ink = "#1B1B1B";
            const inkMuted = "#6B6B6B";
            const hairline = "#E4DEDC";
            const surfaceTint = "#FBF3F2"; // много светъл оттенък на брандовия цвят
            // ---- Горна лента: тънка брандова лента над бяла страница ----
            doc.rect(0, 0, pageWidth, 6).fill(BRAND_COLOR);
            // ---- Хедър: лого в собствена "кутия" + wordmark + етикет ----
            // Логото има собствена, фиксирана квадратна зона с лек фон — така
            // винаги остава ясно отделено от wordmark текста, независимо от
            // истинските визуални пропорции на самото изображение.
            let cursorY = 32;
            const logoBoxSize = 40;
            doc.roundedRect(margin, cursorY, logoBoxSize, logoBoxSize, 10).fill(surfaceTint);
            const logoPadding = 6;
            doc.image(logoPng, margin + logoPadding, cursorY + logoPadding, {
                fit: [logoBoxSize - logoPadding * 2, logoBoxSize - logoPadding * 2],
                align: "center",
                valign: "center",
            });
            const wordmarkX = margin + logoBoxSize + 14; // фиксирано разстояние от кутията на логото
            doc
                .font("Sans-Bold")
                .fontSize(18)
                .fillColor(ink)
                .text("Билети", wordmarkX, cursorY + 11);
            doc
                .font("Sans-Bold")
                .fontSize(9)
                .fillColor(BRAND_COLOR)
                .text("ЕЛЕКТРОНЕН БИЛЕТ", 0, cursorY + 10, { align: "right", width: pageWidth - margin });
            cursorY += 56;
            doc.moveTo(margin, cursorY).lineTo(pageWidth - margin, cursorY).lineWidth(1).strokeColor(hairline).stroke();
            cursorY += 28;
            // ---- Заглавие на събитието ----
            doc.font("Sans-Bold").fontSize(24).fillColor(ink).text(ticket.event_name, margin, cursorY, {
                width: contentWidth,
            });
            cursorY = doc.y + 6;
            doc
                .font("Sans")
                .fontSize(12)
                .fillColor(inkMuted)
                .text(`${ticket.venue_name} · ${formatDate(ticket.start_date)}`, margin, cursorY, {
                width: contentWidth,
            });
            cursorY = doc.y + 28;
            // ---- Карта с детайли (двуколонна мрежа с розово тонирана подложка) ----
            const cardTop = cursorY;
            const cardPaddingX = 24;
            const cardPaddingY = 22;
            const colGap = 24;
            const colWidth = (contentWidth - cardPaddingX * 2 - colGap) / 2;
            const rows = [
                ["Ред", ticket.row_label],
                ["Място", String(ticket.seat_number)],
                ["Тип билет", translateSeatType(ticket.seat_type)],
                ["Цена", `${ticket.price} лв.`],
                ["Притежател", ticket.buyer_name ?? ticket.username],
                ["Номер на билета", ticket.id],
            ];
            // Изчисли височината на картата спрямо съдържанието предварително.
            const rowHeight = 40;
            const cardHeight = cardPaddingY * 2 + Math.ceil(rows.length / 2) * rowHeight;
            doc.roundedRect(margin, cardTop, contentWidth, cardHeight, 12).fill(surfaceTint);
            rows.forEach(([label, value], i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = margin + cardPaddingX + col * (colWidth + colGap);
                const y = cardTop + cardPaddingY + row * rowHeight;
                doc.font("Sans").fontSize(9).fillColor(inkMuted).text(label.toUpperCase(), x, y, { width: colWidth });
                doc
                    .font("Sans-Bold")
                    .fontSize(13)
                    .fillColor(ink)
                    .text(value, x, y + 13, { width: colWidth, ellipsis: true });
            });
            cursorY = cardTop + cardHeight + 34;
            // ---- QR секция: пунктирана "откъсваема" линия + центриран QR код ----
            dashedLine(doc, margin, cursorY, pageWidth - margin, cursorY, hairline);
            cursorY += 26;
            doc
                .font("Sans-Bold")
                .fontSize(11)
                .fillColor(ink)
                .text("Покажете този код на входа", margin, cursorY, { width: contentWidth, align: "center" });
            cursorY = doc.y + 16;
            const qrSize = 190;
            const qrBoxX = (pageWidth - qrSize) / 2;
            doc
                .roundedRect(qrBoxX - 16, cursorY - 16, qrSize + 32, qrSize + 32, 16)
                .lineWidth(1)
                .strokeColor(hairline)
                .stroke();
            doc.image(qrPngBuffer, qrBoxX, cursorY, { width: qrSize, height: qrSize });
            cursorY += qrSize + 32 + 20;
            doc
                .font("Sans")
                .fontSize(9)
                .fillColor(inkMuted)
                .text("QR кодът е уникален и еднократен — невалиден е след сканиране на входа.", margin, cursorY, { width: contentWidth, align: "center" });
            // ---- Футър ----
            const footerY = doc.page.height - 50;
            doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).lineWidth(1).strokeColor(hairline).stroke();
            doc
                .font("Sans")
                .fontSize(8)
                .fillColor(inkMuted)
                .text("Билети — система за продажба и управление на билети", margin, footerY + 12, {
                width: contentWidth,
                align: "center",
            });
            doc.end();
        });
    },
    buildObjectKey(ticketId) {
        return `${ticketId}.pdf`;
    },
    async uploadTicketPdf(objectKey, pdf) {
        await storageService.put(objectKey, pdf);
    },
    async getTicketPdf(objectKey) {
        return storageService.get(objectKey);
    },
    /**
     * Генерира и качва PDF-а за един конкретен билет. Извиква се както
     * веднага след покупка (от orders.service.finalizeOrder), така и
     * "лениво" от tickets.routes.ts, ако по някаква причина PDF-ът все още
     * липсва при отваряне на билета (напр. временен проблем с R2 при
     * покупката).
     *
     * Заключва реда на билета FOR UPDATE вътре в транзакция и проверява
     * pdf_object_key ПОВТОРНО след заключването (double-checked locking).
     * Без това, два паралелни request-а за един и същ билет (двоен клик,
     * повторен опит на мобилен браузър и т.н.) биха могли едновременно да
     * генерират РАЗЛИЧНИ QR token-и — единият печели записа в базата,
     * другият печели качването на файла — и билетът остава перманентно
     * несканируем, защото QR кодът във файла вече не съвпада с hash-а в
     * базата. Заключването прави операцията безопасна за паралелно
     * изпълнение: печели само първият, вторият вижда готовия резултат.
     */
    async generateAndUpload(ticketId) {
        return withTransaction(async (conn) => {
            const [rows] = await conn.query("SELECT id, pdf_object_key FROM tickets WHERE id = ? LIMIT 1 FOR UPDATE", [ticketId]);
            const existing = rows[0];
            if (!existing)
                throw new Error(`Билет ${ticketId} не е намерен за генериране на PDF.`);
            if (existing.pdf_object_key) {
                // Друг паралелен request вече го е генерирал, докато сме чакали
                // заключването — просто връщаме готовия резултат, без да го
                // презаписваме и без да генерираме нов (различен) QR token.
                return existing.pdf_object_key;
            }
            // Генерираме token/hash и веднага записваме hash-а в базата, докато
            // все още държим заключването — никой друг паралелен request не може
            // да генерира различен token за същия билет междувременно.
            const { token, hash } = this.generateQrToken();
            await conn.query("UPDATE tickets SET qr_token_hash = ? WHERE id = ?", [hash, ticketId]);
            const detail = await ticketsRepository.findDetailById(ticketId);
            if (!detail)
                throw new Error(`Билет ${ticketId} не е намерен за генериране на PDF.`);
            const pdf = await this.generateTicketPdf(detail, token);
            const objectKey = this.buildObjectKey(ticketId);
            await this.uploadTicketPdf(objectKey, pdf);
            await conn.query("UPDATE tickets SET pdf_object_key = ? WHERE id = ?", [objectKey, ticketId]);
            return objectKey;
        });
    },
};
function formatDate(date) {
    return new Date(date).toLocaleString("bg-BG", {
        dateStyle: "long",
        timeStyle: "short",
    });
}
function translateSeatType(seatType) {
    switch (seatType) {
        case "VIP":
            return "VIP";
        case "NORMAL":
            return "Нормален";
        default:
            return seatType;
    }
}
function dashedLine(doc, x1, y1, x2, y2, color) {
    doc.save();
    doc.dash(4, { space: 4 }).moveTo(x1, y1).lineTo(x2, y2).lineWidth(1).strokeColor(color).stroke();
    doc.undash();
    doc.restore();
}
//# sourceMappingURL=ticket.service.js.map