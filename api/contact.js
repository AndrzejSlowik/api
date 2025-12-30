export default async function handler(req, res) {
  // ===== CORS =====
  const origin = req.headers.origin || "";

  const isBase44Preview = /^https:\/\/preview-sandbox--.*\.base44\.app$/.test(origin);
  const allowedOrigins = [
    "https://asc-homeworks.com",
    "https://www.asc-homeworks.com",
  ];

  if (allowedOrigins.includes(origin) || isBase44Preview) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const { name, phone, email, message, service } = req.body || {};

    if (!name || !phone || !email || !message) {
      return res.status(400).json({ ok: false, error: "validation_error" });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ ok: false, error: "missing_resend_key" });
    }

    const emailText =
      `Imię: ${name}\n` +
      `Telefon: ${phone}\n` +
      `Email: ${email}\n` +
      (service ? `Usługa: ${service}\n` : "") +
      `\nTreść:\n${message}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ASC Home Works <onboarding@resend.dev>",
        to: ["kontakt@asc-homeworks.com"],
        subject: "Nowe zapytanie – formularz ASC Home Works",
        text: emailText,
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      return res.status(500).json({ ok: false, error: "mail_failed", detail: err });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
