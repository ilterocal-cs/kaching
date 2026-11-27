# CLAUDE.md

Context for working on this repository. See `README.md` for the user-facing setup guide.

## What this is

An office "ka-ching" sales display. One static page (`index.html`) subscribes to an ntfy.sh topic and, for every sale message, plays a synthesized cash-register sound, animates the amount in register pop-up tabs, and bursts coins on a canvas. Between sales it shows today's total in EUR, sale count and a till roll of recent sales.

Currently live for one market, Poland (PLN). Defaults already include PL, SE, DK, FI, EE, UK, ES and CZ (see `defaults.markets` and the README table; keep them in sync). It is designed to become multi-country: each market maps to a currency and a fixed rate to EUR, and totals are summed in EUR.

The PostHog sale event `loan_issued` sends only `amount` (local currency) and `market` (e.g. `PL`).

Data flow: platform → PostHog `loan_issued` event → PostHog HTTP Webhook destination → `https://ntfy.sh/<topic>` → page via SSE.

Hosted on GitHub Pages: https://ilterocal-cs.github.io/kaching/

## Hard constraints

- **Single file, no build.** All HTML, CSS and JS live in `index.html`. No bundler, framework, npm packages or transpilation. It must work by opening the file from GitHub Pages.
- **No backend.** ntfy.sh is the only relay. Don't add servers, serverless functions or API keys without the user asking.
- **No secrets in the repo.** The repo is public. Never commit a topic name, PostHog key or token. The topic comes from the URL (`?topic=`) or the settings dialog and is stored in `localStorage`.
- **No audio or image files.** The sound is synthesized with the Web Audio API and coins are drawn on a canvas. Keep it that way unless asked.
- **Only external resources:** ntfy.sh (the data) and Google Fonts (Big Shoulders Display, Instrument Sans), with system font fallbacks. The page must still work if fonts fail to load.

## Code map (inside the `<script>` IIFE in `index.html`)

| Section | Responsibility |
| --- | --- |
| storage | `load` / `store` wrappers around `localStorage` (try/catch, never throw) |
| config | `BASE` (`"EUR"`), `defaults`, merge saved config, apply URL params (`topic`, `markets`, `market`, `big`, `sound=0`) |
| markets | `MARKET_RE`, `validCurrency`, `parseMarkets(text)`, `marketsToText` |
| day state | `todayKey`, `startOfDay`, `freshDay`, `day` object (reset if date, topic or market differs), `shownTotal` / `shownCount` |
| formatting | `fmt(value, currency)` via cached `Intl.NumberFormat` (omitted currency = EUR), `fmtTime` |
| rendering | `renderTotals`, `animateTotalTo` (count-up), `renderRoll`, `setStatus` |
| parsing | `toNum`, `cleanStr`, `parseSale(text)` |
| ntfy connection | `connect`, `handle` |
| celebration queue | `queue`, `runQueue`, `celebrate` |
| sound | `audio`, `bell`, `noise`, `kaching(big)` |
| coins | canvas sizing, `coinBurst`, `drawCoins` |
| rollover | `rollover()` on a 30 s interval and before handling messages |
| wake lock / idle | `keepAwake`, `wake` (hides controls and cursor after 3.5 s) |
| settings | `<dialog>` form, `fillMarketSelect` (dropdown built from the markets textarea), topic generator, copy URL, test sale, reset today |
| start | gate overlay unlocks audio, then `renderTotals`, `renderRoll`, `connect` |

## Key behaviours

### ntfy connection

- `EventSource("https://ntfy.sh/<topic>/sse?since=<x>")`, where `x` is `day.lastId` if set, else the Unix timestamp of local midnight. This backfills sales after reloads (ntfy.sh caches about 12 h).
- ntfy sends `open` and `keepalive` as named events and messages as default events. `handle` parses `data` as JSON and only processes `event === "message"`.
- On error the stream is closed and `connect` is retried after 4 s with the latest `lastId`. Don't rely on EventSource's built-in reconnect, which would reuse the old `since`.
- Deduplication: `day.ids` holds seen message IDs (capped at 3000). Always check it before counting.
- Messages with `time` before local midnight only advance `lastId`; they are not counted.
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
- The main screen label reads `Today · <market>`.

### Celebration queue

