export default async function handler(req, res) {
  // 1) CORS — pozwalamy na wywołania ze strony
  const allowedOrigins = [
    "https://asc-homeworks.com",
    "https://www.asc-homeworks.com",
  ];

  const origin = req.headers.origin || "";
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight (przeglądarka pyta o zgodę przed POST)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Tylko POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    // 2) Odczyt danych (na start bez plików, żeby uruchomić wysyłkę)
    // Base44 może wysyłać multipart/form-data — ale najpierw uruchommy wersję tekstową JSON
    // Jeśli wysyłasz FormData, w kolejnym kroku dodamy obsługę multipart.
    const body = req.body || {};
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim();
    const message = (body.message || "").trim();

    if (!name || !phone || !email || !message) {
      return res.status(400).json({ ok: false, error: "validation_error" });
    }

    // 3) Wysyłka maila przez Resend (najprościej)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ ok: false, error: "missing_resend_key" });
    }

    const payload = {
      from: "ASC Home Works <onboarding@resend.dev>", // później podmienisz na no-reply@asc-homeworks.com po weryfikacji domeny
      to: ["kontakt@asc-homeworks.com"],
      subject: "Nowe zapytanie — formularz ASC Home Works",
      text:
        `Imię: ${name}\n` +
        `Telefon: ${phone}\n` +
        `E-mail: ${email}\n\n` +
        `Treść zapytania:\n${message}\n`,
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
      return res.status(500).json({
        ok: false,
        error: "mail_failed",
        detail: resendData,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
