# Crescent Club of Finance — Platform

Production website and admin platform for the **Crescent Club of Finance (CCF)**.

---

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL (required from Phase 2 onward)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd ccf-website
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the required values. See `.env.example` for
documentation on each variable.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server (after build) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

---

## Project Structure

```
ccf-website/
├── app/                  # Next.js App Router
│   ├── (public)/         # Public website routes
│   ├── admin/            # Admin dashboard routes
│   └── api/              # API route handlers
├── components/
│   ├── ui/               # shadcn/ui base components
│   ├── admin/            # Admin-specific components
│   ├── events/           # Event components
│   ├── forms/            # Form engine components
│   ├── layout/           # Layout components
│   ├── public/           # Public site components
│   └── registration/     # Registration components
├── lib/                  # Shared utilities and business logic
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
├── tests/                # Unit, integration, and e2e tests
├── types/                # Shared TypeScript types
├── docs/                 # Project documentation
└── scripts/              # Utility scripts
```

---

## Architecture

See [`context.md`](./context.md) for the full implementation contract and
[`docs/`](./docs/) for architecture and schema documentation.

Technology stack: **Next.js · React · TypeScript · Tailwind CSS · shadcn/ui ·
PostgreSQL · Prisma · Auth.js · Resend · Cloudflare R2 · Vercel**
