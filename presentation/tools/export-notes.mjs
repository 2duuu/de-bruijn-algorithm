// Exports js/notes.js to PRESENTER_SCRIPT.md and reports timing.
// Usage: node tools/export-notes.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "js", "notes.js"), "utf8"), ctx);
const notes = ctx.window.NOTES;
const src = fs.readFileSync(path.join(root, "js", "slides.js"), "utf8");
const meta = [...src.matchAll(/title: "([^"]+)", duration: (\d+)/g)].map((m) => ({ title: m[1], duration: +m[2] }));
if (meta.length !== notes.length) throw new Error(`slides ${meta.length} vs notes ${notes.length}`);

const words = (s) => (s || "").replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(Boolean).length;
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const WPM = 140; // natural technical speaking pace
let md = `# Presenter script — When De Bruijn Graphs Break\n\nTudor Pisica & Andrei Stan · Monday 23 November 2026 · target 20:00\n\n` +
  `Bracketed cues such as [→] or [Play] mark when to click. Spoken-script time is estimated at ${WPM} words per minute; the remainder of each slot is for pauses and demos.\n\n` +
  `| # | Slide | Target | Script words | ≈ spoken |\n|---|---|---|---|---|\n`;
let tT = 0, tW = 0;
meta.forEach((m, i) => { const w = words(notes[i].script); tT += m.duration; tW += w; md += `| ${i + 1} | ${m.title} | ${fmt(m.duration)} | ${w} | ${fmt(Math.round((w / WPM) * 60))} |\n`; });
md += `| | **Total** | **${fmt(tT)}** | **${tW}** | **${fmt(Math.round((tW / WPM) * 60))}** |\n\n---\n\n`;
meta.forEach((m, i) => {
  const n = notes[i];
  md += `## ${i + 1}. ${m.title} — ${fmt(m.duration)}\n\n**Argument.** ${n.argument}\n\n**Points to make**\n${n.points.map((p) => `- ${p}`).join("\n")}\n\n` +
    `**Demo / controls.** ${n.demo}\n\n**Script.**\n\n> ${n.script}\n\n**Transition.** ${n.transition}\n\n---\n\n`;
});
fs.writeFileSync(path.join(root, "PRESENTER_SCRIPT.md"), md);
console.log(`slides=${meta.length} target=${fmt(tT)} words=${tW} spoken≈${fmt(Math.round((tW / WPM) * 60))}`);
meta.forEach((m, i) => console.log(`${i + 1}\t${m.duration}s\t${words(notes[i].script)}w\t${Math.round(words(notes[i].script) / WPM * 60)}s`));
