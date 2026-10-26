# Vubio Experiment Planner

A horizontal, connected experiment planner for GitHub Pages. React + TypeScript + Vite; no separate backend or paid hosting required.

## Open the website

After enabling Pages, the address is https://vubio.github.io/planner/.

This repository currently deploys GitHub Pages from **main / (root)**. The root `index.html` loads the prebuilt files under `docs/assets/`. Keep that setting in **Settings → Pages**; the prebuilt website is committed alongside the source, so ordinary changes to the separate `planner-data` branch do not rebuild the page.

## Features

- Horizontal timeline across days and weeks; week/three-day/day scale, last-week/next-week shortcuts, zoom, overnight toggle, current-time indicator.
- Drag tasks; resize every edge or corner, drag to create, Ctrl-drag to snap to half-hour boundaries, right-drag to pan.
- Preparation spans: Shift-drag left on a task, drag the faint span, or enter minutes in task details.
- Shift-click tasks to select several; right-click to group/ungroup, add tags or sticky notes, edit, duplicate, connect, or delete. Right-drag still pans. Grouped items move together, and grouping survives browser/GitHub saves.
- The color palette colors the next task when nothing is selected; with selected tasks it recolors those tasks immediately. New task dialogs focus and select the default title for immediate typing.
- Wide task titles remain inside their blocks. Tall, narrow tasks also keep their titles inside when there is enough height for wrapped text, with only their time range above the block. Truly tiny tasks keep a lightweight nearby external title, with small nudges to reduce crowding (some overlap is allowed). Single-click a visible title to rename it directly on the canvas, Enter to save, or Escape to cancel. Drag the block itself to move the task; double-click elsewhere on the block for its detailed editor.
- Tasks with checklist steps display a highlighted, clickable completion counter (for example, 0/2); click to check off, rename, add, or remove steps in a quick popup without opening full task details.
- Project names are optional and blank for new tasks. Named projects show a prominent, color-coded chip; older tasks with the placeholder "New project" are treated as unassigned until edited.
- Double-click to create and edit tasks, notes, checklists, priorities, colors, and outcomes.
- Solid/dashed branching arrows. Select a task → Connect → select its successor, or Alt-drag between tasks. Cycles are rejected.
- Failed/stopped tasks fade downstream steps. Done tasks have a completion marker.
- Project, connected-sequence, individual-task, color, priority and tag filters; search across all stored tasks.
- Compact canvas sticky notes for Ask & discuss, task-attached labels, and scratchpad. Notes expand after 5 seconds of continuous hover, or immediately on click; dragging does not expand them.
- Browser autosave, opt-in GitHub autosync, undo, manual snapshots, automatic week-rollover snapshots, JSON backup import/export, standalone HTML snapshot exports.

## Data storage — browser first, optional GitHub sync

Every change is saved in **localStorage on the current browser first**. The floating status button in the lower right shows whether the database is also current on GitHub. A locally saved edit is **not** necessarily a successful GitHub save; wait for the green **GitHub saved** status before switching devices.

**Save now · GitHub** saves to this browser and then attempts a GitHub upload. If this computer is not yet authorized, it opens GitHub sync settings. Each browser/device needs its own write token; being signed into GitHub in a different browser is not sufficient. If the browser and GitHub contain conflicting versions, the planner asks you to review them before replacing either copy.

