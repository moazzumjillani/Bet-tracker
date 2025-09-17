Bet Event Exposure (Offline PWA)
================================

What it does
------------
- Import your bookmaker HTML export (like your Betseven file).
- Filter to accepted + unsettled slips.
- Count FULL slip stake for EVERY leg (even if that leg shows "won" but the parlay isn't finished).
- Normalize labels so duplicates collapse.
- Surface a vivid dashboard with the event overview table, automatic "Top accumulator pairs" card, and the combined exposure selectors for two- or three-event overlap totals (stakes counted once per qualifying slip).
- Works fully offline after first load (PWA, service worker).

How to deploy on Netlify (1 minute)
-----------------------------------
1) Go to https://app.netlify.com/ → "Add new site" → "Deploy manually".
2) Drag-and-drop the entire folder you got from this ZIP (or upload via CLI).
3) Netlify gives you a secure HTTPS URL like https://your-site.netlify.app/

How to install on iPhone (PWA)
------------------------------
1) Open the Netlify URL in Safari.
2) Tap the Share button → "Add to Home Screen".
3) Open the new app icon once to cache it. It now works OFFLINE.

How to use
----------
1) Tap "Import HTML" and pick your bet-history .html file from Files.
2) Wait a moment while it parses.
3) The dashboard fills with:
   - **Event overview** — totals the full stake for each unique event.
   - **Top accumulator pairs** — highlights the five two-leg combinations that occur most often, with their combined stake.
   - **Combined exposure** — lets you pick any two or three events to see how many unsettled accumulators include *all* of them and the total stake tied up in those slips.
4) Use the search box to filter the overview table and tap column headers to sort. Reset clears the imported data, filters, and cards so you can load a new file.

Notes
-----
- All parsing happens ON-DEVICE. Your file never leaves your phone.
- If some rows don't appear, open "Parser diagnostics" to see what was recognized.
- This parser uses robust heuristics; if your export format changes, send a sample to refine the selector profile.
- The "Top accumulator pairs" card refreshes automatically after every import or reset, and the combined exposure selectors only calculate when you pick distinct events.
