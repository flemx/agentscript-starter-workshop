#!/usr/bin/env node
// Sync agent source → shipped static resource.
//
// WHY: AiAuthoringBundle (Agent Script `.agent`) CANNOT be packaged, so the package ships each
// agent's afscript as a Static Resource that the launchpad (NextGenAgentDeployer) reads at runtime
// to create/publish/activate the agent. The editable SOURCE OF TRUTH is the bundle:
//   force-app/main/default/aiAuthoringBundles/<Name>/<Name>.agent
// and the SHIPPED copy is:
//   force-app/main/default/staticresources/<Name>_afscript.resource
// These two are byte-identical afscript. This script copies bundle → resource so they can't drift.
//
// USAGE:
//   node scripts/sync_agent_resources.mjs          # write: bundle → resource for every agent
//   node scripts/sync_agent_resources.mjs --check  # verify only; exit 1 if any are out of sync
//
// Only agents that ALREADY have a matching `<Name>_afscript.resource` are synced — i.e. agents the
// package is meant to ship. Bundles with no resource (e.g. a dev-only or hosted-demo agent) are
// skipped and reported.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUNDLES_DIR = path.join(ROOT, "force-app/main/default/aiAuthoringBundles");
const RESOURCES_DIR = path.join(ROOT, "force-app/main/default/staticresources");

const checkOnly = process.argv.includes("--check");

if (!fs.existsSync(BUNDLES_DIR)) {
  console.error(`No bundles dir: ${BUNDLES_DIR}`);
  process.exit(0);
}

const bundles = fs
  .readdirSync(BUNDLES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let synced = 0;
let drifted = 0;
let skipped = [];

for (const name of bundles) {
  const agentFile = path.join(BUNDLES_DIR, name, `${name}.agent`);
  const resourceFile = path.join(RESOURCES_DIR, `${name}_afscript.resource`);

  if (!fs.existsSync(agentFile)) continue;

  if (!fs.existsSync(resourceFile)) {
    // No shipped resource for this agent — it isn't part of the package payload. Skip.
    skipped.push(name);
    continue;
  }

  const src = fs.readFileSync(agentFile);
  const dst = fs.readFileSync(resourceFile);
  const inSync = src.equals(dst);

  if (checkOnly) {
    if (!inSync) {
      drifted++;
      console.error(`✗ OUT OF SYNC: ${name} — bundle .agent ≠ shipped _afscript.resource`);
    }
  } else if (!inSync) {
    fs.writeFileSync(resourceFile, src);
    synced++;
    console.log(`→ synced ${name}.agent → ${name}_afscript.resource`);
  }
}

if (skipped.length) {
  console.log(`(skipped — no shipped resource: ${skipped.join(", ")})`);
}

if (checkOnly) {
  if (drifted) {
    console.error(
      `\n${drifted} agent(s) out of sync. Run: node scripts/sync_agent_resources.mjs`,
    );
    process.exit(1);
  }
  console.log("✓ All shipped agent resources are in sync with their bundles.");
} else {
  console.log(synced ? `\nDone — ${synced} resource(s) updated.` : "Already in sync — nothing to do.");
}
