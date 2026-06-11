#  Agentscript Connect API — agent deploy/publish from the browser


## Why this matters
`AiAuthoringBundle` can't be packaged, and `sf agent publish` is CLI-only — but this Connect API
**does** let us create → publish → activate an Agent Script agent entirely from an in-org callout.
That powers the optional **"deploy the agent for me"** accelerator (`NextGenAgentDeployer`).

## Base path (verified live on hackathon_sb)
```
/services/data/v64.0/nextgen-authoring        ← NOTE: no /connect/ segment
```
A `GET .../nextgen-authoring/bundles` returns the org's bundles. (The `/connect/` variant 404s.)

## Endpoints we use
| Step | Method + path | Body | Returns |
|---|---|---|---|
| Create | `POST /bundles` | `{apiName,label,assets:[{resourceName,resourceContent,resourceType:"agentDefinition",resourceAuthoringFormat:"afscript",authoringFormatVersion:"v1.0"}]}` | `{id (=bundleVersionId), bundleId, apiName, versionStatus:"DRAFT"}` |
| Publish | `POST /bundle-versions/{bundleVersionId}/publish` | `{}` | `201 {publishedBotId, publishedBotVersionId, lastPublishedOn}` |
| Activate | `POST /bundle-versions/{bundleVersionId}/activate` | `{}` | `204` (no content) |
| Deactivate | `POST /bundle-versions/{bundleVersionId}/deactivate` | `{}` | `204` |
| List | `GET /bundles` | — | `{bundles:[{id,apiName,latestBundleVersionId,activeBundleVersionId,...}]}` |
| Compile | `POST /afscript/compile` | `{content, bundleVersionId?}` (text/plain) | compile result + errors |
| Validate | `POST /bundle-versions/{id}/validate` | `{agentJsonString}` | compile/validation result |

Other endpoints in the spec: create draft (`/draft`), versions list (`/bundles/{id}/versions`),
version detail (`GET /bundle-versions/{id}`), summary, version-info, migrate, delete.


## Hard-won gotchas (verified 2026-06-11)
1. **Session must be API-enabled.** A self-callout to `URL.getOrgDomainUrl()` works from Apex with
   `UserInfo.getSessionId()` in *anonymous* and *Visualforce* contexts. In an **Aura/LWC** request
   the session may NOT be API-enabled — so the accelerator runs the callout server-side in Apex and
   sources the session from a **Visualforce page** (`NextGenAgentDeployerSession`,
   `{!$Api.Session_ID}`). No Remote Site Setting is needed for the org's own My Domain.
2. **`developer_name` inside the afscript = the runtime BotDefinition name.** It is NOT taken from
   the bundle `apiName`. If two bundles carry the same `developer_name`, publish fails with
   `DUPLICATE_VALUE: BotDefinition duplicates value on record with id: <name>`. `NextGenAgentDeployer`
   rewrites `developer_name`/`agent_label` in the script to match the requested apiName before create.
3. **Publish/activate bodies:** send `{}` (an empty/again-missing body can be silently dropped by some
   clients; `sf api request rest --body @file` with `{}` works). Activate returns **204** (no JSON).
4. **Published agents can't be fully deleted** via the API (BotDefinition lingers) — same as the CLI.
   Use unique throwaway names when testing; clean up via Setup or scratch-org expiry.

## Round-trip proven on hackathon_sb
`create → publish (201, Bot+BotVersion created) → activate (204) → versionStatus PUBLISHED /
targetStatus ACTIVE`, with the BotDefinition visible via SOQL — both via raw REST and via the
`NextGenAgentDeployer` Apex class (`ZZ_Workshop_Live_01`).
