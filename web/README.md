SpendSignal is a Next.js app that audits startup AI tooling spend, suggests cost optimizations, and captures leads for high-savings follow-up.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment setup

Copy `.env.example` to `.env.local` and fill provider keys.

### Email provider options

The app uses an email utility layer (`src/lib/email.ts`) with provider abstraction.

- **Postmark (default):**
  - `EMAIL_PROVIDER=postmark`
  - `POSTMARK_SERVER_TOKEN=...`
  - `POSTMARK_FROM_EMAIL=...`
- **SendGrid (recommended when DNS access is unavailable):**
  - `EMAIL_PROVIDER=sendgrid`
  - `SENDGRID_API_KEY=...`
  - `SENDGRID_FROM_EMAIL=...` (use verified single-sender or authenticated sender)
- **Twilio main-key auth (if your account provides SID + Secret credentials):**
  - `EMAIL_PROVIDER=twilio-main-key`
  - `TWILIO_API_KEY_SID=...`
  - `TWILIO_API_KEY_SECRET=...`
  - `SENDGRID_FROM_EMAIL=...`

If `EMAIL_PROVIDER` is not set, the utility tries Postmark, then SendGrid, then Twilio main-key auth.

### Postmark account note (current setup)

This project is currently configured with Postmark and working for same-domain recipients on the sender domain.

- Configured sender domain: `uohyd.ac.in`
- Confirmed working recipient example: `22mcce15@uohyd.ac.in`
- Current limitation while Postmark account is pending approval:
  - Recipients must share the same domain as `POSTMARK_FROM_EMAIL`
  - Sending to other domains (e.g. `gmail.com`) returns Postmark `ErrorCode 412`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
