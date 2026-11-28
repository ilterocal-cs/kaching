# CLAUDE.md

Context for working on this repository. See `README.md` for the user-facing setup guide.

## What this is

An office "ka-ching" sales display. A static page (`public/index.html` + `public/assets/`) subscribes to an ntfy.sh topic and, for every sale message, plays a synthesized cash-register sound, animates the amount in register pop-up tabs, and bursts coins on a canvas. Between sales it shows today's total in EUR, sale count and a till roll of recent sales.

Currently live for one market, Poland (PLN). Defaults already include PL, SE, DK, FI, EE, UK, ES and CZ (see `defaults.markets` and the README table; keep them in sync). It is designed to become multi-country: each market maps to a currency and a fixed rate to EUR, and totals are summed in EUR.

The PostHog sale event `loan_issued` sends only `amount` (local currency) and `market` (e.g. `PL`).

Data flow: platform → PostHog `loan_issued` event → PostHog HTTP Webhook destination → `https://ntfy.sh/<topic>` → page via SSE.

Hosted on GitHub Pages: https://ilterocal-cs.github.io/kaching/ (deployed from `public/` by a GitHub Actions workflow).

## Hard constraints

- **Only `public/` is served.** Everything the browser loads lives in `public/`: `public/index.html` (markup only), `public/assets/css/style.css`, and native ES modules in `public/assets/js/`. Tooling and docs (`build.mjs`, `tunnel.sh`, `*.md`, `.githooks/`, `.github/`) stay at the repo root and are never published. Never put anything private in `public/`.
- **Plain static files, no bundler.** No framework, npm packages, transpilation or bundling.
- **Cache busting via `build.mjs`.** It hashes every file in `public/assets/` and rewrites the `<!-- build:assets -->` block in `public/index.html` (stylesheet link, import map, modulepreload links, entry script), all with `?v=<hash>`. Never edit that block by hand. Modules import each other with plain relative paths (`./ui.js`); the import map redirects them to the hashed URLs. Run `node build.mjs` after changing assets; the pre-commit hook in `.githooks/` does it automatically (enable once per clone with `git config core.hooksPath .githooks`). `node build.mjs --check` fails if hashes are stale. The deploy workflow also runs `node build.mjs` before publishing.
- **Adding a file:** new `.css`/`.js` files in `public/assets/css` or `public/assets/js` are picked up by `build.mjs` automatically. Only `main.js` is loaded directly; other modules must be imported from it or its imports.
- **ES modules need HTTP.** Opening `public/index.html` via `file://` won't work; use a local server (see Testing).
- **No backend.** ntfy.sh is the only relay. Don't add servers, serverless functions or API keys without the user asking.
- **No secrets in the repo.** The repo is public. Never commit a topic name, PostHog key or token. The topic comes from the URL (`?topic=`) or the settings dialog and is stored in `localStorage`.
- **Keep `<meta name="robots" content="noindex, nofollow">`** in `public/index.html` so search engines don't index the live page.
- **No audio or image files.** The sound is synthesized with the Web Audio API and coins are drawn on a canvas. Keep it that way unless asked.
- **Only external resources:** ntfy.sh (the data) and Google Fonts (Big Shoulders Display, Instrument Sans), with system font fallbacks. The page must still work if fonts fail to load.

## Code map (`public/assets/js/`)

One ES module per job; each file starts with a comment saying what it does. `main.js` is the entry point.

Shared state: `cfg` (config.js) and `day` (day.js) are exported `let` live bindings. Importers can read and mutate their fields but must replace them only via `setCfg()` / `setDay()`. The shown (animated) total lives privately in `ui.js`.

Dependency direction (no cycles): `util`, `storage`, `qr`, `flags` → `config` → `clock` → `day` → `sales`, `ui`, `sound`, `coins` → `celebrate` → `ledger` → `ntfy` → `settings` → `screen` → `main`. Keep it acyclic: modules with top-level code (`config`, `day`, `ui`) must not import modules that import them.

## Key behaviours

### ntfy connection

