import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { ArrowLeft, Braces, Check, ChevronDown, CirclePlay, Code2, Copy, Download, FileCode2, History, LoaderCircle, Maximize2, RotateCcw, Save, Sparkles, Terminal, WandSparkles, X } from 'lucide-react';

type Project = { id: string; title: string; language: string; prompt: string; code: string; summary: string; updated: number };
type Props = { onBack: () => void; dark: boolean; notify: (message: string) => void };
const languages = [
  { value: 'javascript', label: 'JavaScript (Node.js)', ext: 'js' },
  { value: 'typescript', label: 'TypeScript', ext: 'ts' },
  { value: 'python', label: 'Python', ext: 'py' },
  { value: 'html', label: 'HTML / CSS / JavaScript · Web preview', ext: 'html' },
  { value: 'c', label: 'C', ext: 'c' },
  { value: 'cpp', label: 'C++', ext: 'cpp' },
  { value: 'java', label: 'Java', ext: 'java' },
  { value: 'csharp', label: 'C#', ext: 'cs' },
  { value: 'go', label: 'Go', ext: 'go' },
  { value: 'rust', label: 'Rust', ext: 'rs' },
  { value: 'ruby', label: 'Ruby', ext: 'rb' },
  { value: 'php', label: 'PHP', ext: 'php' },
  { value: 'bash', label: 'Bash', ext: 'sh' },
  { value: 'lua', label: 'Lua', ext: 'lua' },
  { value: 'perl', label: 'Perl', ext: 'pl' },
  { value: 'r', label: 'R', ext: 'r' },
  { value: 'swift', label: 'Swift', ext: 'swift' },
  { value: 'kotlin', label: 'Kotlin', ext: 'kt' },
  { value: 'dart', label: 'Dart', ext: 'dart' },
];
const starters = [
  'Create a beautiful interactive to-do app with local saving',
  'Build a colorful platform game with keyboard controls',
  'Make a calculator with history and keyboard support',
  'Create a responsive landing page with animations',
];
const getError = (e: unknown) => {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
};
function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function highlightCode(value: string) {
  const escaped = escapeHtml(value);
  return escaped.replace(/(\/\/[^\n]*|#[^\n]*|\b(?:const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|def|print|True|False|None|public|static|void|int|string|using|namespace|package|func|fn|mut|use|struct|impl)\b|\b\d+(?:\.\d+)?\b|&quot;[^&]*?&quot;|&#39;.*?&#39;)/g, token => {
    if (/^(const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|def|print|True|False|None|public|static|void|int|string|using|namespace|package|func|fn|mut|use|struct|impl)$/.test(token)) return '<span class="tok-keyword">' + token + '</span>';
    if (/^\d/.test(token)) return '<span class="tok-number">' + token + '</span>';
    if (/^\/\//.test(token) || /^#/.test(token)) return '<span class="tok-comment">' + token + '</span>';
    return '<span class="tok-string">' + token + '</span>';
  });
}
function extractCode(text: string) {
  const match = text.match(/```(?:[a-zA-Z0-9_+#.-]+)?\s*\n([\s\S]*?)```/);
  if (match) return { code: match[1].trim(), summary: text.slice(0, match.index).trim() || 'Generated code is ready. Review it, then run it.' };
  return { code: text.trim(), summary: 'LokiBot returned code without a fenced block. Review the code before running it.' };
}

export default function Lokicode({ onBack, dark, notify }: Props) {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [summary, setSummary] = useState('Your build summary will appear here after LokiBot generates the code.');
  const [busy, setBusy] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<'code' | 'result'>('code');
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('Run your code to see output here.');
  const [runError, setRunError] = useState(false);
  const [projectTitle, setProjectTitle] = useState('Untitled project');
  const [saved, setSaved] = useState<Project[]>(() => {
    try { return JSON.parse(localStorage.getItem('lokibot_code_projects') || '[]'); } catch { return []; }
  });
  const [showProjects, setShowProjects] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const selected = languages.find(item => item.value === language) || languages[0];
  const webMode = language === 'html';
  const previewHtml = useMemo(() => {
    if (!code) return '<html><body style="font:16px system-ui;padding:24px;color:#777">Generate or write code, then press Run.</body></html>';
    if (/<html[\s>]/i.test(code) || /<!doctype/i.test(code)) return code;
    if (/<(div|button|canvas|style|script|body|h1|main|section)\b/i.test(code)) return '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;margin:0;padding:20px}</style></head><body>' + code + '</body></html>';
    return '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;margin:0;padding:20px}</style></head><body><div id="app"></div><script>' + code.replace(/<\/script/gi, '<\\/script') + '</script></body></html>';
  }, [code]);
  useEffect(() => { localStorage.setItem('lokibot_code_projects', JSON.stringify(saved.slice(0, 20))); }, [saved]);

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setHasAttempted(true);
    setView('code');
    setOutput('Run your code to see output here.');
    try {
      const instruction = [
        'You are LokiCode, a principal-level software engineer, software architect, debugging specialist and test engineer. Treat every request as a real deliverable, not a toy snippet.',
        'Produce complete, production-minded code that directly satisfies the exact request. Do not be brief just to save tokens. Never substitute pseudocode, TODO placeholders, ellipses, fake APIs, invented libraries, or partial fragments for required implementation.',
        'Before writing, internally plan the architecture, requirements, state/data flow, edge cases, errors, security, accessibility, responsiveness, and test strategy. Then implement the plan consistently.',
        'Return a concise summary in the user\'s language followed by exactly one fenced code block containing the complete source. Do not split a single-file solution across multiple blocks. If a multi-file project is essential, output every file in a clearly labelled separate fenced block using the exact path as the label, plus setup/run instructions.',
        'For web apps, implement a complete polished responsive interface, working interactions, loading/empty/error states, validation, keyboard support and persistence when appropriate. Avoid static mockups when the user asked for a functioning app.',
        'For APIs and backend code, include validation, useful HTTP errors, timeouts, safe secret handling, and robust async/error handling. Never expose API keys in frontend code.',
        'For algorithms, provide correct complexity-aware implementations and cover boundary cases. For games, implement actual controls, game loop, collisions/state, restart/pause and a playable win/lose loop where appropriate.',
        'For HTML mode, return one self-contained HTML document with all required inline CSS/JS and real interactive behavior. Escape user data safely and avoid external dependencies unless necessary.',
        'After implementation, review the source for syntax mistakes, missing functions, undefined variables, mismatched names, incomplete branches, and compatibility issues. Include tests or a self-test path when feasible. Do not claim execution/testing unless it was actually performed.',
        'If a requirement is ambiguous, choose a sensible default and state it briefly rather than returning a tiny generic answer. Preserve all explicit requirements and make the implementation specific to this request.',
        'Selected language: ' + selected.label,
        'User request: ' + prompt.trim(),
      ].join('\n\n');
      const response = await api.post('/api/chat', { messages: [{ role: 'user', content: instruction }], personality: 'Principal software engineer, architect, debugger and test engineer. Produce complete, correct, detailed, request-specific code; never return short generic snippets when a full implementation is requested.', mode: 'code', responseLength: 'long', thinkingLevel: 'extra-high' });
      const data = response.data as { text?: string; error?: string };
      if (!data.text) throw new Error(data.error || 'No code was returned.');
      const parsed = extractCode(data.text);
      setCode(parsed.code);
      setSummary(parsed.summary);
      setProjectTitle(prompt.trim().replace(/\s+/g, ' ').slice(0, 42) || 'Untitled project');
      notify('Lokicode generated your code ✨');
    } catch (e) { setSummary('Generation failed — your workspace is still open. ' + getError(e)); setCode(''); setView('code'); notify('Code generation failed. Review the error and try again.'); }
    finally { setBusy(false); }
  }

  async function run() {
    if (!code.trim() || running) return;
    setRunning(true);
    setRunError(false);
    setView('result');
    setOutput('Starting the runner…');
    try {
      if (webMode) {
        setOutput('Web preview ready. Use the preview below to interact with your app.');
        setRunning(false);
        return;
      }
      const response = await api.post('/api/run', { language, code, stdin });
      const data = response.data as { output?: string; error?: string; exitCode?: number; compiler?: string };
      setOutput((data.output || data.error || 'Program finished.') + (data.compiler ? '\n\nCompiler: ' + data.compiler : '') + (typeof data.exitCode === 'number' && data.exitCode !== 0 ? '\n\nExit code: ' + data.exitCode : ''));
      setRunError(false);
    } catch (e) { setOutput(getError(e)); setRunError(true); }
    finally { setRunning(false); }
  }

  function saveProject() {
    if (!code.trim()) { notify('Generate or enter code before saving'); return; }
    const project: Project = { id: Date.now().toString(36), title: projectTitle, language, prompt, code, summary, updated: Date.now() };
    setSaved(old => [project, ...old.filter(p => p.title !== project.title)].slice(0, 20));
    notify('Project saved on this device');
  }
  function loadProject(project: Project) {
    setProjectTitle(project.title); setLanguage(project.language); setPrompt(project.prompt); setCode(project.code); setSummary(project.summary); setView('code'); setShowProjects(false); notify('Project opened');
  }
  function downloadCode() {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = projectTitle.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 50) + '.' + selected.ext; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className={'lokicode-shell ' + (dark ? 'lokicode-dark' : '')}>
      <header className="lokicode-topbar">
        <button className="lk-back" onClick={onBack}><ArrowLeft size={18} /> <span>Back to LokiBot</span></button>
        <div className="lk-brand"><div className="lk-brand-icon"><Code2 size={20} /></div><div><b>LokiBot <span className="lk-brand-sub">· Loki</span></b><small>Lokicode · Build something brilliant</small></div></div>
        <div className="lk-top-actions">
          <button className="lk-secondary" onClick={() => setShowProjects(!showProjects)}><History size={16} /> Projects <span>{saved.length}</span></button>
          <button className="lk-secondary" onClick={saveProject}><Save size={16} /> Save</button>
        </div>
      </header>
      {showProjects && <div className="lk-project-drawer"><div className="lk-drawer-head"><b><History size={16} /> Saved projects</b><button onClick={() => setShowProjects(false)}><X size={16} /></button></div>{saved.length ? saved.map(project => <button key={project.id} className="lk-project-item" onClick={() => loadProject(project)}><FileCode2 size={17} /><span><b>{project.title}</b><small>{languages.find(l => l.value === project.language)?.label || project.language} · {new Date(project.updated).toLocaleDateString()}</small></span><ChevronDown size={14} /></button>) : <p className="lk-empty">Saved projects stay on this device.</p>}</div>}
      <main className="lk-main" tabIndex={0}>
        <section className="lk-intro"><div className="lk-eyebrow"><Sparkles size={14} /> AI CODING STUDIO</div><h1>Ideas into <span>working code.</span></h1><p>Describe what you want to build. LokiBot writes it, explains it, and lets you run it.</p></section>
        <section className="lk-request-card">
          <label htmlFor="lk-language">I want to code in</label>
          <div className="lk-language-wrap"><Braces size={18} /><select id="lk-language" value={language} onChange={e => setLanguage(e.target.value)}>{languages.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={15} /></div>
          <label htmlFor="lk-prompt">What should Lokicode build?</label>
          <textarea id="lk-prompt" rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your app, game, tool, website, algorithm… Be as specific as you like." onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate(); }} />
          <div className="lk-starters">{starters.map(item => <button key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div>
          <div className="lk-request-footer"><span><Sparkles size={14} /> Complete code · summary · run & test</span><button className="lk-generate" onClick={generate} disabled={busy || !prompt.trim()}>{busy ? <><LoaderCircle className="lk-spin" size={17} /> Writing code…</> : <><WandSparkles size={17} /> Generate code</>}</button></div>
        </section>
        {(code || busy || hasAttempted) && <section className={'lk-workspace ' + (fullscreen ? 'lk-fullscreen' : '')}>
          <div className="lk-workspace-head"><div><span className="lk-live-dot" /><div><b>{projectTitle}</b><small>{selected.label} · {code.split('\n').length} lines</small></div></div><div className="lk-workspace-actions"><button onClick={() => setFullscreen(!fullscreen)} title="Toggle workspace size"><Maximize2 size={15} /></button><button onClick={() => { setCode(''); setSummary('Your build summary will appear here.'); setView('code'); }} title="Clear code"><X size={15} /></button></div></div>
          {busy && !code ? <div className="lk-code-loading"><div className="lk-loader-orb"><Code2 size={28} /></div><b>Crafting your solution</b><span>Planning · writing · checking the details</span><div className="lk-loading-bars"><i /><i /><i /><i /></div></div> : <>
            <div className="lk-summary"><div><Sparkles size={16} /><b>Build summary</b></div><p>{summary}</p></div>
            <div className="lk-tabs"><button className={view === 'code' ? 'active' : ''} onClick={() => setView('code')}><Code2 size={15} /> Code</button><button className={view === 'result' ? 'active' : ''} onClick={() => setView('result')}><Terminal size={15} /> Run result</button><span className="lk-tab-spacer" /><button onClick={async () => { try { await navigator.clipboard.writeText(code); notify('Code copied'); } catch { notify('Clipboard unavailable'); } }}><Copy size={14} /> Copy code</button><button onClick={downloadCode}><Download size={14} /> Download</button><button onClick={generate}><RotateCcw size={14} /> Regenerate</button></div>
            {view === 'code' ? <div className="lk-editor"><div className="lk-line-numbers">{code.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}</div><div className="lk-editor-stage"><pre className="lk-code-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightCode(code) + (code.endsWith('\n') ? ' ' : '') }} /><textarea aria-label="Editable source code" spellCheck={false} value={code} onChange={e => setCode(e.target.value)} onScroll={e => { const pre = e.currentTarget.previousElementSibling as HTMLElement | null; if (pre) { pre.scrollTop = e.currentTarget.scrollTop; pre.scrollLeft = e.currentTarget.scrollLeft; } }} /></div></div> : <div className="lk-result-view">
              {webMode ? <div className="lk-web-preview-head"><span><span className="lk-live-dot" /> Live web preview</span><button onClick={() => setView('code')}><Code2 size={14} /> Back to code</button></div> : <><label htmlFor="lk-stdin">Program input (stdin) · optional</label><textarea id="lk-stdin" className="lk-stdin" value={stdin} onChange={e => setStdin(e.target.value)} placeholder="Type input here, one value per line…" /><div className="lk-terminal-head"><Terminal size={15} /> Output console <button onClick={() => setOutput('')}><X size={13} /> Clear</button></div><pre className={'lk-output ' + (runError ? 'error' : '')}>{running ? 'Running your code…' : output}</pre></>}
              {webMode && <iframe className="lk-preview-frame" title="Your running web app" sandbox="allow-scripts" srcDoc={previewHtml} />}
            </div>}
            <div className="lk-run-footer"><span>{view === 'result' ? (running ? 'Execution in progress' : 'Output view · switch back to Code any time') : 'Ready to execute · edits are included'}</span><button className="lk-run-button" onClick={run} disabled={running || !code.trim()}><CirclePlay size={18} /> {running ? 'Running…' : webMode ? 'Run preview' : 'Run code'}</button></div>
          </>}
        </section>}
        <footer className="lk-footer"><ShieldCheckFallback /> Code runs in an isolated service. Review generated code before running it.</footer>
      </main>
    </div>
  );
}
function ShieldCheckFallback() { return <span className="lk-shield">✓</span>; }
