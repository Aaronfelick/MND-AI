# MND-AI

This repository now includes a Version 3 chatbot setup that separates the UI,
browser logic, secrets, external company data, and backend AI/tool loop.

## Files

- `index.html` - larger standalone chat widget UI.
- `script.js` - browser-only chat behavior. It sends messages to `/api/chat`.
- `server.js` - Node/Express backend. It loads external data and calls Anthropic.
- `.env.example` - copy this to `.env` and add your real Anthropic API key.
- `data/info.txt` - business policies, services, transit times, FAQs, and contacts.
- `data/rates.xlsx` - replaceable Excel pricing matrix for freight rates.

The old single-file page is preserved as `MNDkitsv3.1.html`.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

```env
ANTHROPIC_API_KEY=your_actual_secret_api_key_here
```

## Run

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

## Updating external data

To update pricing, replace `data/rates.xlsx` with a new spreadsheet that uses
these columns:

- Direction
- Mode
- Carrier
- Container Type
- Min Weight
- Max Weight
- Destination
- Rate
- Currency
- Unit
- Notes

To update policies, FAQs, transit times, or contacts, edit `data/info.txt`.
You can also drop additional `.txt` or `.pdf` files into `data/`; the backend
loads them on startup.
