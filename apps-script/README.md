# Apps Script deploy

This is the only Google setup the scanner needs.

## What to send back

After you finish the steps below, paste the Web app URL (it ends in `/exec`) into chat or into `js/config.js` as `SCRIPT_URL`.

## Sheet

1. Create a Google Spreadsheet on your account. That file is the master attendance book.
2. You can leave the first tab as `Sheet1` or rename it later. Event tabs can also be created from the scanner dropdown.
3. Optional: add a tab named `Roster`. Tabs named `Roster` or starting with `_` stay out of the event list.

Each event is one tab. Row 1 on a new tab becomes `Timestamp | Name | Grade | ID`.

## Script

1. In that spreadsheet: Extensions → Apps Script.
2. Delete the default code and paste `Code.gs` from this folder.
3. Save.
4. Deploy → New deployment → type **Web app**.
5. Execute as: **Me**. Who has access: **Anyone**.
6. Authorize Google when asked (spreadsheet + Apps Script).
7. Copy the Web app URL. It looks like `https://script.google.com/macros/s/.../exec`.

If you change `Code.gs` later, Deploy → Manage deployments → the existing deployment → pencil → New version.

The page never sees your Google login. It only calls that URL to list tabs, create a tab, and append a check-in row.
