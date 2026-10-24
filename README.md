# Certify

**The open-source toolkit for event communications.** Bulk-generate verifiable certificates, send personalized mass emails and make QR codes, all from one CSV. Free, no login: bring your own SMTP credentials and go.

Built by [GDG Raipur](https://gdg.community.dev/gdg-raipur/).

## Tools

| Tool | What it does |
| --- | --- |
| **Certificates** | Upload a CSV and a certificate image, drag the name, QR code and any other fields into place, and generate a PDF for every row. Download them all as a ZIP or email each person their certificate. |
| **Mass Email** | Upload a CSV, write one message using `{{column}}` placeholders, preview it for every recipient, send yourself a test, then send to everyone with live progress, pause/stop, retries and a results export. |
| **QR Codes** | Turn any link or text into a QR code with your colors and size. Export as PNG or SVG. |
| **Verify** | Anyone can scan a certificate's QR code (or paste its ID) to confirm it's genuine. |

### Highlights

- **No accounts.** Paste the SMTP details of the inbox you already use (Gmail, Outlook, Zoho, Brevo, Resend, SendGrid or any other provider).
- **Private by default.** CSVs are parsed and PDFs are rendered in your browser. SMTP credentials are only used to send and are never stored on the server. Your browser can optionally remember them.
- **Placeholders everywhere.** Every CSV column works as `{{column}}` in email subjects, bodies, certificate text and file names. Certificates also get `{{certificate_id}}`, `{{issue_date}}`, `{{event}}`, `{{issuer}}` and `{{verify_link}}`.
- **Print-quality certificates.** QR codes are drawn as vectors on a white quiet zone, long names shrink to fit, and you can upload any `.ttf`/`.otf` font for names outside the Latin alphabet.

## Using it

### Certificates

1. **Details & data.** Upload your CSV (only a name column is required), pick the name and email columns, and fill in the event name, issuer and date.
2. **Design.** Upload a PNG or JPG of your blank certificate. Drag layers to position them, use the arrow keys to nudge, and step through rows (or jump to the longest name) to check the fit.
3. **Generate & send.** Choose whether to download a ZIP and/or email the certificates, then generate. You also get a records CSV with every certificate ID and verification link.

### Mass email

1. Upload a CSV with an email column. Invalid addresses and duplicates are flagged.
2. Write your subject and message in plain text or HTML. Click a column chip to insert its placeholder.
3. Enter your SMTP details, click **Test connection**, then send a test to yourself.
4. Click **Send**. Emails go out in small batches. You can pause or stop at any time and retry failures afterwards.

> **Gmail / Outlook:** use an [app password](https://support.google.com/accounts/answer/185833), not your normal password. Free Gmail accounts can send roughly 500 emails a day.

## How verification works

Every certificate gets a unique ID and a QR code that opens `/verify`. The instance can confirm certificates in one of two ways:

| Mode | Enabled by | QR link | Notes |
| --- | --- | --- | --- |
| **Registry** | `MONGODB_URI` | `/verify?id=…` (short) | Stores name, event, issuer and date (not emails). Powers the admin dashboard. |
| **Signed link** | `CERTIFY_SECRET` | `/verify?c=…` | The details are in the link, signed with HMAC-SHA256. No database needed; tampering is detected. |

If both are set, the registry is used, and signed links act as a fallback if the database is unreachable.

**What "verified" means:** the certificate was issued through *this* Certify instance and hasn't been altered. The event and issuer names are typed in by whoever generated it, which the verify page says. If you need trust in the issuer's identity, self-host Certify on your own domain.

## Self-hosting

```bash
git clone https://github.com/gdg-raipur/certify.git
cd certify
npm install
cp sample.env.local .env.local   # then fill in what you need
npm run dev
```

Open http://localhost:3000.

### Environment variables

All optional. See [`sample.env.local`](sample.env.local).

| Variable | Purpose |
| --- | --- |
| `CERTIFY_SECRET` | Enables signed verification links. Generate with `openssl rand -hex 32` (16+ chars). **Don't change it** after issuing certificates. |
| `MONGODB_URI` | Enables the certificate registry and admin dashboard. `DB_PASSWORD` is still accepted for legacy deployments. |
| `HOSTED_URL` | Public base URL for verification links. Defaults to the URL the site is visited on. |
| `ADMIN_ORG_ID`, `ADMIN_PASSWORD` | Credentials for `/dashboard`, which lists registry certificates. |
| `ALLOW_PRIVATE_SMTP` | Set to `true` to allow SMTP hosts on private networks (blocked by default to protect public instances). |

Check your setup with `npx tsx scripts/verify-setup.ts`.

### Deploy

- **Vercel:** import the repo and add the environment variables. Note that Vercel caps request bodies at 4.5 MB, so certificate PDFs larger than about 3 MB can't be emailed. Use a compressed JPG template.
- **Docker:** `docker compose up --build` (reads `.env.local` if present).

## Tech

[Next.js](https://nextjs.org/) (App Router, server actions) · [Tailwind CSS](https://tailwindcss.com/) · [pdf-lib](https://pdf-lib.js.org/) + fontkit · [Papa Parse](https://www.papaparse.com/) · [qrcode](https://www.npmjs.com/package/qrcode) · [JSZip](https://stuk.github.io/jszip/) · [Nodemailer](https://nodemailer.com/) · [Mongoose](https://mongoosejs.com/)

```
src/
├── app/                    # Routes: /, /create-certificates, /mass-email, /qrcode-generation, /verify, /dashboard
├── actions/                # Server actions: email sending, certificate issuing & verification
├── components/
│   ├── ui/                 # Buttons, cards, fields, badges…
│   ├── certificates/       # Certificate wizard (data → design → generate)
│   ├── mass-email/         # Mass emailer
│   └── …                   # Shared: CSV dropzone, SMTP settings, email composer
└── lib/
    ├── certificate/        # PDF renderer, layer types, helpers
    ├── template.ts         # {{placeholder}} rendering
    ├── signing.ts          # Signed verification tokens
    └── useSendQueue.ts     # Batched client-side send loop
```

### Known limitations

- Complex scripts that need glyph shaping (e.g. Devanagari conjuncts, Arabic) may not render correctly in PDFs; pdf-lib does not do text shaping. Latin, Cyrillic, Greek and other non-shaping scripts work with a custom font.
- Emails are sent from the browser session, so keep the tab open until a batch finishes.
- Generated PDFs are held in browser memory until the ZIP downloads. With a 1 MB template, 500 certificates use about 500 MB, so keep templates small (a compressed JPG is ideal) or split very large batches.

## Contributing

Contributions are welcome! Fork the repo, create a branch, and open a pull request. Run `npm run lint` and `npm run build` before submitting.

## License

MIT. See [LICENSE](LICENSE).
