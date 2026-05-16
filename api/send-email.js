import nodemailer from "nodemailer";

const REQUIRED_FIELDS = [
    "name",
    "email",
    "phone",
    "serviceType",
    "propertyArea",
    "propertyAddress",
    "elevatorAvailability",
    "addonsPreference",
];

const FIELD_LABELS = {
    name: "Namn",
    email: "E-post",
    phone: "Telefon",
    serviceType: "Tjänst",
    propertyArea: "Kvadratmeter",
    propertyAddress: "Adress",
    elevatorAvailability: "Hiss",
    addonsPreference: "Tilläggstjänster",
    message: "Meddelande",
};

const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILES = 3;
const MAX_FILE_SIZE = 1.5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 3 * 1024 * 1024;

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });

const cleanText = (value) =>
    String(value || "")
        .replace(/\r/g, "")
        .trim();

const singleLine = (value) => cleanText(value).replace(/\n+/g, " ");

const escapeHtml = (value) =>
    cleanText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const splitRecipients = (value) =>
    cleanText(value)
        .split(",")
        .map((recipient) => recipient.trim())
        .filter(Boolean);

const sanitizeFilename = (value) => {
    const filename = singleLine(value).replace(/[^a-zA-Z0-9._-]/g, "_");
    return filename || "attachment";
};

const isUploadedFile = (value) =>
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.arrayBuffer === "function";

const getFieldValues = (formData) => {
    const values = {};
    [...REQUIRED_FIELDS, "message"].forEach((field) => {
        values[field] = cleanText(formData.get(field));
    });
    return values;
};

const validateFields = (fields) => {
    const missingFields = REQUIRED_FIELDS.filter((field) => !fields[field]);
    if (missingFields.length) {
        return "Fyll i alla obligatoriska fält.";
    }

    if (!isValidEmail(fields.email)) {
        return "Ange en giltig e-postadress.";
    }

    const area = Number(fields.propertyArea);
    if (!Number.isFinite(area) || area < 0) {
        return "Ange bostadens storlek i kvadratmeter.";
    }

    return null;
};

const collectAttachments = async (formData) => {
    const uploadedFiles = formData
        .getAll("projectImages[]")
        .filter((file) => isUploadedFile(file) && file.size > 0);

    if (uploadedFiles.length > MAX_FILES) {
        return {
            error: `Bifoga max ${MAX_FILES} bilder.`,
            attachments: [],
        };
    }

    let totalSize = 0;
    const attachments = [];

    for (const file of uploadedFiles) {
        if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
            return {
                error: "Bifoga endast jpg-, png- eller webp-bilder.",
                attachments: [],
            };
        }

        if (file.size > MAX_FILE_SIZE) {
            return {
                error: "En eller flera bilder är för stora.",
                attachments: [],
            };
        }

        totalSize += file.size;
        if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
            return {
                error: "Bilderna är för stora tillsammans.",
                attachments: [],
            };
        }

        attachments.push({
            filename: sanitizeFilename(file.name),
            content: Buffer.from(await file.arrayBuffer()),
            contentType: file.type,
        });
    }

    return { error: null, attachments };
};

const buildEmail = (fields) => {
    const submittedAt = new Intl.DateTimeFormat("sv-SE", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Stockholm",
    }).format(new Date());

    const rows = [
        ["name", fields.name],
        ["email", fields.email],
        ["phone", fields.phone],
        ["serviceType", fields.serviceType],
        ["propertyArea", `${fields.propertyArea} kvm`],
        ["propertyAddress", fields.propertyAddress],
        ["elevatorAvailability", fields.elevatorAvailability],
        ["addonsPreference", fields.addonsPreference],
        ["message", fields.message],
    ].filter(([, value]) => value);

    const text = [
        "Ny förfrågan från hemsidan",
        "",
        ...rows.map(([field, value]) => `${FIELD_LABELS[field]}: ${value}`),
        `Skickad: ${submittedAt}`,
    ].join("\n");

    const htmlRows = rows
        .map(
            ([field, value]) => `
            <tr>
                <th align="left" style="padding: 10px 12px; background: #f6f4f0; border-bottom: 1px solid #e7e2da; width: 180px;">${FIELD_LABELS[field]}</th>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e7e2da;">${escapeHtml(value).replace(/\n/g, "<br>")}</td>
            </tr>`,
        )
        .join("");

    const html = `
        <!doctype html>
        <html lang="sv">
        <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2 style="margin: 0 0 16px;">Ny förfrågan från hemsidan</h2>
            <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; max-width: 680px; width: 100%;">
                ${htmlRows}
                <tr>
                    <th align="left" style="padding: 10px 12px; background: #f6f4f0; width: 180px;">Skickad</th>
                    <td style="padding: 10px 12px;">${escapeHtml(submittedAt)}</td>
                </tr>
            </table>
        </body>
        </html>`;

    return { text, html };
};

const sendEmail = async (fields, attachments) => {
    const host = process.env.SMTP_HOST || "mailout.one.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const username = process.env.SMTP_USERNAME;
    const password = process.env.SMTP_PASSWORD;
    const to = process.env.EMAIL_TO || "info@creatinghomes.se";
    const cc = splitRecipients(process.env.EMAIL_CC);
    const subject = process.env.EMAIL_SUBJECT || "Ny förfrågan från hemsidan";
    const fromAddress = process.env.EMAIL_FROM || username;

    if (!username || !password) {
        throw new Error("Missing SMTP_USERNAME or SMTP_PASSWORD environment variable.");
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        auth: {
            user: username,
            pass: password,
        },
    });

    const { text, html } = buildEmail(fields);

    await transporter.sendMail({
        from: `Creating Homes Website <${fromAddress}>`,
        to,
        cc,
        replyTo: `${singleLine(fields.name)} <${fields.email}>`,
        subject,
        text,
        html,
        attachments,
    });
};

export default {
    async fetch(request) {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    Allow: "POST, OPTIONS",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Accept",
                },
            });
        }

        if (request.method !== "POST") {
            return json({ success: false, message: "Method not allowed" }, 405);
        }

        let formData;
        try {
            formData = await request.formData();
        } catch (error) {
            return json({ success: false, message: "Formuläret kunde inte läsas." }, 400);
        }

        const fields = getFieldValues(formData);
        const validationError = validateFields(fields);
        if (validationError) {
            return json({ success: false, message: validationError }, 400);
        }

        const { error: attachmentError, attachments } = await collectAttachments(formData);
        if (attachmentError) {
            return json({ success: false, message: attachmentError }, 400);
        }

        try {
            await sendEmail(fields, attachments);
        } catch (error) {
            console.error("Email send failed", error);
            return json(
                {
                    success: false,
                    message: "Oj! Något gick fel. Försök igen eller mejla oss direkt.",
                },
                500,
            );
        }

        return json({ success: true });
    },
};
