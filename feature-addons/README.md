# Feature add-on components (deploy separately from the core package)

These components are **proven working in the sandbox** but are kept **out of the unlocked
package** because they depend on platform features that aren't present in a vanilla 2GP
package-build (scratch) org — so the package version build fails to compile them. This mirrors
the `AiAuthoringBundle` decision: ship what packages cleanly, deploy the feature-dependent
parts post-install.

## What's here
| Component | Depends on |
|---|---|
| `HtmlNoteService` (+ test) | `ContentNote` (Notes feature) |
| `NoteViewerController` (+ test) | `ContentVersion` / Notes |
| `noteViewer` LWC | `lightning-formatted-rich-text` |
| `NoteCaptureController` (+ test) | `BotDefinition` (Agentforce) |
| `NoteCaptureAI` (+ test) | `ConnectApi.EinsteinLLM`, speech-to-text action |
| `noteCapture` LWC | `lightning/accApi`, MediaRecorder |
| `Employee_Agent_Notes_Addon` perm set | the four Apex classes above |

## How to deploy (into an Agentforce-enabled org / the workshop sandbox)
```bash
sf project deploy start --target-org <org> --source-dir feature-addons --test-level NoTestRun
# then assign the add-on perm set
sf org assign permset --name Employee_Agent_Notes_Addon --target-org <org>
```

All of these are already deployed and verified in `hackathon_sandbox`.

## Why not in the package?
The 2GP package build org (a fresh scratch org from `config/project-scratch-def.json`) does
not surface `ContentNote`, `ConnectApi.EinsteinLLM`, or `BotDefinition`, so the classes don't
compile there. Getting full feature parity in the build org is possible (scratch-def features
+ provisioning) but wasn't worth blocking the core package on. Revisit if these need to ship
in the managed/unlocked package itself.