- `EventSource("https://ntfy.sh/<topic>/sse?since=<x>")`, where `x` is `day.lastId` if set, else the Unix timestamp of the market's midnight. This backfills sales after reloads (ntfy.sh caches about 12 h).
- ntfy sends `open` and `keepalive` as named events and messages as default events. `handle` parses `data` as JSON and only processes `event === "message"`.
- On error the stream is closed and `connect` is retried after 4 s with the latest `lastId`. Don't rely on EventSource's built-in reconnect, which would reuse the old `since`.
- Deduplication: `day.ids` holds seen message IDs (capped at 3000). Always check it before counting.
- Messages with `time` before the market's midnight only advance `lastId`; they are not counted.
- **Live vs backfill:** a message is "live" if `m.time >= pageStart - 2`. Live sales are queued for a celebration; backfilled ones update totals and the roll silently.

### Parsing (`parseSale`)

- The ntfy `message` is the raw PostHog body, e.g. `{"amount": "199", "market": "PL"}`. Non-JSON messages are ignored.
- **Market filter:** `cleanStr(obj.market).toUpperCase()` must equal `cfg.market`, else return `null`. A screen only ever counts its own market; messages without a market are ignored.
- Amount: `toNum(obj.amount)`, which accepts numbers and strings with currency symbols or a decimal comma. The amount field name is fixed (`amount`).
- Currency and rate come from `cfg.markets[cfg.market]`; `eur = round(amount * rate, 2)`.
- Label: `obj.label || obj.product || obj.name`, max 60 chars.
- `cleanStr` drops empty strings and unrendered templates (`{...}`).
- Return `null` (ignore the message) if the amount isn't finite.
- Ignored messages still advance `lastId` and are added to `ids`.
- PostHog renders missing properties as empty strings, so `""` must stay "no amount", not 0.

### Markets

- `cfg.markets` is `{ PL: { currency: "PLN", rate: 0.23 }, ... }`. Rate means `local * rate = EUR`. EUR markets (FI, EE, ES) use rate 1.
- Market codes follow what PostHog sends: `UK`, not ISO `GB`.
- Saved settings replace the whole `markets` object, so changing `defaults.markets` doesn't reach screens that already saved settings.
- Text form (settings textarea and `?markets=`): items `PL PLN 0.23` or `PL:PLN:0.23`, separated by newlines, `;`, or a comma followed by a letter (so `0,23` still works as a rate).
- `cfg.market` is the screen's selected market (settings dropdown or `?market=`). It must be a key of `cfg.markets`; it falls back to the first key.
- Changing the market resets the day (`day.market` differs) with no `lastId`, so `connect()` replays the stream from midnight and counts today's sales for the new market.
- Rates are fixed and hand-set. Changing them does not recalculate sales already counted today (each sale stores its own `eur`).
- The total, the big-sale threshold (`cfg.big`) and the "≈ €" hint on the celebration are in EUR. Individual sales display in their local currency.
- The main screen label reads `Today · <market>` with the market's flag before it (`flags.js`). Flags are inline SVG on purpose: no image files, and flag emoji don't render on Windows or many TV browsers. A market without a flag entry just shows no flag; when adding a default market, add its flag and its time zone (`ZONES` in `clock.js`) too.

### Celebration queue

- Live sales go into the queue via `enqueue`; `runQueue` plays them one at a time.
- Hold time is 4200 ms, or 2200 ms when more than two are waiting.
- `s.eur >= cfg.big` (EUR) triggers the bigger sound (second bell and coin pings) and 140 coins instead of 60.
- The total animates up after each celebration finishes, so the screen counts the sale it just showed.
- Test sales (`test: true`) celebrate but never touch totals or the roll.

### Sound

- Browsers block audio until a user gesture. The start gate's click calls `audio()` to create and resume the `AudioContext`. Keep that gate.
- `kaching` = noise burst + falling triangle thunk ("ka") then two inharmonic bell stacks ("ching").

### Day rollover

- The day follows the selected market's time zone, not the device's (`clock.js`: `ZONES` maps market → IANA zone, e.g. `PL` → `Europe/Warsaw`; unknown markets use device time). `todayKey()`, `startOfDay()` and the till roll's date and times all use it; `startOfDay()` re-checks the UTC offset at midnight so daylight saving days are right.
- `day.zone` records the zone the day was counted in; a mismatch (or a day saved before zones existed) starts a fresh day that replays from the market's midnight.
- `day.key` is the market's date. `rollover()` resets totals at the market's midnight but keeps `lastId` so the stream isn't replayed.
- "Reset today" keeps `ids` and `lastId` so already-seen messages aren't counted again.
- `day.topic` records the topic. Loading with a different topic (settings or `?topic=`) starts a fresh day, so a `lastId` from another topic is never used as `?since=`.

