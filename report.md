## What you checked
Opened the board on its deployed https address; the loader showed, then tonight's incidents rendered newest first. Acked INC-6226 in the second row: the row shows an acked mark and the console logged the sealed receipt. Left the board open about 8 seconds — it kept refreshing every 2 s without a reload, and the build sha (d66b893550ad) shows in the footer. Times render in the viewer's local zone (Europe/Warsaw, dd/mm in the en-GB recording context).

## When
0:02 — the ack mark appears, ~1.9 s after navigation start. The recording runs ~14 s: open (loader → list), ack, board left open.

## Where
- Loader removed after first fetch: app/app.js:43-46
- Rows with ack button and acked mark: app/app.js:22-34
- Ack click handler calling api.ack(id): app/app.js:57-71
- 2-second refresh loop: app/app.js:73-74
- Local-time formatting, dd/mm for day-first locales: app/app.js:10-18
- Build sha in meta and footer: app/index.html:7,20

## Options for product
- Keep ack state in the board session only (current: acks reset on reload) or persist acked ids per on-call shift.
- Ack during refresh could race: the click handler re-renders could drop the ack mark until the set replays it — currently held in a session `acked` set; product could ask for server-side ack state in the feed.
- The empty state ("no incidents tonight") shows only while zero incidents exist; product could decide whether watchers want a "last checked" timestamp too.

```evidence
{
  "flow": "ack-incident",
  "at": "0:02",
  "receipt": "a1.QJfw-lidPWR1A87m.SGTg7q3zM9Wg1jU69-td9qi1zvjQyhUTianjN6c4te9O_PTLFexTWRogCY0y0TZEtiJ8fnAgYy-uP41V29lw9SlWzGuo8sYhslDFoov3Z8IWOv7NFve-GOB3Onw2Gsrkw28UfB-sr-Gnx8n_CYfpyyvvl6xuYnjq0SFW7gbhUp5vdgM_RlVLGmdTwacaSlA87DU",
  "sha": "d66b893550ad",
  "videoLink": "https://kamil-zbroniec.github.io/sched-prod-board/media/board-recording.webm"
}
```
