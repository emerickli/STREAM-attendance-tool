# STREAM Academy attendance scanner

Tablet check-in page. Scan a member QR, see a short confirmation, write the visit to a private Google Sheet.

## Local

Serve the folder over http (camera needs localhost or HTTPS):

```
npx serve .
```

Open the URL on a tablet. Until `js/config.js` has a script URL, the page uses a local `Test Event` so you can try scans.

## Google Sheet

When you are ready to log real rows, follow `apps-script/README.md`. Put the Web app `/exec` URL in `js/config.js`.

Event tabs in the spreadsheet become the dropdown. `Roster` and tabs starting with `_` stay hidden.

Prototype member in `js/members.js`:

```
106902  Kai Emerick Li  12
```

A test QR should encode only `106902`.

## GitHub Pages

1. Push this repo to GitHub.
2. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
3. Open `https://<you>.github.io/STREAM-attendance-tool/` on the tablet.

No build step. `apps-script/` is documentation for Google, not something Pages runs.
