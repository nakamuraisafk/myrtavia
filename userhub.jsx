/* global React */
// userhub.jsx — Auth (mock Google) + Notes (post-it system)

const USER_COLORS = [
  { name: 'Crimson',  hex: '#e85a4f' },
  { name: 'Sage',     hex: '#6fa86c' },
  { name: 'Teal',     hex: '#4fa39a' },
  { name: 'Lavender', hex: '#9879c4' },
  { name: 'Sky',      hex: '#5aa3d4' },
  { name: 'Rose',     hex: '#d96e9e' },
  { name: 'Ochre',    hex: '#d4923a' },
  { name: 'Slate',    hex: '#7e8aa0' },
];
window.USER_COLORS = USER_COLORS;

// ─── Shared store ──────────────────────────────────────────────────────
const safeParse = (s, fallback) => {
  try { return JSON.parse(s) ?? fallback; } catch { return fallback; }
};

const Store = {
  _user:  safeParse(localStorage.getItem('myrtavia.user'),  null),
  _users: safeParse(localStorage.getItem('myrtavia.users'), []),
  _notes: safeParse(localStorage.getItem('myrtavia.notes'), []),
  _markers: safeParse(localStorage.getItem('myrtavia.markers'), []),
  _listeners: new Set(),

  subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); },
  _emit() { this._listeners.forEach(fn => fn()); },

  getUser()  { return this._user; },
  getUsers() { return this._users; },

  setUser(u) {
    this._user = u;
    if (u) {
      localStorage.setItem('myrtavia.user', JSON.stringify(u));
      const rest = this._users.filter(x => x.id !== u.id);
      this._users = [u, ...rest].slice(0, 6);
      localStorage.setItem('myrtavia.users', JSON.stringify(this._users));
    } else {
      localStorage.removeItem('myrtavia.user');
    }
    this._emit();
  },

  getNotes(regionId, poiId) {
    let n = this._notes;
    if (regionId) n = n.filter(x => x.regionId === regionId);
    if (poiId)    n = n.filter(x => x.poiId    === poiId);
    return n.slice().sort((a, b) => b.ts - a.ts);
  },

  addNote(note) {
    const full = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      ...note,
    };
    this._notes = [...this._notes, full];
    localStorage.setItem('myrtavia.notes', JSON.stringify(this._notes));
    this._emit();
  },

  removeNote(id) {
    this._notes = this._notes.filter(n => n.id !== id);
    localStorage.setItem('myrtavia.notes', JSON.stringify(this._notes));
    this._emit();
  },

  getMarkers(scope) {
    let m = this._markers;
    if (scope) m = m.filter(x => x.scope === scope);
    return m.slice().sort((a, b) => a.ts - b.ts);
  },

  addMarker(marker) {
    const full = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      ...marker,
    };
    this._markers = [...this._markers, full];
    localStorage.setItem('myrtavia.markers', JSON.stringify(this._markers));
    this._emit();
    return full;
  },

  removeMarker(id) {
    this._markers = this._markers.filter(m => m.id !== id);
    localStorage.setItem('myrtavia.markers', JSON.stringify(this._markers));
    this._emit();
  },
};
window.MyrtaviaStore = Store;

function useStore() {
  const [, force] = React.useState(0);
  React.useEffect(() => Store.subscribe(() => force(x => x + 1)), []);
  return Store;
}
window.useMyrtaviaStore = useStore;

// ─── Helpers ────────────────────────────────────────────────────────────
function formatRel(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)       return 'just now';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000)  return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}
window.formatRel = formatRel;

function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.61z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" fill="#FBBC05"/>
      <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.997 8.997 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ─── AuthBadge ─────────────────────────────────────────────────────────