- Live sales go into `queue`; `runQueue` plays them one at a time.
- Hold time is 4200 ms, or 2200 ms when more than two are waiting.
- `s.eur >= cfg.big` (EUR) triggers the bigger sound (second bell and coin pings) and 140 coins instead of 60.
- The total animates up after each celebration finishes, so the screen counts the sale it just showed.
- Test sales (`test: true`) celebrate but never touch totals or the roll.

### Sound

- Browsers block audio until a user gesture. The start gate's click calls `audio()` to create and resume the `AudioContext`. Keep that gate.
- `kaching` = noise burst + falling triangle thunk ("ka") then two inharmonic bell stacks ("ching").

### Day rollover

- `day.key` is the local date. `rollover()` resets totals at midnight but keeps `lastId` so the stream isn't replayed.
- "Reset today" keeps `ids` and `lastId` so already-seen messages aren't counted again.
- `day.topic` records the topic. Loading with a different topic (settings or `?topic=`) starts a fresh day, so a `lastId` from another topic is never used as `?since=`.

## localStorage schema

```js
// "kaching.cfg.v2"
{
  topic: string,
  market: string,                                   // selected market, e.g. "PL"
  markets: { [market]: { currency: string, rate: number } },  // rate to EUR
  big: number,                                      // EUR
  sound: boolean
}

// "kaching.day.v2"
{
  key: "YYYY-M-D",          // local date
  topic: string,            // topic this day state belongs to
  market: string,           // market this day state belongs to
  total: number,            // EUR
  count: number,
  ids: string[],            // seen ntfy message IDs, max 3000
  lastId: string | null,    // last ntfy message ID, used for ?since=
  sales: [{ t: unixSeconds, amount: number, currency: string, market: string,
             eur: number, label: string }] // newest first, max 60, amount in local currency
}
```

If you change either shape incompatibly, bump the key suffix (`.v2`) rather than migrating.

## Design

- Theme: vintage cash register. Enamel green background, brass for the total and register frame, paper-coloured pop-up tabs and till roll.
- Colours are CSS variables on `:root` with a dark set under `prefers-color-scheme: dark`. Add new colours as variables, never hard-coded in components (the till roll and dialog intentionally stay paper-coloured in both themes).
- Fonts: Big Shoulders Display for numbers and headings, Instrument Sans for text.
- `prefers-reduced-motion`: no tab animation, no coins, no pulse.
- Layout collapses to one column under 760 px.
- The main screen is meant to be read from across a room: big type, minimal text, controls hidden when idle.
- Copy: sentence case, plain words, typographic apostrophes (’) in visible text.

## Testing

There are no automated tests. To check changes:

1. Serve locally: `python3 -m http.server 8000` and open `http://localhost:8000/?topic=<test-topic>`. Use a throwaway topic, not the production one.
2. Publish test messages:
   ```bash
   curl -d '{"amount": 199, "market": "PL"}' https://ntfy.sh/<test-topic>
   curl -d '{"amount": 3000, "market": "PL"}' https://ntfy.sh/<test-topic>   # big sale (≈ €690)
   curl -d '{"amount": -20, "market": "PL"}' https://ntfy.sh/<test-topic>    # refund
   curl -d '{"amount": "49,90", "market": "pl"}' https://ntfy.sh/<test-topic> # decimal comma, lower-case market
   curl -d '{"amount": 50, "market": "SE"}' https://ntfy.sh/<test-topic>     # other market: must be ignored on a PL screen
   curl -d '49.90' https://ntfy.sh/<test-topic>                              # plain number: must be ignored
   curl -d '{"amount": ""}' https://ntfy.sh/<test-topic>                     # must be ignored
   ```
3. Send several in a row to check queueing, reload to check backfill and dedupe, and toggle the OS dark mode.
4. Syntax check the script after edits, e.g. extract the `<script>` contents and run `node --check`.

## Deployment

GitHub Pages, `main` branch, repo root. The served file must be `index.html`. Pushing to `main` deploys within a minute or two.

## Possible future work (only if asked)

- Cloudflare Worker relay: verify a webhook secret, keep the topic private, and fetch an authoritative daily total from the PostHog API server-side.
- Daily goal bar, per-market colours or flags, a custom uploaded sound.
- Per-market subtotals on the main screen.
- Fetch EUR rates automatically (would need a CORS-friendly rates API).
