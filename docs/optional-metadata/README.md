# Optional metadata — Workshop Settings override record

The launchpad LWC (`workshopLaunchpad`) and its controller (`WorkshopSetupController`)
ship with **built-in defaults** in Apex:

| Setting | Built-in default |
|---|---|
| Permission sets to assign | `Employee_Agent_Workshop` |
| Permission set groups to assign | `AFDX_User_Perms` |
| Starter agent API name | `Note_taking_agent` |
| Workshop guide URL | _(empty — the launchpad shows "ask your facilitator")_ |
| Package install URL | _(empty)_ |

So the package works on a clean install **with no custom metadata record present**.

## Overriding the defaults (the workshop guide URL especially)

To point the launchpad at your live workshop guide (or change which perm sets get
assigned), create one `Workshop_Settings__mdt` record named **`Default`**. Any field
you populate overrides the built-in default; blank fields fall back to the defaults.

**Recommended — point-and-click (always works):**
Setup → *Custom Metadata Types* → **Workshop Settings** → *Manage Records* →
**New** → DeveloperName `Default` → fill in `Workshop Guide URL` (and any others) → Save.

**As metadata (template below):**
The file `Workshop_Settings.Default.md-meta.xml` in this folder is a ready-to-edit
template. It is intentionally **kept out of `force-app/`** because deploying a Custom
Metadata *record with values* via the CLI currently fails on these orgs with an opaque
`UNKNOWN_EXCEPTION` (a platform-side issue — a skeleton record with no values deploys
fine, and the same failure reproduces for a brand-new throwaway CMDT type). Editing the
record in Setup avoids that path entirely. If you do want to deploy it, copy it into a
`customMetadata/` folder and deploy it **on its own** after the type exists:

```bash
sf project deploy start --metadata "CustomMetadata:Workshop_Settings.Default"
```