function AuthBadge({ onOpenSignIn }) {
  const store = useStore();
  const user = store.getUser();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!e.target.closest('.auth-badge-wrap')) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) {
    return (
      <button className="auth-btn-signin" onClick={onOpenSignIn}>
        <GoogleG />
        <span>Sign in with Google</span>
      </button>
    );
  }

  const initial = user.name.charAt(0).toUpperCase();
  return (
    <div className="auth-badge-wrap">
      <button className="auth-badge" onClick={() => setOpen(o => !o)}>
        <span className="auth-avatar" style={{ background: user.color }}>{initial}</span>
        <span className="auth-name">{user.name}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className="auth-caret">
          <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="auth-menu">
          <div className="auth-menu-head">
            <span className="auth-avatar lg" style={{ background: user.color }}>{initial}</span>
            <div className="auth-menu-info">
              <div className="auth-menu-name">{user.name}</div>
              <div className="auth-menu-email">{user.email || '— no email —'}</div>
            </div>
          </div>
          <div className="auth-menu-stats">
            <span>{Store.getNotes().filter(n => n.userId === user.id).length} notes</span>
            <span className="dot">·</span>
            <span style={{ color: user.color }}>your color</span>
          </div>
          <button className="auth-menu-item" onClick={() => { Store.setUser(null); setOpen(false); }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
window.AuthBadge = AuthBadge;

// ─── SignInModal ───────────────────────────────────────────────────────
function SignInModal({ onClose }) {
  const store = useStore();
  const knownUsers = store.getUsers();
  const [step, setStep] = React.useState(knownUsers.length > 0 ? 'choose' : 'new');
  const [name, setName]   = React.useState('');
  const [email, setEmail] = React.useState('');
  const [color, setColor] = React.useState(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)].hex);

  const submit = () => {
    if (!name.trim()) return;
    Store.setUser({
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      email: email.trim(),
      color,
    });
    onClose();
  };

  const useExisting = (u) => { Store.setUser(u); onClose(); };

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="signin-overlay" onClick={onClose}>
      <div className="signin-card" onClick={e => e.stopPropagation()}>
        <button className="signin-close" onClick={onClose} aria-label="Close">×</button>

        <div className="signin-head">
          <div className="signin-logo"><GoogleG size={32} /></div>
          <div className="signin-title">Sign in to Myrtavia</div>
          <div className="signin-subtitle">
            {step === 'choose' ? 'Choose an account' : 'to save your campaign notes'}
          </div>
        </div>

        {step === 'choose' && (
          <div className="signin-accounts">
            {knownUsers.map(u => (
              <button key={u.id} className="signin-account" onClick={() => useExisting(u)}>
                <span className="signin-account-avatar" style={{ background: u.color }}>
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <div className="signin-account-info">
                  <div className="signin-account-name">{u.name}</div>
                  <div className="signin-account-email">{u.email || '— no email —'}</div>
                </div>
              </button>
            ))}
            <button className="signin-account use-another" onClick={() => setStep('new')}>
              <span className="signin-account-avatar plus">+</span>
              <div className="signin-account-info">
                <div className="signin-account-name">Use another account</div>
              </div>
            </button>
          </div>
        )}

        {step === 'new' && (
          <div className="signin-form">
            <label>
              <span className="signin-label-text">Name</span>
              <input
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Display name"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </label>
            <label>
              <span className="signin-label-text">Email <em>(optional)</em></span>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <div className="signin-color-group">
              <span className="signin-label-text">Your note color</span>
              <div className="signin-colors">
                {USER_COLORS.map(c => (
                  <button
                    key={c.hex} type="button"
                    className={`color-swatch ${color === c.hex ? 'selected' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => setColor(c.hex)}
                    aria-label={c.name}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <button className="signin-submit" onClick={submit} disabled={!name.trim()}>
              Continue
            </button>
            {knownUsers.length > 0 && (
              <button className="signin-back" onClick={() => setStep('choose')}>
                ← Back to accounts
              </button>
            )}
          </div>
        )}

        <div className="signin-footer">
          <span>Prototype · Notes are stored locally in this browser</span>
        </div>
      </div>
    </div>
  );
}
window.SignInModal = SignInModal;

// ─── NotePostits — visual indicator on a hotspot ───────────────────────
function NotePostits({ regionId, poiId }) {
  const store = useStore();
  const notes = store.getNotes(regionId, poiId);
  if (notes.length === 0) return null;
  const colors = [...new Set(notes.map(n => n.userColor))].slice(0, 3);
  return (
    <span className="note-postits" aria-label={`${notes.length} note${notes.length>1?'s':''}`}>
      {colors.map((c, i) => (
        <span
          key={c + i}
          className="note-postit-pip"
          style={{ '--c': c, '--i': i, background: c }}
        />
      ))}
      {notes.length > 1 && <span className="note-postit-count">{notes.length}</span>}
    </span>
  );
}
window.NotePostits = NotePostits;

// ─── HotspotNotes — full notes UI inside a hotspot card ────────────────
function HotspotNotes({ regionId, poiId, onSignIn, compact }) {
  const store = useStore();
  const user = store.getUser();
  const notes = store.getNotes(regionId, poiId);
  const [text, setText] = React.useState('');
  const [adding, setAdding] = React.useState(false);

  const submit = () => {
    if (!text.trim() || !user) return;
    Store.addNote({
      regionId, poiId,
      userId: user.id,
      userName: user.name,
      userColor: user.color,
      text: text.trim(),
    });
    setText('');
    setAdding(false);
  };

  return (
    <div className={`hotspot-notes ${compact ? 'compact' : ''}`}>
      <div className="hotspot-notes-header">
        <span className="hotspot-notes-title">Campaign Notes</span>
        {notes.length > 0 && <span className="hotspot-notes-count">{notes.length}</span>}
      </div>

      {notes.length > 0 && (
        <ul className="hotspot-notes-list">
          {notes.map(n => (
            <li key={n.id} className="note-card" style={{ '--note-c': n.userColor, borderLeftColor: n.userColor }}>
              <div className="note-card-head">
                <span className="note-card-author">
                  <span className="note-card-dot" style={{ background: n.userColor }}>
                    {n.userName.charAt(0).toUpperCase()}
                  </span>
                  {n.userName}
                </span>
                <span className="note-card-time">{formatRel(n.ts)}</span>
                {user && user.id === n.userId && (
                  <button
                    className="note-card-delete"
                    onClick={() => Store.removeNote(n.id)}
                    title="Delete note"
                    aria-label="Delete note"
                  >×</button>
                )}
              </div>
              <div className="note-card-text">{n.text}</div>
            </li>
          ))}
        </ul>
      )}

      {!user ? (
        <button className="note-signin-prompt" onClick={onSignIn}>
          <GoogleG size={14} />
          <span>Sign in to pin notes here</span>
        </button>
      ) : adding ? (
        <div className="note-add-form" style={{ '--user-c': user.color }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="A campaign note, lore hook, NPC name…"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              if (e.key === 'Escape') { setAdding(false); setText(''); }
            }}
          />
          <div className="note-add-actions">
            <button className="note-add-cancel" onClick={() => { setAdding(false); setText(''); }}>
              Cancel
            </button>
            <button
              className="note-add-save"
              style={{ background: user.color }}
              onClick={submit}
              disabled={!text.trim()}
            >
              Pin note
            </button>
          </div>
        </div>
      ) : (
        <button
          className="note-add-trigger"
          style={{ '--user-c': user.color, borderColor: user.color, color: user.color }}
          onClick={() => setAdding(true)}
        >
          <span>+</span> Add note
        </button>
      )}
    </div>
  );
}
window.HotspotNotes = HotspotNotes;
