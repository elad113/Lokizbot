const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://lokibot-api.onrender.com';
const OPENROUTER_KEY = (import.meta as any).env?.VITE_LOKIZON_AI_API_KEY || '';

async function postBackend(path: string, body: any) {
  const response = await fetch(API_BASE.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Backend request failed (HTTP ' + response.status + ').';
    throw new Error(message);
  }
  return { data };
}

async function request(path: string, body: any) {
  if (path !== '/api/chat' || !OPENROUTER_KEY) {
    return postBackend(path, body);
  }

  const { messages = [], personality, mode, image, responseLength = 'short', thinkingLevel = 'medium', replyLanguage = 'auto' } = body || {};
  const system = [
    'You are LokiBot, a helpful, accurate, friendly AI assistant. Prefer concise, natural answers.',
    typeof personality === 'string' ? 'Personality: ' + personality.slice(0, 500) : '',
    mode === 'learn' ? 'Teach step by step and check understanding.' : '',
    'Answer length: ' + (['short', 'medium', 'long'].includes(responseLength) ? responseLength : 'short') + '.',
    'Reasoning depth preference: ' + (['low', 'medium', 'high', 'extra-high'].includes(thinkingLevel) ? thinkingLevel : 'medium') + '.',
    'Reply language: ' + (['Hebrew', 'English', 'French', 'Spanish', 'Arabic'].includes(replyLanguage) ? 'always answer only in ' + replyLanguage : 'match the user language') + '.',
    'If asked for quizzes or flashcards, provide clearly numbered questions/cards and answers.'
  ].filter(Boolean).join('\n');

  const contentMessages: any[] = [
    { role: 'system', content: system },
    ...messages.slice(-18).filter((m: any) => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string')
  ];
  if (image?.data && contentMessages.length) {
    const last = contentMessages[contentMessages.length - 1];
    if (last.role === 'user') {
      last.content = [
        { type: 'text', text: last.content },
        { type: 'image_url', image_url: { url: 'data:' + (image.mimeType || 'image/jpeg') + ';base64,' + image.data } }
      ];
    }
  }

  let openRouterError = '';
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENROUTER_KEY,
        'HTTP-Referer': 'https://github.com/elad113/Lokizbot',
        'X-Title': 'LokiBot'
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: contentMessages,
        temperature: 0.6,
        max_tokens: responseLength === 'long' ? 3000 : responseLength === 'medium' ? 1800 : 650
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      openRouterError = data?.error?.message || 'OpenRouter request failed (HTTP ' + response.status + ').';
    } else {
      const answer = data?.choices?.[0]?.message?.content;
      if (typeof answer === 'string' && answer.trim()) {
        return { data: { text: answer.trim(), model: data?.model || 'openrouter/auto' } };
      }
      openRouterError = 'OpenRouter returned an empty answer.';
    }
  } catch (error) {
    openRouterError = error instanceof Error ? error.message : 'Network request to OpenRouter failed.';
  }

  // Recover automatically if OpenRouter is unavailable or the supplied key is rejected.
  try {
    return await postBackend(path, body);
  } catch (backendError) {
    const backendMessage = backendError instanceof Error ? backendError.message : 'Backend connection failed.';
    throw new Error('OpenRouter: ' + (openRouterError || 'request failed') + ' | Backup server: ' + backendMessage);
  }
}

export const api = { post: request };

export const image = {
  async resizeIfNeeded(file: File): Promise<{ data: string; mimeType: string }> {
    const read = (f: File) => new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('Could not read image'));
      r.readAsDataURL(f);
    });
    let url = await read(file);
    if (file.size > 3500000) {
      const img = new Image();
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not decode image'));
      });
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Image processing unavailable');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      url = c.toDataURL('image/jpeg', 0.82);
    }
    const comma = url.indexOf(',');
    return { data: url.slice(comma + 1), mimeType: url.slice(5, url.indexOf(';')) || 'image/jpeg' };
  }
};
