// Agentforce API client — server-side only (holds the connected-app secret).
//
// Auth: OAuth 2.0 client-credentials flow against {instanceUrl}/services/oauth2/token using the
// connected app's consumer key/secret. The token (~30 min) is cached and refreshed proactively.
//
// Agent API: https://api.salesforce.com/einstein/ai-agent/v1
//   POST /agents/{agentId}/sessions                  → create a session
//   POST /sessions/{sessionId}/messages/stream       → SSE stream of the agent's response
//
// Reference: flemx/hr-agentforce-portal AGENTFORCE_API_GUIDE.md (client-credentials variant).

const AGENT_API_BASE = 'https://api.salesforce.com/einstein/ai-agent/v1';

let cachedToken = null;
let tokenExpiresAt = 0;

function cfg() {
  const instanceUrl = process.env.SF_INSTANCE_URL;
  const clientId = process.env.SF_CONSUMER_KEY || process.env.CONSUMER_KEY;
  const clientSecret = process.env.SF_CONSUMER_SECRET || process.env.CONSUMER_SECRET;
  const agentId = process.env.SF_AGENT_ID;
  return { instanceUrl, clientId, clientSecret, agentId };
}

export function agentforceConfigured() {
  const { instanceUrl, clientId, clientSecret, agentId } = cfg();
  return Boolean(instanceUrl && clientId && clientSecret && agentId);
}

/** Returns a valid access token, refreshing via client-credentials when needed. */
export async function getValidToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }
  const { instanceUrl, clientId, clientSecret } = cfg();
  if (!instanceUrl || !clientId || !clientSecret) {
    throw new Error('Agentforce not configured: missing SF_INSTANCE_URL / CONSUMER_KEY / CONSUMER_SECRET.');
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP ${res.status}`;
    throw new Error(`Agentforce token exchange failed: ${detail}`);
  }
  cachedToken = data.access_token;
  // Salesforce client-credentials tokens don't always return expires_in; assume 30 min.
  tokenExpiresAt = now + (Number(data.expires_in) ? Number(data.expires_in) * 1000 : 30 * 60 * 1000);
  return cachedToken;
}

/** Creates a new Agentforce session and returns its sessionId. */
export async function createSession() {
  const { instanceUrl, agentId } = cfg();
  if (!agentId) {
    throw new Error('Agentforce not configured: missing SF_AGENT_ID.');
  }
  const token = await getValidToken();
  const res = await fetch(`${AGENT_API_BASE}/agents/${agentId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      externalSessionKey: cryptoRandom(),
      instanceConfig: { endpoint: instanceUrl },
      streamingCapabilities: { chunkTypes: ['Text'] },
      bypassUser: false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.sessionId) {
    throw new Error(`Create session failed: ${data.message || data.error || `HTTP ${res.status}`}`);
  }
  return data.sessionId;
}

/**
 * Sends a message and pipes the Agentforce SSE stream to the provided Express response.
 * The caller has already set SSE headers on `clientRes`. We forward each upstream event
 * line as-is (data: {...}\n\n) so the browser EventSource/fetch reader gets a clean stream.
 */
export async function streamMessage({ sessionId, text, sequenceId, clientRes }) {
  const token = await getValidToken();
  const upstream = await fetch(`${AGENT_API_BASE}/sessions/${sessionId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message: { type: 'Text', sequenceId, text } }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    clientRes.write(`data: ${JSON.stringify({ message: { type: 'Error', message: `Agent stream failed (HTTP ${upstream.status}): ${errText.slice(0, 300)}` } })}\n\n`);
    clientRes.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      clientRes.write(decoder.decode(value, { stream: true }));
    }
  } catch (e) {
    clientRes.write(`data: ${JSON.stringify({ message: { type: 'Error', message: `Stream interrupted: ${e.message}` } })}\n\n`);
  } finally {
    clientRes.end();
  }
}

/** End a session (best-effort). */
export async function endSession(sessionId) {
  try {
    const token = await getValidToken();
    await fetch(`${AGENT_API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'x-session-end-reason': 'UserRequest' },
    });
  } catch {
    /* best-effort */
  }
}

function cryptoRandom() {
  // Non-cryptographic unique-enough external session key.
  return 'sess-' + Math.abs(hashStr(String(process.hrtime.bigint()))).toString(36);
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
