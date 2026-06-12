// Multimodal → text, server-side. Turns dropped images/PDFs and recorded audio into plain text
// BEFORE anything is sent to Agentforce (the agent only ever sees text).
//
// Provider: Heroku Managed Inference (https://devcenter.heroku.com/categories/ai), a vision-capable
// Claude model attached as the INFERENCE_* config vars (OpenAI-compatible /v1/chat/completions).
//
// IMPORTANT — Heroku's vision endpoint FETCHES an image URL; it does NOT accept base64 data URLs.
// So for images we stash the bytes in a short-lived in-memory store and hand Heroku a public URL
// back to THIS server (PUBLIC_BASE_URL), which it can fetch. PDFs are parsed to text directly
// (vision fetch can't reliably read PDFs), with a graceful message if parsing isn't available.
//
// Audio: Heroku Managed Inference has no speech-to-text model, so audio transcription is handled
// client-side via the browser Web Speech API. This module's audio function is a safe no-op fallback.

import { randomUUID } from 'node:crypto';

function visionCfg() {
  return {
    url: process.env.INFERENCE_URL,
    key: process.env.INFERENCE_KEY,
    model: process.env.INFERENCE_MODEL_ID,
  };
}

export function visionConfigured() {
  const c = visionCfg();
  return Boolean(c.url && c.key && c.model);
}
// STT is browser-side (Web Speech API); the server never transcribes.
export function sttConfigured() {
  return false;
}

// ── Short-lived blob store so Heroku's vision proxy can fetch the image by URL ───────────
const BLOB_TTL_MS = 5 * 60 * 1000;
const blobs = new Map(); // id -> { buffer, mimeType, expires }

export function putBlob(buffer, mimeType) {
  const id = randomUUID();
  blobs.set(id, { buffer, mimeType, expires: Date.now() + BLOB_TTL_MS });
  return id;
}
export function getBlob(id) {
  const b = blobs.get(id);
  if (!b) return null;
  if (Date.now() > b.expires) {
    blobs.delete(id);
    return null;
  }
  return b;
}
// Periodic sweep (best-effort).
setInterval(() => {
  const now = Date.now();
  for (const [id, b] of blobs) if (now > b.expires) blobs.delete(id);
}, BLOB_TTL_MS).unref?.();

function publicBaseUrl() {
  // Set PUBLIC_BASE_URL on Heroku (e.g. https://employee-agent-workshop-guide-....herokuapp.com).
  return process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
}

/**
 * Image → text via the vision model. We expose the image at a temporary public URL on this
 * server and pass that URL to Heroku (object form: image_url: { url }).
 */
export async function imageToText({ buffer, mimeType, filename }) {
  const c = visionCfg();
  if (!c.url || !c.key || !c.model) {
    return `[Attached image "${filename}" — image understanding isn't configured on the server yet, so its contents could not be read.]`;
  }
  const id = putBlob(buffer, mimeType || 'image/png');
  const imageUrl = `${publicBaseUrl()}/api/blob/${id}`;
  const prompt =
    'You are extracting content for a meeting/use-case research assistant. Transcribe and describe ' +
    'everything useful in this image (text, tables, diagrams, sticky notes, hand-writing). Return clean ' +
    'plain text only — no preamble. If it is a workshop board, list the items and any groupings.';

  const res = await fetch(`${c.url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}` },
    body: JSON.stringify({
      model: c.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1500,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Vision model error (HTTP ${res.status}): ${data.error?.message || JSON.stringify(data).slice(0, 200)}`);
  }
  return data.choices?.[0]?.message?.content?.trim() || `[No text could be extracted from "${filename}".]`;
}

/**
 * PDF → text. Extracts embedded text directly (no vision fetch). Uses pdf-parse if available;
 * degrades gracefully with a clear message otherwise.
 */
export async function pdfToText({ buffer, filename }) {
  try {
    const mod = await import('pdf-parse').catch(() => null);
    if (!mod) {
      return `[Attached PDF "${filename}" — server-side PDF text extraction isn't available. Paste the relevant text instead.]`;
    }
    const pdfParse = mod.default || mod;
    const out = await pdfParse(buffer);
    const text = (out.text || '').trim();
    return text || `[PDF "${filename}" contained no extractable text (it may be a scanned image).]`;
  } catch (e) {
    return `[Could not read PDF "${filename}": ${e.message}]`;
  }
}

/** Routes a file to the right extractor by mime type. */
export async function fileToText({ buffer, mimeType, filename }) {
  if ((mimeType || '').includes('pdf') || /\.pdf$/i.test(filename || '')) {
    return pdfToText({ buffer, filename });
  }
  return imageToText({ buffer, mimeType, filename });
}

/** Audio transcription is browser-side; this is a safe fallback if the client ever posts audio. */
export async function audioToText() {
  return '[Audio transcription happens in your browser; no server transcript was produced.]';
}
