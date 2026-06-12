// Express server for the workshop portal.
//  - Serves the built React app (dist/).
//  - Proxies the Agentforce Agent API (OAuth + session + SSE streaming) — secrets stay here.
//  - Turns dropped images/PDFs and recorded audio into text (Heroku Managed Inference) so the
//    agent only ever receives text.
//
// All secrets come from env (Heroku config vars / local web-app/.env). Nothing secret is sent
// to the browser.

import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  agentforceConfigured,
  createSession,
  streamMessage,
  endSession,
} from './agentforce.js';
import {
  visionConfigured,
  sttConfigured,
  fileToText,
  audioToText,
} from './multimodal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(compression());
app.use(express.json({ limit: '2mb' }));

// ── Health / capability probe ────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    agentforce: agentforceConfigured(),
    vision: visionConfigured(),
    stt: sttConfigured(),
  });
});

// ── Agentforce: create a session ───────────────────────────────────────────────────────
app.post('/api/agent/session', async (_req, res) => {
  try {
    const sessionId = await createSession();
    res.json({ sessionId });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ── Agentforce: stream a message (SSE) ──────────────────────────────────────────────────
app.post('/api/agent/message', async (req, res) => {
  const { sessionId, text, sequenceId } = req.body || {};
  if (!sessionId || !text) {
    res.status(400).json({ error: 'sessionId and text are required' });
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  try {
    await streamMessage({
      sessionId,
      text,
      sequenceId: Number(sequenceId) || 1,
      clientRes: res,
    });
  } catch (e) {
    res.write(`data: ${JSON.stringify({ message: { type: 'Error', message: e.message } })}\n\n`);
    res.end();
  }
});

// ── Agentforce: end a session ───────────────────────────────────────────────────────────
app.post('/api/agent/end', async (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId) await endSession(sessionId);
  res.json({ ok: true });
});

// ── Multimodal: image / PDF → text ──────────────────────────────────────────────────────
app.post('/api/extract/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const text = await fileToText({
      base64: req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype,
      filename: req.file.originalname,
    });
    res.json({ text, filename: req.file.originalname });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ── Multimodal: audio → text ────────────────────────────────────────────────────────────
app.post('/api/extract/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio uploaded' });
      return;
    }
    const text = await audioToText({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      filename: req.file.originalname,
    });
    res.json({ text });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ── Static React app (SPA fallback) ─────────────────────────────────────────────────────
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Workshop portal listening on :${port}`);
  console.log(`  Agentforce: ${agentforceConfigured() ? 'configured' : 'NOT configured'}`);
  console.log(`  Vision: ${visionConfigured() ? 'configured' : 'NOT configured'} · STT: ${sttConfigured() ? 'configured' : 'NOT configured'}`);
});
