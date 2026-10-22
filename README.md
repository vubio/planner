# Vubio Experiment Planner

A horizontal, connected experiment planner for GitHub Pages. React + TypeScript + Vite; no server, account, or paid hosting required.

## Open the website

After enabling Pages, the address is https://vubio.github.io/planner/.

In this repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/docs**, then **Save**. The prebuilt website is included in `docs/`; no Actions or build setup is required to publish the first version.

## Features

- Horizontal timeline across days and weeks; week/day scale, zoom, overnight toggle, current-time indicator.
- Drag tasks; resize right edge for duration and bottom edge for visual height.
- Preparation spans: Shift-drag left on a task, drag the faint span, or enter minutes in task details.
- Double-click to create and edit tasks, notes, checklists, priorities, colors, and outcomes.
- Solid/dashed branching arrows. Select a task → Connect → select its successor. Double-click an arrow to remove it. Cycles are rejected.
- Failed/stopped tasks fade downstream steps. Done tasks have a completion marker.
- Project, connected-sequence, and individual-task filters; search across all stored tasks.
- Separate questions/discussions and scratchpad.
- Browser autosave, undo, manual snapshots, automatic week-rollover snapshots, JSON backup import/export, standalone HTML snapshot exports.

## Data storage — read this first

Data is stored in **localStorage on the current browser and device**. It is not uploaded to the public GitHub repository. Other visitors get their own empty planner. Optional manual backup/restore with your own Google Drive is available via the **Google Drive** button.

### Optional Google Drive backup and restore

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** for the project.
3. Configure the OAuth consent screen. If the app is in Testing, include your Google account as a test user.
4. Create an OAuth **Web application** client. Add `https://vubio.github.io` (without trailing slash) to Authorized JavaScript origins; for local testing, also add your localhost development origin.
5. On the planner, choose **Google Drive**, enter the Web client ID ending with `.apps.googleusercontent.com`, and connect your account.
6. Use **Upload this planner** to send the current browser copy to the hidden Drive application-data folder. On another computer, connect using the same client ID and choose **Restore from Drive** before editing.

This only asks for `drive.appdata` permission and cannot browse the rest of your Drive. Never enter an OAuth client secret. Sync is deliberately manual and **does not merge changes** from multiple devices. Upload replaces the previous Drive copy. Restore replaces the current browser copy after downloading a safety backup, then reloads the planner. Avoid simultaneous edits on different devices. OAuth login may require reconnection after reloading.

Export backups regularly. Clearing site data, using private browsing, or changing computers can remove or separate your data. A JSON backup contains tasks and archives; import it to move computers. HTML snapshot exports contain an independent SVG timeline and readable task table, so they remain readable after app redesigns.

Automatic snapshots preserve the previous active week's last saved state when the planner next opens or detects a new week while open. Nothing executes while the browser is closed. Manual snapshots capture immediately. Weeks with no activity do not generate artificial snapshots. Browser quota errors are reported; export before clearing anything.

The code includes basic revision checks to detect stale tabs. Avoid editing the same planner simultaneously in multiple tabs. This is a personal planning tool, not a regulated laboratory record system.

## Development

Use Node 22.13+ (Node 24 recommended).

```sh
npm install
npm run dev
npm test
npm run build
```

The website uses the `/planner/` base path. Open the address printed by Vite with `/planner/` appended. `npm run build` updates `docs/`. Commit source and updated `docs/` together; GitHub Pages publishes the new build.

## Structure

- `src/Planner.tsx`: timeline and planner UI
- `src/model.ts`: backup validation, graph traversal, independent snapshot rendering
- `src/style.css`: responsive UI styles
- `tests/model.test.mjs`: validation, graph and export checks
- `docs/`: ready-to-publish static website

## Verification

Production build and TypeScript checks pass. Model tests cover malformed backups, graph traversal, and HTML escaping. Browser checks cover creating/editing tasks, checklists, local persistence, and manual snapshot creation. Full live GitHub Pages verification requires Pages to be enabled in repository settings.
