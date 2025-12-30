export default async function handler(req, res) {
  // 1) CORS — lista dozwolonych domen (Origin)
  const allowedOrigins = [
    "https://asc-homeworks.com",
    "https://www.asc-homeworks.com",
  ];

  const origin = req.headers.origin || "";

  // Base44 preview ma zmienne subdomeny -> dopuszczamy wszystkie *.base44.app
  const isBase44Preview = /^https:\/\/preview-sandbox--.*\.base44\.app$/.test(origin);

  if (allowedOrigins.includes(origin) || isBase44Preview) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  // Do preflight i POST muszą być metody
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // Pozwalamy na nagłówki, których używa fetch
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 2) Preflight — przeglądarka wysyła OPTIONS zanim zrobi POST
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 3) Tylko POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    // Odczyt danych z JSON
    const body = req.body || {};
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim();
    const message = (body.message || "").trim();
    const service = (body.service || "").trim(); // jeśli masz takie pole

    if (!name || !phone || !email || !message) {
      return res.status(400).json({ ok: false, error: "validation_error" });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ ok: false, error: "missing_resend_key" });
    }

    const text =
      `Imię: ${name}\n` +
      `Telefon: ${phone}\n` +
      `E-mail: ${email}\n` +
      (service ? `Usługa: ${service}\n` : "") +
      `\nTreść zapytania:\n${message}\n`;

    const payload = {
      from: "ASC Home Works <onboarding@resend.dev>",
      to: ["kontakt@asc-homeworks.com"],
      subject: "Nowe zapytanie — formularz ASC Home Works",
      text,
    };

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resendData = await resendResp.json();

    if (!resendResp.ok) {
      return res.status(500).json({ ok: false, error: "mail_failed", detail: resendData });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
