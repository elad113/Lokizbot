import { useEffect, useMemo, useRef, useState } from 'react';
import { api, image as imageTools, imageGeneration } from './api';
import {
  Sparkles,
  Send,
  Plus,
  Search,
  Settings2,
  Brain,
  BookOpen,
  ImagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  WandSparkles,
  MessageCircle,
  GraduationCap,
  ChevronDown,
  Trash2,
  Copy,
  Check,
  Menu,
  X,
  Sun,
  Moon,
  SlidersHorizontal,
  Paperclip,
  Zap,
  Heart,
  Globe,
  Languages,
  Calculator,
  FileText,
  ListChecks,
  Lightbulb,
  Clock,
  Target,
  Headphones,
  PenLine,
  ShieldCheck,
  Palette,
  Bookmark,
  Mic,
  Code2,
  Gamepad2,
  CalendarDays,
  Timer,
  ScrollText,
  RefreshCw,
  Star,
  NotebookPen,
  Trophy,
  Atom,
  FlaskConical,
  Music,
  Camera,
  Download,
  Share2,
  CircleHelp,
} from 'lucide-react';
import './index.css';
import Lokicode from './Lokicode';

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  kind?: string;
  interface?: { type: string; title: string; subtitle?: string; items: { title: string; description: string; meta?: string }[] };
};
type Chat = { id: string; title: string; updated: number; messages: Msg[]; pinned?: boolean };
const tools = [
  ['🧠', 'Explain anything', 'Explain a difficult topic simply'],
  ['📚', 'Study mode', 'Teach me step by step'],
  ['🗂️', 'Flashcards', 'Create study flashcards'],
  ['📝', 'Quiz maker', 'Make an interactive quiz'],
  ['📄', 'Summarize text', 'Summarize notes or an article'],
  ['🎯', 'Study plan', 'Build a revision plan'],
  ['🌍', 'Language coach', 'Practice a language'],
  ['🧮', 'Math solver', 'Explain each calculation'],
  ['✍️', 'Writing coach', 'Improve my writing'],
  ['💡', 'Brainstorm', 'Generate creative ideas'],
  ['💻', 'Code helper', 'Explain or debug code'],
  ['🔬', 'Science lab', 'Explore science concepts'],
  ['🏛️', 'History guide', 'Explore historical events'],
  ['🗺️', 'Geography explorer', 'Learn about the world'],
  ['📖', 'Story studio', 'Create an interactive story'],
  ['🧩', 'Riddle room', 'Solve a brain teaser'],
  ['🧠', 'Memory trainer', 'Practice memory skills'],
  ['⏱️', 'Focus timer', 'Plan a focus session'],
  ['📆', 'Smart planner', 'Organize tasks and goals'],
  ['📋', 'Checklist maker', 'Turn goals into checklists'],
  ['🎤', 'Presentation coach', 'Prepare a presentation'],
  ['🧾', 'Notes organizer', 'Organize messy notes'],
  ['🔎', 'Research assistant', 'Compare ideas and sources'],
  ['🎨', 'Creative studio', 'Explore creative concepts'],
  ['💬', 'Debate partner', 'Practice an argument'],
  ['🌱', 'Habit builder', 'Build a small daily habit'],
  ['🧪', 'Experiment designer', 'Plan a safe science activity'],
  ['📨', 'Email helper', 'Draft a clear email'],
  ['📊', 'Data explainer', 'Understand numbers and charts'],
  ['⭐', 'Daily challenge', 'Get a quick daily challenge'],
  ['🖼️', 'AI image creator', 'Create original images from a description'],
  ['🍝', 'Recipe planner', 'Build a recipe with timing and ingredients'],
  ['🧳', 'Trip planner', 'Create a practical itinerary'],
  ['⚖️', 'Decision matrix', 'Compare options with clear criteria'],
  ['🗒️', 'Meeting notes', 'Turn notes into decisions and action items'],
  ['💰', 'Budget planner', 'Organize a budget and spending plan'],
  ['🏋️', 'Workout builder', 'Create a balanced workout plan'],
  ['🌿', 'Habit tracker', 'Design a simple habit system'],
  ['🎙️', 'Interview practice', 'Practice interview questions and feedback'],
  ['📄', 'Resume helper', 'Improve a resume or application'],
];
const starters = [
  {
    icon: '✦',
    title: 'Explain something',
    desc: 'Make a tricky topic feel easy',
    prompt:
      'Teach me a difficult topic in a simple, engaging way. Start by asking what topic I want.',
  },
  {
    icon: '▤',
    title: 'Study for a test',
    desc: 'Build a revision plan',
    prompt:
      'Help me prepare for a school test. Ask me the subject, grade and test date, then make a study plan.',
  },
  {
    icon: '▧',
    title: 'Create flashcards',
    desc: 'Remember the important bits',
    prompt:
      'Help me create useful flashcards for studying. Ask me for the topic or notes.',
  },
  {
    icon: '◎',
    title: 'Analyze an image',
    desc: 'Learn from a photo or worksheet',
    prompt:
      'I want help analyzing an image. Ask me to upload it and explain what you can identify.',
  },
];
const initial: Chat[] = [];
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lokizon_chats') || '[]');
    } catch {
      return [];
    }
  });
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'chat' | 'learn'>('chat');
  const [thinkingLevel, setThinkingLevel] = useState(localStorage.getItem('lokibot_thinking') || 'medium');
  const [responseLength, setResponseLength] = useState(localStorage.getItem('lokibot_length') || 'short');
  const [replyLanguage, setReplyLanguage] = useState(localStorage.getItem('lokibot_reply_language') || 'auto');
  const [modelChoice, setModelChoice] = useState(localStorage.getItem('lokibot_model') || 'lokizenith-3.2');
  const [personality, setPersonality] = useState(
    localStorage.getItem('lokizon_personality') ||
      'Friendly, clever, encouraging and clear'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showLokicode, setShowLokicode] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [query, setQuery] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [toast, setToast] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(
    localStorage.getItem('lokizon_dark') === 'true'
  );
  const [showAllTools, setShowAllTools] = useState(false);
  const [toolSearch, setToolSearch] = useState('');
  const [flashcards, setFlashcards] = useState<
    { q: string; a: string }[] | null
  >(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [quiz, setQuiz] = useState<
    { q: string; options: string[]; answer: number; why: string }[] | null
  >(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStudioOpen, setImageStudioOpen] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageFullScreen, setImageFullScreen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [alwaysInstructions, setAlwaysInstructions] = useState(localStorage.getItem('lokizon_instructions') || '');
  const [callName, setCallName] = useState(localStorage.getItem('lokizon_call_name') || '');
  const [account, setAccount] = useState<{email:string;name:string}|null>(() => { try { const x=localStorage.getItem('lokibot_account'); return x ? JSON.parse(x) : null; } catch { return null; } });
  const [authOpen, setAuthOpen] = useState(false);
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});
  const [authMode, setAuthMode] = useState<'signup'|'login'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [usage, setUsage] = useState(() => { try { const x=JSON.parse(localStorage.getItem('lokibot_usage')||'{}'); if (Date.now()-(x.resetAt||0)>=21600000) return {used:0,resetAt:0}; return {used:Number(x.used)||0,resetAt:Number(x.resetAt)||0}; } catch { return {used:0,resetAt:0}; } });
  const usageLimit = account ? 25000 : 11000;
  const usageRemaining = Math.max(0, usageLimit-usage.used);
  const usagePercent = Math.min(100, Math.round(usage.used/usageLimit*100));
  const usageColor = usagePercent >= 82 ? '#ef4444' : usagePercent >= 60 ? '#f59e0b' : usagePercent >= 35 ? '#22c55e' : '#38bdf8';
  useEffect(() => { localStorage.setItem('lokibot_usage', JSON.stringify(usage)); }, [usage]);
  const [displayName, setDisplayName] = useState(
    localStorage.getItem('lokizon_name') || 'Explorer'
  );
  const [theme, setTheme] = useState(
    localStorage.getItem('lokizon_theme') || 'aurora'
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(
    sessionStorage.getItem('lokizon_welcome') === 'yes'
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeChat = chats.find(c => c.id === active);
  const messages = activeChat?.messages || [];
  useEffect(() => {
    localStorage.setItem('lokizon_chats', JSON.stringify(chats));
  }, [chats]);
  useEffect(() => {
    localStorage.setItem('lokizon_personality', personality);
  }, [personality]);
  useEffect(() => { localStorage.setItem('lokizon_instructions', alwaysInstructions); }, [alwaysInstructions]);
  useEffect(() => { localStorage.setItem('lokizon_call_name', callName); }, [callName]);
  useEffect(() => {
    const preventZoom = (event: WheelEvent) => { if (event.ctrlKey || event.metaKey) event.preventDefault(); };
    const preventGesture = (event: Event) => event.preventDefault();
    document.addEventListener('wheel', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture as EventListener, { passive: false });
    document.addEventListener('gesturechange', preventGesture as EventListener, { passive: false });
    return () => { document.removeEventListener('wheel', preventZoom); document.removeEventListener('gesturestart', preventGesture as EventListener); document.removeEventListener('gesturechange', preventGesture as EventListener); };
  }, []);
  useEffect(() => {
    localStorage.setItem('lokizon_dark', String(dark));
    document.documentElement.dataset.dark = String(dark);
  }, [dark]);
  useEffect(() => {
    localStorage.setItem('lokizon_theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, busy]);
  useEffect(() => {
    if (!welcomeDone) {
      const t = setTimeout(() => {
        setWelcomeDone(true);
        sessionStorage.setItem('lokizon_welcome', 'yes');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [welcomeDone]);
  function notify(s: string) {
    setToast(s);
    setTimeout(() => setToast(''), 2200);
  }
  function newChat() {
    const c = {
      id: uid(),
      title: 'New conversation',
      updated: Date.now(),
      messages: [] as Msg[],
    };
    setChats(p => [c, ...p]);
    setActive(c.id);
    setInput('');
    setMode('chat');
    setFlashcards(null);
    setQuiz(null);
    setMobileNav(false);
  }
  function patchChat(id: string, fn: (c: Chat) => Chat) {
    setChats(p => p.map(c => (c.id === id ? fn(c) : c)));
  }
  function chooseTool(t: string) {
    setInput(t);
    setShowAllTools(false);
    setShowTools(false);
    setMobileNav(false);
  }
  async function send(text = input) {
    if (busy || (!text.trim() && !attachment)) return;
    if (usageRemaining <= 0) { notify('Your Usage Limit has been finished'); return; }
    let chat = activeChat;
    if (!chat) {
      chat = {
        id: uid(),
        title: 'New conversation',
        updated: Date.now(),
        messages: [],
      };
      setChats(p => [chat!, ...p]);
      setActive(chat.id);
    }
    const userText =
      text.trim() || 'Please analyze this image and explain what you see.';
    if (userText.startsWith('/image ')) {
      const prompt = userText.slice(7).trim();
      if (!prompt) { notify('Describe the image you want to create'); return; }
      const imageChat = chat;
      const pendingId = uid();
      const userMsg: Msg = { id: uid(), role: 'user', text: 'Create image: ' + prompt };
      patchChat(imageChat.id, c => ({ ...c, title: c.messages.length === 0 ? ('Image: ' + prompt.slice(0, 30)) : c.title, updated: Date.now(), messages: [...c.messages, userMsg, { id: pendingId, role: 'assistant', text: 'Creating your image…', kind: 'image-pending' }] }));
      setInput(''); setBusy(true); setGeneratingImage(true); setImageStudioOpen(false);
      try {
        const result = await imageGeneration.generate(prompt);
        if (!result.image) throw new Error('The image service returned no image.');
        const src = 'data:' + (result.mimeType || 'image/png') + ';base64,' + result.image;
        patchChat(imageChat.id, c => ({ ...c, updated: Date.now(), messages: c.messages.map(m => m.id === pendingId ? { ...m, text: result.revisedPrompt || prompt, image: src, kind: 'image-generated' } : m) }));
        notify('Your image is ready');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Image generation failed';
        patchChat(imageChat.id, c => ({ ...c, messages: c.messages.map(m => m.id === pendingId ? { ...m, text: 'Image generation failed: ' + message, kind: 'image-error' } : m) }));
        notify('Could not create image');
      } finally { setBusy(false); setGeneratingImage(false); }
      return;
    }
    // Image generation has been removed; image attachments remain available for analysis.
    let imageUrl = preview;
    let prepared: any = null;
    if (attachment) {
      try {
        prepared = await imageTools.resizeIfNeeded(attachment);
        imageUrl = preview;
      } catch {
        notify('Could not prepare image');
        return;
      }
    }
    const userMsg: Msg = {
      id: uid(),
      role: 'user',
      text: userText,
      image: imageUrl || undefined,
    };
    const updatedMsgs = [...(chat.messages || []), userMsg];
    patchChat(chat.id, c => ({
      ...c,
      title: c.messages.length === 0 ? userText.slice(0, 38) : c.title,
      updated: Date.now(),
      messages: [...c.messages, userMsg],
    }));
    setInput('');
    setAttachment(null);
    setPreview('');
    setBusy(true);
    setFlashcards(null);
    setQuiz(null);
    try {
      const response = await api.post('/api/chat', {
        messages: updatedMsgs
          .slice(-18)
          .map(m => ({ role: m.role, content: m.text })),
        personality,
        alwaysInstructions: alwaysInstructions + (callName.trim() ? '\nAlways address the user as: ' + callName.trim() : ''),
        mode,
        thinkingLevel, responseLength, replyLanguage, modelChoice,
        image: prepared
          ? { data: prepared.data, mimeType: prepared.mimeType }
          : undefined,
      });
      const data = response.data as {
        text?: string;
        error?: string;
        flashcards?: { q: string; a: string }[];
        quiz?: { q: string; options: string[]; answer: number; why: string }[];
        interface?: { type: string; title: string; subtitle?: string; items: { title: string; description: string; meta?: string }[] };
      };
      const reply =
        data.text ||
        data.error ||
        'I could not get a response. Please try again.';
      const tokenEstimate = Math.max(1, Math.ceil((userText.length + reply.length + updatedMsgs.slice(-18).reduce((n,m)=>n+m.text.length,0)) / 3.7));
      setUsage(prev => { const used = Math.min(usageLimit, prev.used + tokenEstimate); return { used, resetAt: used >= usageLimit ? (prev.resetAt || Date.now()) : prev.resetAt }; });
      patchChat(chat.id, c => ({
        ...c,
        updated: Date.now(),
        messages: [
          ...c.messages,
          {
            id: uid(),
            role: 'assistant',
            text: reply,
            kind: reply.includes('FLASHCARDS_JSON:') ? 'flashcards' : undefined,
            interface: data.interface,
          },
        ],
      }));
      if (data.flashcards?.length) {
        setFlashcards(data.flashcards);
        setCardIndex(0);
      }
      if (data.quiz?.length) {
        setQuiz(data.quiz);
        setQuizIndex(0);
        setQuizScore(0);
        setQuizChoice(null);
      }
    } catch (e) {
      patchChat(chat.id, c => ({
        ...c,
        messages: [
          ...c.messages,
          {
            id: uid(),
            role: 'assistant',
            text: 'I hit a connection problem. Your message is still in this chat. Please try sending it again in a moment.',
          },
        ],
      }));
    } finally {
      setBusy(false);
    }
  }
  function removeChat(id: string) {
    setChats(p => p.filter(c => c.id !== id));
    if (active === id) setActive(null);
    setConfirmDelete(null);
    notify('Chat permanently deleted');
  }
  function togglePin(id: string) { patchChat(id, c => ({ ...c, pinned: !c.pinned })); notify('Chat pin updated'); }
  function startImageGeneration() { const p = imagePrompt.trim(); if (!p) { notify('Describe the image first'); return; } void send('/image ' + p); }
  const filtered = chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
  const pinnedChats = filtered.filter(c => c.pinned);
  const regularChats = filtered.filter(c => !c.pinned);
  const visibleTools = tools.filter(t =>
    (t[1] + ' ' + t[2]).toLowerCase().includes(toolSearch.toLowerCase())
  );
  const toolPrompt = (name: string) =>
    (
      ({
        Flashcards:
          'Create 8 concise study flashcards about the topic I give you. Format each as Question: ... / Answer: ...',
        'Quiz maker':
          'Create a 5-question multiple-choice quiz about the topic I give you. Include the correct answer and a brief explanation for each.',
        'Summarize text':
          'Summarize the text I provide into key ideas, definitions, and things likely to appear on a test.',
        'Math solver':
          'Help me solve this step by step. Explain the reasoning rather than only giving the answer.',
        'Study plan':
          'Help me create a realistic school study plan. Ask for subject, test date and available time.',
        'Focus timer':
          'Help me plan a focused study sprint with a short break.',
        'Daily challenge': 'Give me a fun 5-minute learning challenge.',
        'Language coach':
          'Act as my friendly language tutor. Teach me through short practice and corrections.',
      }) as Record<string, string>
    )[name] ||
    'Act as my ' + name + ' and help me. Start with a useful first step.';
  if (showLokicode) return <Lokicode onBack={() => setShowLokicode(false)} dark={dark} notify={notify} />;
  if (!welcomeDone)
    return (
      <div className="splash">
        <div className="splash-orb orb-one" />
        <div className="splash-orb orb-two" />
        <div className="splash-orb orb-three" />
        <div className="splash-content">
          <div className="logo-mark big">
            <Sparkles size={35} />
          </div>
          <div className="splash-word">
            Lokiz <span>Studios</span>
          </div>
          <div className="splash-line">
            <i />
          </div>
          <p>Big ideas. Brighter learning.</p>
          <div className="splash-dots">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="splash-bottom">MADE FOR YOUR CURIOSITY</div>
      </div>
    );
  return (
    <div className={'app-shell ' + (dark ? 'dark' : '')}>
      <aside
        className={
          'sidebar ' +
          (collapsed ? 'collapsed' : '') +
          (mobileNav ? ' mobile-open' : '')
        }
      >
        <div className="brand-row">
          <div className="logo-mark">
            <Sparkles size={21} />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <b>
                Loki<span>Bot</span>
              </b>
              <small>by Lokiz Studios</small>
            </div>
          )}
          <button
            className="icon-btn collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title="Toggle sidebar"
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileNav(false)}
          >
            <X size={19} />
          </button>
        </div>
        <button className="new-chat-btn" onClick={newChat}>
          <Plus size={18} />
          {!collapsed && 'New chat'}
          <span className="shortcut">⌘ K</span>
        </button>
        <button
          className="side-link"
          onClick={() => {
            setShowAllTools(true);
            setMobileNav(false);
          }}
        >
          <WandSparkles size={17} />
          {!collapsed && 'Explore tools'}
          {!collapsed && <span className="side-count">30</span>}
        </button>
        <button className="side-link lokicode-link" onClick={() => { setShowLokicode(true); setMobileNav(false); }}>
          <Code2 size={18} />
          {!collapsed && 'Lokicode'}
          {!collapsed && <span className="new-pill code-pill">NEW</span>}
        </button>        <button
          className={'side-link ' + (mode === 'learn' ? 'selected' : '')}
          onClick={() => {
            setMode(mode === 'learn' ? 'chat' : 'learn');
            setMobileNav(false);
          }}
        >
          <GraduationCap size={18} />
          {!collapsed && 'Learning studio'}
          {!collapsed && <span className="new-pill">NEW</span>}
        </button>
        <div className="side-section">
          {!collapsed && (
            <div className="section-label">
              YOUR SPACE{' '}
              <button onClick={() => setSearchOpen(!searchOpen)}>
                <Search size={14} />
              </button>
            </div>
          )}
          {searchOpen && !collapsed && (
            <input
              className="search-input"
              placeholder="Search chats..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          )}
        </div>
        <div className="chat-list">
          {pinnedChats.length > 0 && !collapsed && <div className="history-section-title">PINNED</div>}
          {pinnedChats.map(c => (
            <div
              className={'chat-item ' + (c.id === active ? 'active' : '')}
              key={c.id}
            >
              <button
                className="chat-select"
                onClick={() => {
                  setActive(c.id);
                  setFlashcards(null);
                  setQuiz(null);
                  setMobileNav(false);
                }}
              >
                <MessageCircle size={15} />
                {!collapsed && <span>{c.title}</span>}
              </button>
              {!collapsed && <><button className={'pin-chat ' + (c.pinned ? 'pinned' : '')} title={c.pinned ? 'Unpin chat' : 'Pin chat'} onClick={() => togglePin(c.id)}><Star size={13} fill={c.pinned ? 'currentColor' : 'none'} /></button><button className="delete-chat" title="Delete chat" onClick={() => setConfirmDelete(c.id)}><Trash2 size={13} /></button></>}
            </div>
          ))}
          {regularChats.length > 0 && pinnedChats.length > 0 && !collapsed && <div className="history-section-title">YOUR CHATS</div>}
          {regularChats.map(c => (
            <div className={'chat-item ' + (c.id === active ? 'active' : '')} key={c.id}>
              <button className="chat-select" onClick={() => { setActive(c.id); setFlashcards(null); setQuiz(null); setMobileNav(false); }}>
                <MessageCircle size={15} />
                {!collapsed && <span>{c.title}</span>}
              </button>
              {!collapsed && <><button className={'pin-chat ' + (c.pinned ? 'pinned' : '')} title="Pin chat" onClick={() => togglePin(c.id)}><Star size={13} /></button><button className="delete-chat" title="Delete chat" onClick={() => setConfirmDelete(c.id)}><Trash2 size={13} /></button></>}
            </div>
          ))}
          {!filtered.length && !collapsed && <p className="empty-history">Your conversations will appear here.</p>}
        </div>
        <div className="sidebar-bottom">
          <button className="side-link" onClick={() => setShowSettings(true)}>
            <Settings2 size={18} />
            {!collapsed && 'Personalize Lokizon'}
          </button>
          <button className="profile-row" onClick={() => setShowProfile(true)}>
            <div className="avatar">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="profile-info">
                  <b>{displayName}</b>
                  <small>Curiosity explorer</small>
                </div>
                <SlidersHorizontal size={15} />
              </>
            )}
          </button>
        </div>
      </aside>
      {mobileNav && (
        <div className="mobile-scrim" onClick={() => setMobileNav(false)} />
      )}
      <main className="main-area">
        <div className="profile-topline"><div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div><div className="profile-identity"><b>{account?.name || displayName}</b><small>{account?.email || (callName ? 'AI calls you ' + callName : 'Guest account')}</small></div><div className="usage-meter" title={`${usage.used.toLocaleString()} tokens used of ${usageLimit.toLocaleString()}`}><div className="usage-meter-top"><b>Usage remaining: {usageRemaining.toLocaleString()}</b><span>{usagePercent}% used</span></div><div className="usage-track"><i style={{width:usagePercent+'%',background:usageColor}} /></div></div>{!account && <button className="account-cta" onClick={() => {setAuthMode('signup');setAuthOpen(true)}}>Sign up / Log in</button>}<button onClick={() => setShowProfile(true)}><SlidersHorizontal size={14} /> Profile</button></div>
        <header className="topbar">
          <div className="top-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <label className="model-pill model-select-wrap" title="Choose LokiBot model"><span className="online-dot" /><select aria-label="AI model" value={modelChoice} onChange={e => { setModelChoice(e.target.value); localStorage.setItem('lokibot_model', e.target.value); }}><option value="lokizenith-3.2">Lokizenith 3.2</option><option value="zenith-3.5-ultra">Zenith 3.5 Ultra</option></select><ChevronDown size={14} /></label>
            <label className="effort-select-wrap" title="Thinking effort"><Brain size={14} /><select aria-label="Thinking effort" value={thinkingLevel} onChange={e => { setThinkingLevel(e.target.value); localStorage.setItem('lokibot_thinking', e.target.value); }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="extra-high">Extra High</option></select></label>
            {mode === 'learn' && (
              <span className="mode-label">
                <GraduationCap size={14} /> Learning mode
              </span>
            )}
          </div>
          <div className="top-actions">
            <button
              className="top-icon"
              onClick={() => setDark(!dark)}
              title="Toggle theme"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className="top-icon"
              onClick={() => setShowSettings(true)}
              title="Personalize"
            >
              <Settings2 size={17} />
            </button>
            <button className="upgrade-btn" onClick={() => setShowTools(true)}>
              <Sparkles size={14} /> Magic tools
            </button>
          </div>
        </header>
        {!activeChat || messages.length === 0 ? (
          <section className="welcome-view">
            <div className="welcome-badge">
              <span className="badge-spark">✦</span> YOUR PERSONAL AI UNIVERSE{' '}
              <span className="badge-glow" />
            </div>
            <h1>
              Hey {displayName},<br />
              <span className="gradient-text">what are we dreaming</span>
              <br />
              up today<span className="gradient-text">?</span>
            </h1>
            <p className="welcome-sub">
              Your ideas, your learning, your world. Let's make something
              wonderful.
            </p>
            {imageStudioOpen && <div className="image-studio-card"><label>Describe the image LokiBot should create</label><textarea className="image-studio-input" rows={3} value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="A cinematic fantasy city at sunset, detailed textures, square composition…" /><div className="image-studio-actions"><small>Uses LOKIZ_IMAGE_GEN only</small><button onClick={startImageGeneration} disabled={generatingImage || !imagePrompt.trim()}><WandSparkles size={16} /> Create image</button></div></div>}
            <div className="composer home-composer">
              <textarea
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  mode === 'learn'
                    ? 'What would you like to learn today?'
                    : 'Ask anything, imagine everything…'
                }
              />
              {preview && (
                <div className="attachment-preview">
                  <img src={preview} />
                  <button
                    onClick={() => {
                      setPreview('');
                      setAttachment(null);
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="composer-footer">
                <div className="composer-tools">
                  <button className="tool-btn" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /><span>Attach image</span></button>
                  <button className="tool-btn" onClick={() => { setImageStudioOpen(v => !v); setImagePrompt(''); }}><WandSparkles size={16} /><span>Create image</span></button>
                  <button
                    className={
                      'tool-btn ' + (mode === 'learn' ? 'active-tool' : '')
                    }
                    onClick={() => setMode(mode === 'learn' ? 'chat' : 'learn')}
                  >
                    <Brain size={16} />
                    <span>Learn</span>
                  </button>
                  <button
                    className="tool-btn"
                    onClick={() => setShowTools(!showTools)}
                  >
                    <Plus size={16} />
                    <span>Tools</span>
                  </button>
                </div>
                <button
                  className="send-btn"
                  onClick={() => send()}
                  disabled={busy || (!input.trim() && !attachment)}
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
            <div className="suggestion-grid">
              {starters.map((s, i) => (
                <button
                  className={'suggestion-card card-' + i}
                  key={s.title}
                  onClick={() => {
                    setInput(s.prompt);
                    if (i === 1 || i === 2) setMode('learn');
                  }}
                >
                  <span className="suggestion-icon">{s.icon}</span>
                  <span className="suggestion-copy">
                    <b>{s.title}</b>
                    <small>{s.desc}</small>
                  </span>
                  <span className="suggestion-arrow">↗</span>
                </button>
              ))}
            </div>
            <div className="quick-tools-label">
              <span>✧</span> A LITTLE MAGIC TO GET YOU STARTED
            </div>
            <div className="quick-tools">
              {tools.slice(0, 6).map(t => (
                <button
                  key={t[1]}
                  onClick={() => {
                    setInput(toolPrompt(t[1]));
                    if (t[1] === 'Study mode' || t[1] === 'Flashcards')
                      setMode('learn');
                  }}
                >
                  {t[0]} {t[1]}
                </button>
              ))}
              <button
                className="all-tools"
                onClick={() => setShowAllTools(true)}
              >
                View all 40 <span>↗</span>
              </button>            </div>
          </section>
        ) : (
          <section className="conversation-view">
            <div className="messages">
              {messages.map(m => (
                <div key={m.id} className={'message-row ' + m.role}>
                  <div className={'message-avatar ' + m.role}>
                    {m.role === 'assistant' ? (
                      <Sparkles size={16} />
                    ) : (
                      displayName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="message-body">
                    {m.role === 'assistant' && (
                      <div className="message-name">
                        LokiBot <span>✦</span>
                      </div>
                    )}

                    {m.kind === 'image-pending' ? <div className="image-square-placeholder"><div className="image-shimmer" /><Sparkles size={34} /><b>Creating your image</b><small>Painting pixels · adding details · refining</small></div> : null}
                    {m.image && (m.kind === 'image-generated' ? <div className="generated-image-card"><img src={m.image} alt="AI-generated image" onClick={() => setImageFullScreen(m.image!)} /><div className="generated-image-actions"><button onClick={() => setImageFullScreen(m.image!)}><Search size={13} /> Open</button><button onClick={() => { const a=document.createElement('a'); a.href=m.image!; a.download='lokibot-image.png'; a.click(); }}><Download size={13} /> Download</button><button onClick={async () => { try { const blob=await (await fetch(m.image!)).blob(); await navigator.clipboard.write([new ClipboardItem({[blob.type]:blob})]); notify('Image copied'); } catch { notify('Copy image is not supported here'); } }}><Copy size={13} /> Copy</button><button onClick={async () => { try { const blob=await (await fetch(m.image!)).blob(); const file=new File([blob],'lokibot-image.png',{type:blob.type}); if(navigator.share && navigator.canShare?.({files:[file]})) await navigator.share({files:[file],title:'LokiBot image'}); else { const a=document.createElement('a'); a.href=m.image!; a.download='lokibot-image.png'; a.click(); notify('Sharing unavailable; image downloaded'); } } catch { notify('Could not share image'); } }}><Share2 size={13} /> Share</button><button onClick={() => { setImagePrompt('Edit this image: ' + m.text); setImageStudioOpen(true); notify('Edit the prompt, then create a new version'); }}><WandSparkles size={13} /> Edit</button></div></div> : <img className="message-image" src={m.image} alt="Attached image" />)}
                    {m.interface && <div className="ui-interface-card"><div className="ui-interface-head"><small>{m.interface.type || 'Interactive guide'}</small><h3>{m.interface.title}</h3><p>{m.interface.subtitle}</p></div><div className="ui-interface-items">{m.interface.items.map((item,i) => <div className="ui-interface-item" key={i}><b>{i+1}. {item.title}</b><p>{item.description}</p>{item.meta && <span>{item.meta}</span>}</div>)}</div></div>}
                    <div
                      className={
                        'message-text ' + m.role + ' ' +
                        (m.role === 'assistant' ? 'assistant-text' : '')
                      }
                    >
                      {m.text}
                    </div>
                    {m.role === 'assistant' && (() => { const urls = Array.from(new Set(m.text.match(/https?:\/\/[^\s)\]>]+/g) || [])).slice(0,8); const cited = urls.length > 0; const uncertain = /I’m not sure|I'm not sure|cannot verify|can't verify|ייתכן|לא בטוח|לא ניתן לאמת/i.test(m.text); const score = Math.max(25, Math.min(98, 58 + urls.length * 8 - (uncertain ? 18 : 0))); const meterColor = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#ef4444'; return <div className="resources-trust-row"><button className="resources-toggle" onClick={() => setExpandedResources(p => ({...p,[m.id]:!p[m.id]}))}><Globe size={14}/> Resources {cited ? '('+urls.length+')' : ''} <ChevronDown size={12}/></button><div className="trust-meter" title="Heuristic confidence indicator, not a fact-check"><span>Trust estimate</span><div className="trust-track"><i style={{width:score+'%',background:meterColor}}/></div><b style={{color:meterColor}}>{score}%</b></div>{expandedResources[m.id] && <div className="resources-list" style={{width:'100%'}}>{cited ? urls.map((url,i)=><a href={url} key={i} target="_blank" rel="noreferrer">{url}</a>) : <small>No source links were included in this answer. Ask LokiBot to provide sources for factual claims.</small>}<small>Trust estimate is a rough text-based signal, not independent verification.</small></div>}</div>; })()}
                    {m.role === 'assistant' && (
                      <div className="message-actions">
                        <button
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(m.text); notify('Copied to clipboard'); }
                            catch { notify('Clipboard access is unavailable in this browser'); }
                          }}
                        >
                          <Copy size={13} /> Copy
                        </button>
                        <button
                          onClick={() => {
                            setInput(
                              'Explain this answer in a simpler way: ' + m.text
                            );
                            notify('Added to composer');
                          }}
                        >
                          <Lightbulb size={13} /> Simplify
                        </button>
                        <button
                          onClick={() => {
                            setInput(
                              'Turn this into study flashcards: ' + m.text
                            );
                            setMode('learn');
                          }}
                        >
                          <Bookmark size={13} /> Study this
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="message-row assistant">
                  <div className="message-avatar assistant">
                    <Sparkles size={16} />
                  </div>
                  <div className="typing-bubble">
                    <span />
                    <span />
                    <span /> <small>Lokizon is thinking</small>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {flashcards && (
              <div className="flashcard-panel">
                <div className="panel-eyebrow">
                  ✦ STUDY DECK · {flashcards.length} CARDS
                </div>
                <div
                  className="flashcard"
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  <small>
                    {showAnswer ? 'ANSWER' : 'QUESTION'} · {cardIndex + 1}/
                    {flashcards.length}
                  </small>
                  <h3>
                    {showAnswer
                      ? flashcards[cardIndex].a
                      : flashcards[cardIndex].q}
                  </h3>
                  <span>
                    Tap to {showAnswer ? 'see question' : 'reveal answer'}
                  </span>
                </div>
                <div className="flashcard-nav">
                  <button
                    onClick={() => {
                      setCardIndex(
                        (cardIndex - 1 + flashcards.length) % flashcards.length
                      );
                      setShowAnswer(false);
                    }}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => {
                      setCardIndex((cardIndex + 1) % flashcards.length);
                      setShowAnswer(false);
                    }}
                  >
                    Next card →
                  </button>
                </div>
              </div>
            )}
            {quiz && (
              <div className="quiz-panel">
                <div className="panel-eyebrow">
                  ✦ QUICK QUIZ · {quizIndex + 1}/{quiz.length}
                </div>
                <h3>{quiz[quizIndex].q}</h3>
                <div className="quiz-options">
                  {quiz[quizIndex].options.map((o, i) => (
                    <button
                      key={o}
                      className={
                        (quizChoice === i ? 'chosen ' : '') +
                        (showAnswer && i === quiz[quizIndex].answer
                          ? 'correct'
                          : '')
                      }
                      onClick={() => {
                        if (!showAnswer) {
                          setQuizChoice(i);
                          setShowAnswer(true);
                          if (i === quiz[quizIndex].answer)
                            setQuizScore(s => s + 1);
                        }
                      }}
                    >
                      {String.fromCharCode(65 + i)}. {o}
                    </button>
                  ))}
                </div>
                {showAnswer && (
                  <p className="quiz-explain">{quiz[quizIndex].why}</p>
                )}
                <div className="flashcard-nav">
                  <span>
                    Score: {quizScore}/{quiz.length}
                  </span>
                  <button
                    onClick={() => {
                      if (quizIndex + 1 < quiz.length) {
                        setQuizIndex(quizIndex + 1);
                        setQuizChoice(null);
                        setShowAnswer(false);
                      } else {
                        notify(
                          'Quiz complete! Score: ' +
                            quizScore +
                            '/' +
                            quiz.length
                        );
                        setQuiz(null);
                      }
                    }}
                  >
                    {quizIndex + 1 === quiz.length
                      ? 'Finish quiz'
                      : 'Next question →'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
        <div
          className={
            'bottom-composer-wrap ' +
            (messages.length === 0 && !activeChat ? 'home-bottom' : '')
          }
        >
          {imageStudioOpen && <div className="image-studio-card"><label>Describe the image LokiBot should create</label><textarea className="image-studio-input" rows={3} value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Describe style, subject, lighting and composition…" /><div className="image-studio-actions"><small>Uses LOKIZ_IMAGE_GEN only</small><button onClick={startImageGeneration} disabled={generatingImage || !imagePrompt.trim()}><WandSparkles size={16} /> Create image</button></div></div>}
          <div className="composer">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                mode === 'learn'
                  ? 'Ask your learning coach…'
                  : 'Message LokiBot…'
              }
            />
            {preview && (
              <div className="attachment-preview">
                <img src={preview} />
                <button
                  onClick={() => {
                    setPreview('');
                    setAttachment(null);
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
            <div className="composer-footer">
              <div className="composer-tools">
                <button className="tool-btn" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /><span>Image</span></button>
                <button className="tool-btn" onClick={() => setImageStudioOpen(v => !v)}><WandSparkles size={16} /><span>Create image</span></button>
                <button
                  className="tool-btn"
                  onClick={() => setMode(mode === 'learn' ? 'chat' : 'learn')}
                >
                  <Brain size={16} />
                  <span>Learn</span>
                </button>
                <button
                  className="tool-btn"
                  onClick={() => setShowTools(!showTools)}
                >
                  <Plus size={16} />
                  <span>Tools</span>
                </button>
              </div>              <button
                className="send-btn"
                onClick={() => send()}
                disabled={busy || (!input.trim() && !attachment)}
              >
                <Send size={17} />
              </button>
            </div>
          </div>
          <div className="disclaimer">
            Lokizon can make mistakes. Double-check important information.{' '}
            <span>✦ Made for curious minds</span>
          </div>
        </div>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="image/*,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.log"
          onChange={async e => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.type.startsWith('image/')) {
              setAttachment(f);
              setPreview(URL.createObjectURL(f));
              return;
            }
            const textLike = /\.(txt|md|csv|json|xml|html|css|js|ts|py|java|log)$/i.test(f.name) || f.type.startsWith('text/');
            if (!textLike) { notify('For now, attach an image or a text/code file (TXT, PDF is not supported yet).'); return; }
            if (f.size > 500000) { notify('File is too large. Maximum text file size is 500 KB.'); return; }
            try {
              const content = await f.text();
              setInput(old => (old ? old + '\\n\\n' : '') + 'Please read and analyze this attached file: ' + f.name + '\\n\\n--- FILE CONTENT ---\\n' + content + '\\n--- END FILE ---');
              notify('File content added to the message');
            } catch { notify('Could not read this file'); }
          }}
        />
      </main>
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div
            className="modal settings-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <div className="modal-icon">
                  <SlidersHorizontal size={19} />
                </div>
                <h2>Make Lokizon yours</h2>
                <p>Shape how your AI thinks, speaks and helps.</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setShowSettings(false)}
              >
                <X size={19} />
              </button>
            </div>
            <label className="field-label">REPLY LENGTH</label>
            <select className="settings-select" value={responseLength} onChange={e => setResponseLength(e.target.value)}><option value="short">Short (default)</option><option value="medium">Medium</option><option value="long">Long</option></select>
            <label className="field-label">REPLY LANGUAGE</label>
            <select className="settings-select" value={replyLanguage} onChange={e => setReplyLanguage(e.target.value)}><option value="auto">Match my message</option><option value="Hebrew">עברית</option><option value="English">English</option><option value="French">Français</option><option value="Spanish">Español</option><option value="Arabic">العربية</option></select>
            <label className="field-label">WHAT SHOULD THE AI CALL YOU?</label>
            <input className="profile-input" value={callName} onChange={e => setCallName(e.target.value)} placeholder="Your preferred name or nickname" maxLength={40} />
            <label className="field-label">ALWAYS FOLLOW THESE INSTRUCTIONS</label>
            <textarea className="settings-textarea" rows={3} value={alwaysInstructions} onChange={e => setAlwaysInstructions(e.target.value)} placeholder="Always answer in Hebrew, use a friendly tone, explain step by step…" />
            <label className="field-label">PERSONALITY</label>
            <textarea
              className="settings-textarea"
              rows={4}
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              placeholder="Friendly, funny, concise, patient…"
            />
            <div className="personality-presets">
              {[
                'Friendly & encouraging',
                'Funny & playful',
                'Teacher who explains clearly',
                'Concise & direct',
                'Creative & imaginative',
              ].map(p => (
                <button key={p} onClick={() => setPersonality(p)}>
                  {p}
                </button>
              ))}
            </div>
            <label className="field-label">COLOR UNIVERSE</label>
            <div className="theme-choices">
              {[
                ['aurora', 'Aurora'],
                ['sunset', 'Sunset'],
                ['ocean', 'Ocean'],
                ['candy', 'Candy'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={'theme-choice ' + (theme === id ? 'picked' : '')}
                  onClick={() => setTheme(id)}
                >
                  <i className={'theme-swatch ' + id} />
                  {label}
                  {theme === id && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => {
                  setPersonality('Friendly, clever, encouraging and clear');
                  setTheme('aurora');
                }}
              >
                Reset
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  localStorage.setItem('lokizon_personality', personality);
                  localStorage.setItem('lokizon_instructions', alwaysInstructions);
                  localStorage.setItem('lokizon_call_name', callName);
                  localStorage.setItem('lokizon_theme', theme);
                  localStorage.setItem('lokibot_length', responseLength);
                  localStorage.setItem('lokibot_reply_language', replyLanguage);
                  localStorage.setItem('lokibot_thinking', thinkingLevel);
                  localStorage.setItem('lokibot_model', modelChoice);
                  setShowSettings(false);
                  notify('Settings applied ✨');
                }}
              >
                Save preferences <Check size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
      {showProfile && (
        <div className="modal-backdrop" onClick={() => setShowProfile(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Your little corner</h2>
                <p>Make this space feel like yours.</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setShowProfile(false)}
              >
                <X size={19} />
              </button>
            </div>
            <label className="field-label">DISPLAY NAME</label>
            <input
              className="profile-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={30}
            />
            <div className="modal-actions">
              <button
                className="primary-btn"
                onClick={() => {
                  localStorage.setItem('lokizon_name', displayName);
                  setShowProfile(false);
                  notify('Profile saved');
                }}
              >
                Save profile
              </button>
            </div>
          </div>
        </div>
      )}
      {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="modal auth-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="modal-icon"><ShieldCheck size={19}/></div><h2>{authMode==='signup'?'Create your LokiBot account':'Welcome back'}</h2><p>{authMode==='signup'?'Create an account to unlock 25,000 tokens per cycle.':'Sign in to this device account.'}</p></div><button className="icon-btn" onClick={() => setAuthOpen(false)}><X size={19}/></button></div><label>Email</label><input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters"/><p className="auth-warning">This initial account mode stores data on this device only; it does not yet sync between devices or reinstalls.</p><div className="confirm-delete-actions"><button onClick={()=>setAuthMode(authMode==='signup'?'login':'signup')}>{authMode==='signup'?'I already have an account':'Create account'}</button><button className="primary-btn" onClick={()=>{if(!authEmail.includes('@')||authPassword.length<8){notify('Enter a valid email and password of at least 8 characters');return;}const email=authEmail.trim().toLowerCase();if(authMode==='login'){try{const saved=JSON.parse(localStorage.getItem('lokibot_account')||'null');if(!saved||saved.email!==email||saved.password!==authPassword){notify('No matching local account was found');return;}}catch{notify('No account found on this device');return;}}const a={email,name:email.split('@')[0],password:authPassword};localStorage.setItem('lokibot_account',JSON.stringify(a));setAccount({email:a.email,name:a.name});setAuthOpen(false);setAuthPassword('');notify('Signed in on this device');}}>Continue</button></div></div></div>}
      {confirmDelete && <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="modal-icon" style={{background:'#fee2e2',color:'#dc2626'}}><Trash2 size={19} /></div><h2>Delete this chat forever?</h2><p>This conversation and its messages will be permanently removed from this device. This cannot be undone.</p></div><button className="icon-btn" onClick={() => setConfirmDelete(null)}><X size={19} /></button></div><div className="confirm-delete-actions"><button onClick={() => setConfirmDelete(null)}>Cancel</button><button className="danger" onClick={() => removeChat(confirmDelete)}>Yes, delete forever</button></div></div></div>}
      {imageFullScreen && <div className="image-fullscreen" onClick={() => setImageFullScreen(null)}><button style={{position:'absolute',top:14,right:14}} onClick={() => setImageFullScreen(null)}><X size={20} /> Close</button><img src={imageFullScreen} alt="Full-screen generated image" onClick={e => e.stopPropagation()} /><div className="image-fullscreen-actions" onClick={e => e.stopPropagation()}><button onClick={() => { const a=document.createElement('a'); a.href=imageFullScreen; a.download='lokibot-image.png'; a.click(); }}><Download size={15} /> Download</button><button onClick={async () => { try { const blob=await (await fetch(imageFullScreen)).blob(); const file=new File([blob],'lokibot-image.png',{type:blob.type}); if(navigator.share && navigator.canShare?.({files:[file]})) await navigator.share({files:[file],title:'LokiBot image'}); else notify('Sharing is not supported on this device'); } catch { notify('Could not share image'); } }}><Share2 size={15} /> Share</button><button onClick={async () => { try { const blob=await (await fetch(imageFullScreen)).blob(); await navigator.clipboard.write([new ClipboardItem({[blob.type]:blob})]); notify('Image copied'); } catch { notify('Copy image is not supported here'); } }}><Copy size={15} /> Copy</button><button onClick={() => { setImagePrompt('Edit this image: '); setImageStudioOpen(true); setImageFullScreen(null); }}><WandSparkles size={15} /> Edit</button></div></div>}
      {(showTools || showAllTools) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowTools(false);
            setShowAllTools(false);
          }}
        >
          <div
            className={
              'modal tools-modal ' + (showAllTools ? 'wide-modal' : '')
            }
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <div className="modal-icon rainbow">
                  <WandSparkles size={20} />
                </div>
                <h2>
                  {showAllTools ? 'Your magic toolkit' : 'What shall we make?'}
                </h2>
                <p>40 practical superpowers, ready when you are.</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => {
                  setShowTools(false);
                  setShowAllTools(false);
                }}
              >
                <X size={19} />
              </button>
            </div>
            <div className="tool-search">
              <Search size={17} />
              <input
                placeholder="Find a tool…"
                value={toolSearch}
                onChange={e => setToolSearch(e.target.value)}
              />
            </div>
            <div className="tool-grid">
              {visibleTools.map((t, i) => (
                <button
                  className="tool-card"
                  key={t[1]}
                  onClick={() => {
                    if (t[1] === 'AI image creator') { setImageStudioOpen(true); setShowTools(false); setShowAllTools(false); setMobileNav(false); return; }
                    chooseTool(toolPrompt(t[1]));
                    if (['Flashcards','Quiz maker','Study mode','Summarize text'].includes(t[1])) setMode('learn');
                  }}
                >
                  <span className="tool-emoji">{t[0]}</span>
                  <span>
                    <b>{t[1]}</b>
                    <small>{t[2]}</small>
                  </span>
                  <span className="tool-arrow">↗</span>
                </button>
              ))}
            </div>
            {visibleTools.length === 0 && (
              <p className="empty-history">
                No tools match that search. Try another word.
              </p>
            )}
          </div>
        </div>
      )}
      {showTools && !showAllTools && (
        <div className="tools-popover">
          <div className="popover-title">
            Quick magic{' '}
            <button onClick={() => setShowTools(false)}>
              <X size={14} />
            </button>
          </div>
          {tools.slice(0, 8).map(t => (
            <button
              key={t[1]}
              onClick={() => {
                chooseTool(toolPrompt(t[1]));
                if (t[1] === 'Flashcards' || t[1] === 'Quiz maker')
                  setMode('learn');
              }}
            >
              <span>{t[0]}</span>
              {t[1]}
              <span className="tool-arrow">↗</span>
            </button>
          ))}
          <button
            className="browse-all"            onClick={() => {
              setShowTools(false);
              setShowAllTools(true);
            }}
          >
            Explore all 30 tools →
          </button>
        </div>
      )}
      {toast && (
        <div className="toast">
          <Sparkles size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
export default App;
