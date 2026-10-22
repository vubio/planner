import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
// GitHub Pages is currently configured for main/(root). Keep docs/ as an alternate publish target.
const compiled=readFileSync(new URL('../docs/app-entry.html',import.meta.url),'utf8');
writeFileSync(new URL('../index.html',import.meta.url),compiled.replaceAll('/planner/assets/','/planner/docs/assets/'));
copyFileSync(new URL('../docs/app-entry.html',import.meta.url),new URL('../docs/index.html',import.meta.url));