When enabled, GitHub saves the complete task database, connections, attached labels, sticky notes and weekly archives as `planner.json` on the separate [`planner-data` branch](https://github.com/vubio/planner/tree/planner-data). The website continues to deploy from `main`, so database updates do not redeploy the website. The branch and database are **publicly readable** because this repository is public. Do not put confidential research data into it.

### First time: upload the lab computer's database

**Do this first on the computer showing the up-to-date lab tasks**; avoid uploading a blank or outdated copy from another device.

1. Open [GitHub fine-grained token settings](https://github.com/settings/personal-access-tokens/new) while signed in as the repository owner.
2. Create a token with **Only select repositories → `vubio/planner`** and **Repository permissions → Contents → Read and write**; leave other permissions unchanged. Select an expiration convenient for you.
3. Open the planner and click the floating **GitHub** status button near the bottom-right corner. Paste the token under **Allow saving from this computer** and click **Connect GitHub**. The token is saved in the current browser only (if **Remember on this device** is selected) and is **never saved to `planner.json` or committed to the repository**. Don't share it in chat or screenshots.
4. On the lab computer, click **Upload this browser** and confirm. Wait for the green **GitHub saved · [time]** badge. This creates the first shared database file; until you do this, existing lab work is only in the lab browser.
5. On another computer, open [the same planner website](https://vubio.github.io/planner/). If its browser database is empty, the GitHub copy loads automatically. To make changes on that computer and save them back to GitHub, connect the same token or a separate repo-scoped token there too.

After initial connection, subsequent edits are uploaded automatically shortly after the browser save. GitHub saves are checked on return to the tab and periodically. If the browser copy has not changed since its last GitHub save, a newer GitHub version can load automatically. **When both devices contain different unsynchronized work, the planner pauses and asks you to choose a version; it does not silently merge or discard either one.** The **Load GitHub copy** action first downloads a browser JSON safety backup if it is replacing existing work. Uploading one browser's version over a different GitHub copy needs explicit confirmation; prior GitHub versions remain in commit history.

You can use the planner without a token or without internet; it will still save locally, but the status badge will tell you it is not yet synced. If GitHub access expires or saving fails, renew your token and reconnect without deleting any browser data.

### Existing optional Google Drive backup and restore

The earlier Google Drive integration is still present but is separate from GitHub sync. It is not needed for the new GitHub database and has not been removed.

### Optional Google Drive backup and restore

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** for the project.
3. Configure the OAuth consent screen. If the app is in Testing, include your Google account as a test user.
4. Create an OAuth **Web application** client. Add `https://vubio.github.io` (without trailing slash) to Authorized JavaScript origins; for local testing, also add your localhost development origin.
5. On the planner, choose **Google Drive**, enter the Web client ID ending with `.apps.googleusercontent.com`, and connect your account.
6. Use **Upload this planner** to send the current browser copy to the hidden Drive application-data folder. On another computer, connect using the same client ID and choose **Restore from Drive** before editing.

This only asks for `drive.appdata` permission and cannot browse the rest of your Drive. Never enter an OAuth client secret. Sync is deliberately manual and **does not merge changes** from multiple devices. Upload replaces the previous Drive copy. Restore replaces the current browser copy after downloading a safety backup, then reloads the planner. Avoid simultaneous edits on different devices. OAuth login may require reconnection after reloading.

Export backups periodically as an additional precaution. Clearing browser site data, using private browsing, or changing computers can remove the local copy and the locally stored writing token. A JSON backup contains tasks and archives; HTML snapshot exports contain an independent SVG timeline and readable task table, so they remain readable after app redesigns.

Automatic snapshots preserve the previous active week's last saved state when the planner next opens or detects a new week while open. Nothing executes while the browser is closed. Manual snapshots capture immediately. Weeks with no activity do not generate artificial snapshots. Browser quota errors are reported; export before clearing anything.

The code includes local revision checks and GitHub file-SHA conflict detection. Avoid simultaneous edits on multiple devices; conflicting edits require you to choose the version to keep. This is a personal planning tool, not a regulated laboratory record system.

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
- `src/githubStore.ts`: GitHub Contents API, serialization, and cloud revision checks
- `src/GithubSyncPanel.tsx`: cross-device autosync and explicit conflict-resolution interface
- `src/style.css`: responsive UI styles
- `tests/`: validation, graph, export, and GitHub database integration tests
- `docs/`: ready-to-publish static website

## Verification

Production build and TypeScript checks pass. Model tests cover malformed backups, graph traversal, and HTML escaping. Browser checks cover creating/editing tasks, checklists, local persistence, and manual snapshot creation. Full live GitHub Pages verification requires Pages to be enabled in repository settings.
