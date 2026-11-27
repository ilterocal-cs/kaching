# Ka-ching

A full-screen sales display for the office. Every time a sale happens on our platform, the screen plays a cash-register "ka-ching", pops the amount up in register-style number tabs, and showers the screen with coins. Between sales it shows today's total in euros, the number of sales, and a "till roll" of recent sales.

It currently runs for Poland (PLN), with seven more markets already set up for later. Each market has its own currency and a rate to EUR, and the daily total is summed in EUR.

It is a single static HTML file. There is no backend, no build step and no dependencies.

**Live:** https://ilterocal-cs.github.io/kaching/

## How it works

```
Platform ──(sale event)──▶ PostHog ──(HTTP Webhook destination)──▶ ntfy.sh topic ──(live stream)──▶ index.html on the office screen
```

1. Our platform already sends a sale event, `loan_issued`, to PostHog.
2. A PostHog **HTTP Webhook destination** forwards each sale event to an **ntfy.sh topic** URL.
3. The display page subscribes to that topic with Server-Sent Events and celebrates each message.

ntfy.sh is a free public pub/sub service. A topic is just a name in the URL (`https://ntfy.sh/<topic>`); it needs no account and is created on first use.

## Setup

### 1. Pick a topic

Open the page, tap **Start display**, open **Settings** (gear icon) and click **Generate**. Pick the screen's **Market**, copy the webhook URL it shows, then **Save**.

Use a long, random topic name. Anyone who knows it can read the sales stream and post fake sales.

### 2. Connect PostHog

In PostHog: **Data pipelines → New → Destination → HTTP Webhook**.

| Setting | Value |
| --- | --- |
| Webhook URL | `https://ntfy.sh/<your-topic>` |
| Method | `POST` |
| Filter | Only the `loan_issued` event |
| Body | See below |

```json
{
  "amount": "{event.properties.amount}",
  "market": "{event.properties.market}"
}
```

The `loan_issued` event has two properties, `amount` (in the market's local currency) and `market` (e.g. `PL`). Both are required. Optionally add `label` to show a product name. Keep the body small: ntfy.sh limits messages to about 4 KB.

Use the destination's test button. The display should ka-ching within a few seconds.

### 3. Put it on the office screen

Open the page on the tablet or TV with the topic in the URL, tap **Start display**, and use the full-screen button:

```
https://ilterocal-cs.github.io/kaching/?topic=<your-topic>
```

A tablet or a Fire TV stick with a full browser works better than most built-in smart-TV browsers.

## URL parameters

All settings can be passed in the URL, so one link sets up any screen. URL values override and are saved to that browser.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `topic` | (none) | ntfy topic to listen to. Required. |
| `markets` | see [Markets](#markets-and-currencies) | Market list as `market:currency:rate`, comma-separated, e.g. `PL:PLN:0.23,CZ:CZK:0.04`. |
| `market` | `PL` | The market this screen shows. Only sales with this `market` are counted. Must be in the list. |
| `big` | `500` | Sales worth at least this many euros get a bigger celebration and sound. |
| `sound` | on | `sound=0` mutes the display. |

## Markets and currencies

Each market maps to a local currency and a rate to EUR:

| Market | Country | Currency | Rate to EUR |
| --- | --- | --- | --- |
| `PL` | Poland | `PLN` | `0.23` |
| `SE` | Sweden | `SEK` | `0.09` |
| `DK` | Denmark | `DKK` | `0.134` |
| `FI` | Finland | `EUR` | `1` |
| `EE` | Estonia | `EUR` | `1` |
| `UK` | United Kingdom | `GBP` | `1.17` |
| `ES` | Spain | `EUR` | `1` |
| `CZ` | Czechia | `CZK` | `0.04` |

`PL PLN 0.23` means 100 PLN counts as €23 in the total. The market code must match what the PostHog event sends (we use `UK`, not the ISO code `GB`).

These are the built-in defaults. Edit the list in **Settings → Markets and rates** (one per line, `PL PLN 0.23`) or with the `markets` URL parameter. To add a country, add a line, e.g. `NO NOK 0.085`; it then appears in the **Market** dropdown.

**Each screen shows one market.** Pick it in **Settings → Market** or with `?market=PL`. All markets can post to the same ntfy topic; a screen ignores sales from other markets. Changing the market starts a fresh day and re-reads today's sales for the new market from ntfy.

- Each sale is shown in its local currency (e.g. `+199,00 zł`). The celebration also shows the EUR value.
- The daily total and the big-sale threshold are in EUR.
- Rates are fixed numbers you set by hand. They are not fetched live. Update them now and then.
- Changing a rate only affects new sales. Sales already counted today keep the rate they were counted with.

## Message format

The page accepts a JSON body:

```json
{"amount": 199.00, "market": "PL"}
```

- `amount` is in the market's local currency. It can be a number or a string (`"49.90"`, `"49,90"`, `"49.90 zł"`).
- `market` must match the screen's selected market (case doesn't matter). Other markets are ignored.
- Negative amounts (refunds) show in red and subtract from the total.
- `label` (or `product` / `name`) appears on the till roll and under the celebration.
- Messages without a readable amount or without a matching market are ignored.

## Testing

Send a fake sale from a terminal:

```bash
curl -d '{"amount": 199, "market": "PL"}' https://ntfy.sh/<your-topic>
```

Or open `https://ntfy.sh/<your-topic>` in a browser and publish `{"amount": 199, "market": "PL"}` from ntfy's web page.

**Settings → Play a test sale** runs the celebration locally without touching ntfy or the totals.

## Behaviour notes

- **Sound needs one tap.** Browsers block audio until the page is clicked, which is why the page starts with a **Start display** button.
- **Totals reset at local midnight.**
- **Reloads don't lose sales.** On connect, the page asks ntfy for everything since the last message it saw, or since midnight. ntfy.sh keeps messages for about 12 hours, so a screen that was off longer than that will miss some. Missed sales are counted silently, without a celebration.
- **State is per browser.** Totals and settings live in `localStorage` on each screen. Two screens count independently.
- **Changing the topic starts a fresh day,** whether you change it in Settings or open a link with a different `?topic=`. Sales from today on the new topic are pulled in again from ntfy.
- **Screen stays awake** where the browser supports the Wake Lock API.

## Limitations

- The topic is security by obscurity. Anyone with the name can read or post.
- ntfy.sh's free tier has rate limits for anonymous use. Fine for normal sales volume; for very high volume, use an ntfy account or self-host ntfy.
- The daily total is what this screen has seen, not an authoritative figure from PostHog.
- The EUR total is an estimate based on the fixed rates in Settings, not real exchange rates.

A Cloudflare Worker could later replace ntfy to verify a webhook secret and fetch authoritative totals from the PostHog API without exposing an API key.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Status says "Not set up: open settings" | No valid topic. Open Settings or add `?topic=` to the URL. |
| Status stuck on "Connection lost, retrying…" | Network blocks ntfy.sh, or the topic name has invalid characters (allowed: letters, digits, `-`, `_`). |
| Sale arrives but no sound | Tap **Start display** after loading; check **Sound** in Settings and the device volume. |
| Sale arrives but nothing shows | The message's `market` doesn't match the screen's market, or `amount` is missing. Check the PostHog body and **Settings → Market**. |
| GitHub Pages 404 | Use `https://ilterocal-cs.github.io/kaching/` (with `/kaching/`). The file must be named `index.html` in the repo root, and the repo must be public. |

## Deployment

Hosted on GitHub Pages from the `main` branch, root folder. Push or upload a new `index.html` and the site updates within a minute or two.
