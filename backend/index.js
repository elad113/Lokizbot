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

app.get('/health', (_req, res) => res.json({ ok: true, service: 'lokibot-api', configured: Boolean(apiKey), imageGenerationConfigured: Boolean(process.env.LOKIZ_IMAGE_GEN) }));

app.post('/api/images/generate', async (req, res) => {
  try {
    const imageKey = process.env.LOKIZ_IMAGE_GEN;
    if (!imageKey) return res.status(503).json({ error: 'Image generation is not configured on the API host. Add LOKIZ_IMAGE_GEN to the backend environment.' });
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 4000) : '';
    if (!prompt) return res.status(400).json({ error: 'Describe the image you want to create.' });
    const upstream = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + imageKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'high', output_format: 'png' }),
      signal: AbortSignal.timeout(120000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = payload?.error?.message || 'Image provider returned HTTP ' + upstream.status;
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: String(message).slice(0, 500) });
    }
    const first = payload?.data?.[0];
    if (!first?.b64_json) return res.status(502).json({ error: 'Image provider returned no image data.' });
    return res.json({ image: first.b64_json, mimeType: 'image/png', revisedPrompt: first.revised_prompt || prompt });
  } catch (error) {
    return res.status(/timeout|abort/i.test(String(error)) ? 504 : 502).json({ error: error instanceof Error ? error.message : 'Image generation failed.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!apiKey) return res.status(503).json({ error: 'AI backend is not configured. Add OPENROUTER_API_KEY (or GROQ_API_KEY) to the hosting service environment.' });
    const { messages, personality, alwaysInstructions, mode, image, responseLength = 'short', thinkingLevel = 'medium', replyLanguage = 'auto', modelChoice = 'lokizenith-3.2' } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages must be a non-empty array.' });
    const safeMessages = messages.slice(-18).filter(m => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 16000) }));
    if (!safeMessages.length) return res.status(400).json({ error: 'No valid chat messages were provided.' });
    if (image?.data && image?.mimeType && safeMessages[safeMessages.length - 1].role === 'user') {
      safeMessages[safeMessages.length - 1].content = [
        { type: 'text', text: safeMessages[safeMessages.length - 1].content },
        { type: 'image_url', image_url: { url: `data:${String(image.mimeType).slice(0,80)};base64,${String(image.data).slice(0, 7_000_000)}` } }
      ];
    }
    const codeMode = mode === 'code';
    const system = [
      'You are LokiBot, a helpful, accurate, friendly AI assistant.',
      codeMode ? 'You are also acting as a principal software engineer and test engineer. Deliver complete, request-specific, runnable code. Plan architecture and requirements, handle edge cases, validation, errors, security, and responsive/accessibility details where relevant. Never use pseudocode, TODO placeholders, ellipses, fake implementations, or short generic snippets when a full implementation is requested. Include all necessary files and run/test instructions for multi-file projects. Review for undefined names, missing functions, syntax mistakes and incomplete branches. Never claim tests were executed unless actually executed.' : '',
      'Prefer concise, useful answers unless detail is requested. Use plain, natural wording and avoid decorative Markdown symbols.',
      mode === 'learn' ? 'Teaching mode: guide step by step, check understanding, and explain concepts clearly.' : '',
      typeof personality === 'string' ? `Personality preference: ${personality.slice(0, 500)}` : '',
      typeof alwaysInstructions === 'string' && alwaysInstructions.trim() ? `Persistent user instructions (follow consistently unless they conflict with safety or system requirements): ${alwaysInstructions.slice(0, 1500)}` : '',
      `Answer length: ${['short','medium','long'].includes(responseLength) ? responseLength : 'short'}. Default to concise, plain-language answers; avoid unnecessary Markdown symbols and decorative formatting.`,
      `Reasoning effort preference: ${['low','medium','high','extra-high'].includes(thinkingLevel) ? thinkingLevel : 'medium'}. Scale depth and verification to this preference, but never claim to have searched or checked sources unless actual source data is available.`,
      `Preferred reply language: ${['Hebrew','English','French','Spanish','Arabic'].includes(replyLanguage) ? 'Always answer only in ' + replyLanguage + ', even if the user writes in another language.' : 'match the language used by the user'}.`,
      `Selected product mode: ${modelChoice === 'zenith-3.5-ultra' ? 'Zenith 3.5 Ultra (premium behavior prompt; same configured provider unless a separate model is configured)' : 'Lokizenith 3.2'}.`
    ].filter(Boolean).join('\n');
    const selectedModel = modelChoice === 'zenith-3.5-ultra' ? (process.env.ZENITH35_MODEL || model) : model;
    const lastPrompt = safeMessages[safeMessages.length - 1]?.content;
    const interactiveRequested = typeof lastPrompt === 'string' && /quiz|multiple.choice test|flashcards|study cards|מבחן|בוחן|כרטיסיות/i.test(lastPrompt);
    const uiRequested = typeof lastPrompt === 'string' && /recipe|meal plan|itinerary|travel plan|workout plan|step.by.step|checklist|schedule|compare|מתכון|מסלול|תוכנית אימון|רשימת משימות|השוואה/i.test(lastPrompt);
    const interactiveInstruction = interactiveRequested ? ' If the user requests a quiz/test, return ONLY valid JSON with shape {"text":"short intro","quiz":[{"q":"question","options":["A","B","C","D"],"answer":0,"why":"short explanation"}],"flashcards":null}. If they request flashcards, use {"text":"short intro","quiz":null,"flashcards":[{"q":"question","a":"answer"}]}. For ordinary chat, answer normally. Do not wrap JSON in markdown fences.' : uiRequested ? ' If an additional interactive UI would genuinely help (for example a recipe, itinerary, checklist, schedule, workout or comparison), return ONLY valid JSON with shape {"text":"helpful concise explanation","interface":{"type":"recipe|plan|checklist|comparison|steps","title":"short title","subtitle":"useful summary or time","items":[{"title":"item heading","description":"clear details","meta":"optional short label"}]}}. Include 3-12 useful items. For ordinary questions, answer normally. Do not wrap JSON in markdown fences.' : '';
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.APP_ORIGIN || 'https://github.com/elad113/Lokizbot', 'X-Title': 'LokiBot' },
      body: JSON.stringify({ model: selectedModel, messages: [{ role: 'system', content: system + interactiveInstruction }, ...safeMessages], temperature: 0.6, max_tokens: codeMode ? 6000 : responseLength === 'long' ? 3000 : responseLength === 'medium' ? 1800 : 650 })
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = payload?.error?.message || payload?.message || `AI provider returned HTTP ${upstream.status}`;
      const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 502 : 502;
      return res.status(status).json({ error: message.slice(0, 500) });
    }
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) return res.status(502).json({ error: 'The AI provider returned an empty answer.' });
    const trimmed = text.trim();
    if (interactiveRequested || uiRequested) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') return res.json({ text: typeof parsed.text === 'string' ? parsed.text : 'Here is your interactive activity.', quiz: Array.isArray(parsed.quiz) ? parsed.quiz.slice(0, 20) : undefined, flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards.slice(0, 40) : undefined, interface: parsed.interface && typeof parsed.interface === 'object' ? { type: String(parsed.interface.type || 'plan').slice(0, 30), title: String(parsed.interface.title || 'Your guide').slice(0, 100), subtitle: String(parsed.interface.subtitle || '').slice(0, 180), items: Array.isArray(parsed.interface.items) ? parsed.interface.items.slice(0, 12).map(item => ({ title: String(item?.title || '').slice(0, 100), description: String(item?.description || '').slice(0, 700), meta: String(item?.meta || '').slice(0, 80) })) : [] } : undefined, model: payload?.model || selectedModel });
      } catch {}
    }
    return res.json({ text: trimmed, model: payload?.model || selectedModel });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected backend error.' });
  }
});


const languageMatchers = {
  javascript: /nodejs/i, typescript: /typescript|deno/i, python: /cpython|python/i,
  c: /^gcc|gcc.*c/i, cpp: /^g\+\+|clang\+\+/i, java: /openjdk|java/i,
  csharp: /mono|csharp|dotnet|c#/i, go: /^go-/i, rust: /^rust-/i, ruby: /^ruby-/i,
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
