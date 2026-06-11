#!/usr/bin/env node
// build_versions.mjs — export each historical version of command-center/ so the portal can show a
// version dropdown and render any past version in an iframe — WITHOUT ever touching the working
// tree (the user's #1 constraint: switching versions must never disturb uncommitted changes).
//
// How: `git archive <hash> command-center | tar -x --strip-components=1 -C versions/<hash>/`.
// git archive reads straight from the object database, so the live files are never checked out or
// modified. command-center/versions/ is GITIGNORED (rebuildable from .git); data/versions.json is
// COMMITTED so colleagues see the list and can rebuild locally.
//
// Run manually, or from a git post-commit hook — NOT the Stop hook (versions change on commit, not
// every turn).
//
// Usage: node scripts/build_versions.mjs
import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { REPO, DATA, VERSIONS_DIR, SCRIPTS_DIR } from "./session_lib.mjs";

const MANIFEST = path.join(DATA, "versions.json");

// All git/archive ops run from the repo root (REPO) — that's where .git + the command-center/ pathspec live.
function git(args) {
  return execSync(`git ${args}`, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

function main() {
  // Commits that touched command-center/, newest first: "<hash>\t<iso date>\t<subject>".
  let lines = [];
  try {
    lines = git(`log --format=%h%x09%cI%x09%s -- command-center`).split("\n").filter(Boolean);
  } catch (e) {
    console.error("git log failed:", e.message);
    process.exit(1);
  }

  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  const manifest = [];

  for (const line of lines) {
    const [hash, date, ...subjParts] = line.split("\t");
    const subject = subjParts.join("\t");
    const dest = path.join(VERSIONS_DIR, hash);

    // hasIndex = did this commit contain command-center/index.html at all? (The very first
    // foundation commit predates the portal — its option must be disabled, not load a 404 iframe.)
    let hasIndex = false;
    try { hasIndex = !!git(`ls-tree -r --name-only ${hash} -- command-center/index.html`); } catch { /* */ }

    // hasData = did this commit contain portal-data.js? (Pre-f98ed9c versions render only the
    // static shell because the portal loads its content from that bundle.)
    let hasData = false;
    try { hasData = !!git(`ls-tree -r --name-only ${hash} -- command-center/portal-data.js`); } catch { /* */ }

    // Skip commits with no portal to show (e.g. the pre-portal foundation commit).
    if (!hasIndex) { manifest.push({ hash, date: (date || "").slice(0, 10), datetime: date || "", subject, hasData: false, hasIndex: false }); continue; }

    // Incremental: skip if already extracted (versions are immutable by hash).
    if (!fs.existsSync(path.join(dest, "index.html"))) {
      fs.mkdirSync(dest, { recursive: true });
      // git archive <hash> command-center | tar -x --strip-components=1 -C dest
      const archive = spawnSync("git", ["archive", hash, "command-center"], { cwd: REPO, maxBuffer: 256 * 1024 * 1024 });
      if (archive.status !== 0) { console.error(`archive ${hash} failed`); continue; }
      const untar = spawnSync("tar", ["-x", "--strip-components=1", "-C", dest], { input: archive.stdout, maxBuffer: 256 * 1024 * 1024 });
      if (untar.status !== 0) { console.error(`untar ${hash} failed`); continue; }
    }

    manifest.push({ hash, date: (date || "").slice(0, 10), datetime: date || "", subject, hasData, hasIndex: true });
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Exported ${manifest.length} command-center versions → command-center/versions/ (gitignored); wrote data/versions.json. ${manifest.filter((m) => m.hasData).length} have data bundles.`);

  // Refresh the portal bundles so window.VERSIONS reflects the new manifest.
  try { execSync(`node ${path.join(SCRIPTS_DIR, "build_portal_data.mjs")}`, { cwd: REPO, stdio: "ignore" }); } catch { /* */ }
}

main();