## localStorage

Keys `kaching.cfg.v2` (shape: `defaults` in `config.js`) and `kaching.day.v2` (shape: `freshDay()` in `day.js`). If you change either shape incompatibly, bump the key suffix (`.v2`) rather than migrating.

## Design

- Theme: vintage cash register. Enamel green background, brass for the total and register frame, paper-coloured pop-up tabs and till roll.
- Colours are CSS variables on `:root` with a dark set under `prefers-color-scheme: dark`. Add new colours as variables, never hard-coded in components (the till roll and dialog intentionally stay paper-coloured in both themes).
- Fonts: Big Shoulders Display for numbers and headings, Instrument Sans for text.
- `prefers-reduced-motion`: no tab animation, no coins, no pulse.
- Layout collapses to one column under 760 px.
- Right column (`.side`) = till roll + setup QR code at the bottom right. The roll shrinks (`min-height: 0`) so it never covers the QR.
- The QR code is generated in-page on purpose: never use a CDN library or an online QR API, because the URL contains the topic. `setupUrl()` includes `topic`, `market`, `big`, `sound=0` when muted, and `markets` only when it differs from `defaults.markets`. Call `renderQr()` whenever `cfg` changes. The QR is 192–300 px wide (`clamp(192px, 16vw, 300px)`) so it scans from a distance. The **Copy link** button under it copies `setupUrl()` (falls back to `prompt()` without clipboard access) and, like the other controls, fades out when idle. Dark modules on paper background in both themes (scanners need dark-on-light).
- The main screen is meant to be read from across a room: big type, minimal text, controls hidden when idle.
- Copy: sentence case, plain words, typographic apostrophes (’) in visible text.
- Visible wording is about loans, not sales: "loans issued", "New loan", "Big loan!", "Test loan", "Play a test loan". Code identifiers (`sale`, `parseSale`, `day.sales`) keep the old names.

## Testing

There are no automated tests. To check changes:

0. Default test parameters (topic, market, big) live in `test.local.env` (`KACHING_TEST_PARAMS`), which is git-ignored. Use them for local testing and test messages; never copy the topic into tracked files.
1. Run `node build.mjs`, then serve locally: `python3 -m http.server 8000 --directory public` and open `http://localhost:8000/?topic=<test-topic>`, or run `./tunnel.sh` for a public HTTPS URL (Cloudflare quick tunnel; runs the build and serves only `public/`). Use a throwaway topic, not the production one.
2. Publish test messages:
   ```bash
   curl -d '{"amount": 199, "market": "PL"}' https://ntfy.sh/<test-topic>
   curl -d '{"amount": 20000, "market": "PL"}' https://ntfy.sh/<test-topic>  # big sale (≈ €4,600)
   curl -d '{"amount": -20, "market": "PL"}' https://ntfy.sh/<test-topic>    # refund
   curl -d '{"amount": "49,90", "market": "pl"}' https://ntfy.sh/<test-topic> # decimal comma, lower-case market
   curl -d '{"amount": 50, "market": "SE"}' https://ntfy.sh/<test-topic>     # other market: must be ignored on a PL screen
   curl -d '49.90' https://ntfy.sh/<test-topic>                              # plain number: must be ignored
   curl -d '{"amount": ""}' https://ntfy.sh/<test-topic>                     # must be ignored
   ```
3. Send several in a row to check queueing, reload to check backfill and dedupe, and toggle the OS dark mode.
4. Syntax check after edits: copy a module to `*.mjs` and run `node --check`, and check the browser console for import errors.
5. After touching the QR encoder, scan the on-screen code with a phone, or decode a screenshot (e.g. OpenCV `QRCodeDetector`), at short and long URLs.

## Deployment

GitHub Pages with Source = **GitHub Actions** (repo Settings → Pages). `.github/workflows/pages.yml` runs on every push to `main`: checkout → `node build.mjs` → upload `public/` → deploy. Live within a minute or two; follow runs in the repo's Actions tab. Branch-based Pages can only serve `/` or `/docs`, which is why the workflow is needed for `public/`.

## Possible future work (only if asked)

- Cloudflare Worker relay: verify a webhook secret, keep the topic private, and fetch an authoritative daily total from the PostHog API server-side.
- Daily goal bar, per-market colours or flags, a custom uploaded sound.
- Per-market subtotals on the main screen.
- Fetch EUR rates automatically (would need a CORS-friendly rates API).
