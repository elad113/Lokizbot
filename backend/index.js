import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.OPENROUTER_API_KEY || process.env.LOKIZON_AI_API_KEY || process.env.GROQ_API_KEY;
const model = process.env.OPENROUTER_MODEL || (process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY ? 'llama-3.3-70b-versatile' : 'openai/gpt-4o-mini');
const apiUrl = process.env.AI_API_URL || (process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions');

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : true }));
app.use(express.json({ limit: '8mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'lokibot-api', configured: Boolean(apiKey) }));

app.post('/api/chat', async (req, res) => {
  try {
    if (!apiKey) return res.status(503).json({ error: 'AI backend is not configured. Add OPENROUTER_API_KEY (or GROQ_API_KEY) to the hosting service environment.' });
    const { messages, personality, mode, image } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages must be a non-empty array.' });
    const safeMessages = messages.slice(-18).filter(m => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 16000) }));
    if (!safeMessages.length) return res.status(400).json({ error: 'No valid chat messages were provided.' });
    if (image?.data && image?.mimeType && safeMessages[safeMessages.length - 1].role === 'user') {
      safeMessages[safeMessages.length - 1].content = [
        { type: 'text', text: safeMessages[safeMessages.length - 1].content },
        { type: 'image_url', image_url: { url: `data:${String(image.mimeType).slice(0,80)};base64,${String(image.data).slice(0, 7_000_000)}` } }
      ];
    }
    const system = [
      'You are LokiBot, a helpful, accurate, friendly AI assistant.',
      'Answer in the same language as the user. Prefer concise, useful answers unless detail is requested.',
      mode === 'learn' ? 'Teaching mode: guide step by step, check understanding, and explain concepts clearly.' : '',
      typeof personality === 'string' ? `Personality preference: ${personality.slice(0, 500)}` : ''
    ].filter(Boolean).join('\n');
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.APP_ORIGIN || 'https://github.com/elad113/Lokizbot', 'X-Title': 'LokiBot' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...safeMessages], temperature: 0.6, max_tokens: 1400 })
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = payload?.error?.message || payload?.message || `AI provider returned HTTP ${upstream.status}`;
      const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 502 : 502;
      return res.status(status).json({ error: message.slice(0, 500) });
    }
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) return res.status(502).json({ error: 'The AI provider returned an empty answer.' });
    return res.json({ text: text.trim(), model: payload?.model || model });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected backend error.' });
  }
});


const languageMatchers = {
  javascript: /nodejs/i, typescript: /typescript|deno/i, python: /cpython|python/i,
  c: /^gcc|gcc.*c/i, cpp: /^g\+\+|clang\+\+/i, java: /openjdk|java/i,
  csharp: /mono|csharp|dotnet/i, go: /^go-/i, rust: /^rust-/i, ruby: /^ruby-/i,
  php: /^php-/i, bash: /bash/i, lua: /^lua-/i, perl: /^perl-/i, r: /^r-/i,
  swift: /^swift-/i, kotlin: /kotlin/i, dart: /^dart-/i
};
let wandboxCompilers = { fetchedAt: 0, items: [] };
async function getWandboxCompiler(language) {
  const now = Date.now();
  if (now - wandboxCompilers.fetchedAt > 60 * 60 * 1000 || !wandboxCompilers.items.length) {
    const response = await fetch('https://wandbox.org/api/list.json', { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('The code runner catalogue is temporarily unavailable (HTTP ' + response.status + ').');
    wandboxCompilers.items = await response.json();
    wandboxCompilers.fetchedAt = now;
  }
  const matcher = languageMatchers[language];
  if (!matcher) throw new Error('This language is not supported by the current online runner.');
  const all = wandboxCompilers.items.filter(item => item && item.name && item.language);
  const candidates = all.filter(item => matcher.test(String(item.name)) || matcher.test(String(item.language)));
  const preferred = candidates.find(item => /latest|stable/i.test(item.name)) || candidates[0];
  if (!preferred) throw new Error('No available Wandbox compiler was found for ' + language + '.');
  return preferred;
}
app.post('/api/run', async (req, res) => {
  try {
    const { language, code, stdin = '' } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) return res.status(400).json({ error: 'Enter code before running it.' });
    if (code.length > 100000) return res.status(413).json({ error: 'Code is too large to run (100 KB maximum).' });
    if (typeof stdin !== 'string' || stdin.length > 20000) return res.status(400).json({ error: 'Input is too large (20 KB maximum).' });
    const compiler = await getWandboxCompiler(String(language || ''));
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        compiler: compiler.name, code, stdin, save: false,
        'compiler-option-raw': '', 'runtime-option-raw': ''
      }),
      signal: AbortSignal.timeout(35000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: payload.message || 'The online runner returned HTTP ' + response.status + '.' });
    const output = [payload.program_message, payload.compiler_message].filter(Boolean).join('\n').trim();
    const status = Number(payload.status);
    return res.json({
      output: output || (status === 0 ? 'Program finished successfully with no output.' : 'The program finished without output.'),
      exitCode: Number.isFinite(status) ? status : 0,
      compiler: compiler.name,
      signal: payload.signal || null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected code runner error.';
    const timeout = /timeout|abort/i.test(message);
    return res.status(timeout ? 504 : 502).json({ error: timeout ? 'Code execution timed out. Try a smaller program.' : message.slice(0, 400) });
  }
});

app.listen(port, '0.0.0.0', () => console.log(`LokiBot API listening on ${port}`));
