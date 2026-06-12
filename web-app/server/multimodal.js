// Multimodal → text, server-side. Turns dropped images/PDFs and recorded audio into plain text
// BEFORE anything is sent to Agentforce (the agent only ever sees text).
//
// Provider: Heroku Managed Inference & Agents (https://devcenter.heroku.com/categories/ai).
// Heroku attaches OpenAI-compatible config vars when you create a model resource:
//   - A chat/vision model (e.g. claude-* / a vision-capable model):
//       INFERENCE_URL, INFERENCE_KEY, INFERENCE_MODEL_ID
//   - A speech-to-text model (whisper):
//       WHISPER_URL (or DIFFUSION_*/STT_*), plus a key + model id
// We read those with sensible fallbacks and degrade gracefully (returning a clear message) when a
// model isn't provisioned yet, so the rest of the app keeps working.

function visionCfg() {
  return {
    url: process.env.INFERENCE_URL,
    key: process.env.INFERENCE_KEY,
    model: process.env.INFERENCE_MODEL_ID,
  };
}
function sttCfg() {
  return {
    url: process.env.STT_URL || process.env.WHISPER_URL || process.env.DIFFUSION_URL,
    key: process.env.STT_KEY || process.env.WHISPER_KEY || process.env.INFERENCE_KEY,
    model: process.env.STT_MODEL_ID || process.env.WHISPER_MODEL_ID,
  };
}

export function visionConfigured() {
  const c = visionCfg();
  return Boolean(c.url && c.key && c.model);
}
export function sttConfigured() {
  const c = sttCfg();
  return Boolean(c.url && c.key && c.model);
}

/**
 * Extracts text from an image or PDF using the vision model (OpenAI-compatible chat completions
 * with an image_url data URL). For PDFs we pass the data URL too — most current vision models
 * accept PDF; if a model rejects it, the caller surfaces the error message to the user.
 *
 * @returns {Promise<string>} extracted/described text
 */
export async function fileToText({ base64, mimeType, filename }) {
  const c = visionCfg();
  if (!c.url || !c.key || !c.model) {
    return `[Attached file "${filename}" — image/PDF understanding isn't configured on the server yet, so its contents could not be read.]`;
  }
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const prompt =
    'You are extracting content for a meeting/use-case research assistant. Transcribe and describe ' +
    'everything useful in this file (text, tables, diagrams, sticky notes, hand-writing). Return clean ' +
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
            { type: 'image_url', image_url: { url: dataUrl } },
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
 * Transcribes audio to text via an OpenAI-compatible /v1/audio/transcriptions endpoint.
 * @returns {Promise<string>} transcript
 */
export async function audioToText({ buffer, mimeType, filename }) {
  const c = sttCfg();
  if (!c.url || !c.key || !c.model) {
    return '[Audio transcription isn\'t configured on the server yet, so the recording could not be transcribed.]';
  }
  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType || 'audio/webm' });
  form.append('file', blob, filename || 'audio.webm');
  form.append('model', c.model);

  const res = await fetch(`${c.url}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.key}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Transcription error (HTTP ${res.status}): ${data.error?.message || JSON.stringify(data).slice(0, 200)}`);
  }
  return (data.text || '').trim() || '[Empty transcript.]';
}
