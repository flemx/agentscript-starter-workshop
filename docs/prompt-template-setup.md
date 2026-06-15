# Prompt Template Setup — Multimodal File Processing (Images, PDFs, Docs)

This is a **one-time manual step** in Prompt Builder. Once the template exists in the org, the
`noteCapture` component and `NoteCaptureAI` Apex class work without any code changes.

---

## What you're creating

| Property | Value |
|---|---|
| **Type** | Flex |
| **API Name (Developer Name)** | `Describe_File_Contents` |
| **Description** | Reads up to 3 uploaded files (images, PDFs, docs) and extracts their content into meeting-note text |
| **Model** | `sfdc_ai__DefaultGPT4Omni` (GPT-4o Mini) or `sfdc_ai__DefaultGemini20Flash` |

---

## Step-by-step in Prompt Builder

### 1. Open Prompt Builder

Setup → **Einstein** → **Prompt Builder** → **New Prompt Template**

### 2. Choose template type

Select **Flex** (this is the only type that supports File inputs).

### 3. Set the name

- **Label**: `Describe File Contents`
- **API Name**: `Describe_File_Contents`  ← must match exactly (the Apex constant reads this name)
- **Description**: `Multimodal template: reads up to 3 images/PDFs uploaded via noteCapture`

### 4. Choose a model

Recommended:
- **GPT-4o Mini** (`sfdc_ai__DefaultGPT4Omni`) — cheaper, fast
- **Gemini 2.0 Flash** (`sfdc_ai__DefaultGemini20Flash`) — large context window, handles dense docs well

### 5. Add the three file inputs

Click **+ Add Input** three times. For each:

| # | Label | API Name | Type | Required |
|---|---|---|---|---|
| 1 | File 1 | `File1` | **File (ContentDocument)** | No (optional) |
| 2 | File 2 | `File2` | **File (ContentDocument)** | No (optional) |
| 3 | File 3 | `File3` | **File (ContentDocument)** | No (optional) |

> All three inputs are **optional**. The Apex code only populates the slots that have uploaded
> files — unused slots are omitted from the API call.
>
> Supported file types: **images** (PNG, JPG, WEBP, GIF), **PDFs**, and any other
> ContentDocument format the model accepts. The template handles all of them via the same
> `File (ContentDocument)` input type.

### 6. Write the prompt body — use "Insert Resource" for the file references

> **Important:** do NOT manually type `{!Input:File1}` etc. Instead, position your cursor in
> the prompt editor and click **Insert Resource** to select each file input. Prompt Builder
> inserts the correct merge field syntax automatically and registers each file as a multimodal
> content part sent to the model alongside the text.

**Step-by-step for this template:**

1. Type the opening instruction text (lines before the first file).
2. Click **Insert Resource** → select **File 1**. Prompt Builder inserts the merge field.
3. Type a blank line, then click **Insert Resource** → select **File 2**.
4. Repeat for **File 3**.
5. Type the closing extraction instructions.

**Instruction text to enter** (replace `[INSERT FILE N]` with the Insert Resource action):

```
You are a meeting assistant. One or more files have been uploaded from a meeting.
Files may be images (whiteboards, slides, screenshots) or documents (PDFs, handwritten notes).

[INSERT FILE 1 — Insert Resource → File1]

[INSERT FILE 2 — Insert Resource → File2]

[INSERT FILE 3 — Insert Resource → File3]

Extract the content from the provided file(s) into clear, structured text:
- For whiteboards or handwritten notes: transcribe all visible text faithfully, then summarise
  the key points in bullet form.
- For slides or screenshots: list the headings and bullet points exactly as written.
- For PDFs or dense documents: summarise each section in 2–3 sentences.

Return ONLY the extracted/summarised content. Do not add commentary or preamble.
```

> **Optional inputs at runtime:** all three file slots are optional — when only 1 or 2 files are
> uploaded the platform silently omits the empty slots. No conditional logic needed in the prompt.

### 7. Activate the template

Click **Save**, then **Activate**. An inactive template returns an error at runtime.

---

## Testing the template

1. In Prompt Builder, click **Preview** on the template.
2. Upload a test file (a photo of a whiteboard, a screenshot, or a PDF) into the File 1 slot.
3. Click **Generate** — you should see the model's description.
4. Optionally add files to slots 2 and 3 and regenerate.

---

## How the Apex code uses this template

`NoteCaptureAI.processFiles(List<Id> contentVersionIds)`:

1. Resolves each `ContentVersionId` → `ContentDocumentId` (one SOQL query for all files).
2. Builds the `inputParams` map, setting `Input:Image1`, `Input:Image2`, `Input:Image3` for
   however many files were uploaded (unused slots are omitted).
3. Makes **one** `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate` call.
4. Returns the model's text response; the LWC appends it to the combined transcript.

```apex
// WrappedValue format for File inputs (must be a typed map, NOT a bare Id):
ConnectApi.WrappedValue fileValue = new ConnectApi.WrappedValue();
fileValue.value = new Map<String, String>{
    'id'   => String.valueOf(contentDocumentId),
    'type' => 'ContentDocument'
};
valueMap.put('Input:File1', fileValue);
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Template not found` error | Check the API name is exactly `Describe_File_Contents` (no spaces, correct case) |
| `Template is not active` error | Open Prompt Builder → Activate the template |
| No text returned | Check the model is connected in **Einstein Setup** and has an active key |
| File input not accepted | Ensure the input type is **File (ContentDocument)**, not Text or Record |
