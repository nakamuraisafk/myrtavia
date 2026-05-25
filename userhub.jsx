/* global React */
// userhub.jsx — Email/password auth modal + AuthBadge (now Supabase-backed)
// The Store + data API live in supabase-client.jsx.

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

// ─── AuthBadge ─────────────────────────────────────────────────────────
function AuthBadge({ onOpenSignIn, onOpenCampaigns }) {
  const store = window.useMyrtaviaStore();
  const user = store.getUser();
  const active = store.getActiveCampaign();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!e.target.closest('.auth-badge-wrap')) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  if (!store.isReady()) {
    return <div className="auth-loading">Connecting…</div>;
  }

  if (!user) {
    return (
      <button className="auth-btn-signin" onClick={onOpenSignIn}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 8 a3 3 0 1 0 0 -6 a3 3 0 0 0 0 6 z"/>
          <path d="M2 13 c0 -3 2 -4 5 -4 s5 1 5 4"/>
        </svg>
        <span>Sign in</span>
      </button>
    );
  }

  const initial = user.name.charAt(0).toUpperCase();
  return (
    <div className="auth-badge-wrap">
      <button className="auth-badge" onClick={() => setOpen(o => !o)}>
        <span className="auth-avatar" style={{ background: user.color }}>{initial}</span>
        <span className="auth-name-stack">
          <span className="auth-name">{user.name}</span>
          {active && <span className="auth-campaign">{active.name}</span>}
        </span>
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
              <div className="auth-menu-email">{user.email}</div>
            </div>
          </div>
          {active ? (
            <div className="auth-menu-campaign">
              <div className="amc-label">Active campaign</div>
              <div className="amc-name">{active.name}</div>
              <div className="amc-code">code: <code>{active.invite_code}</code></div>
            </div>
          ) : (
            <div className="auth-menu-campaign empty">
              <em>No active campaign</em>
            </div>
          )}
          <button className="auth-menu-item" onClick={() => { setOpen(false); onOpenCampaigns(); }}>
            Manage campaigns…
          </button>
          <button className="auth-menu-item" onClick={async () => {
            setOpen(false);
            await window.MyrtaviaStore.signOut();
          }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
window.AuthBadge = AuthBadge;

// ─── SignInModal — Email/password ──────────────────────────────────────
function SignInModal({ onClose }) {
  const [mode, setMode] = React.useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(
    USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)].hex
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const doSignIn = async () => {
    if (!email || !password) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await window.MyrtaviaStore.signIn({ email: email.trim(), password });
      onClose();
    } catch (e) {
      setError(e.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const doSignUp = async () => {
    if (!email || !password || !name.trim()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const res = await window.MyrtaviaStore.signUp({
        email: email.trim(), password, name: name.trim(), color,
      });
      // If email confirmation is required, res.session is null.
      if (!res.session) {
        setSuccess('Check your email to confirm your address, then sign in.');
        setMode('signin');
      } else {
        onClose();
      }
    } catch (e) {
      setError(e.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = mode === 'signin'
    ? !!email && !!password
    : !!email && password.length >= 6 && !!name.trim();

  return (
    <div className="signin-overlay" onClick={onClose}>
      <div className="signin-card" onClick={e => e.stopPropagation()}>
        <button className="signin-close" onClick={onClose} aria-label="Close">×</button>

        <div className="signin-head">
          <div className="signin-brand">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#c9a961" strokeWidth="1.4"/>
              <path d="M8 16 Q16 7 24 16 Q16 25 8 16 Z" stroke="#c9a961" strokeWidth="1.4" fill="none"/>
              <circle cx="16" cy="16" r="3" fill="#c9a961"/>
            </svg>
          </div>
          <div className="signin-title-myrt">
            {mode === 'signin' ? 'Welcome back, traveler' : 'Begin your chronicle'}
          </div>
          <div className="signin-subtitle-myrt">
            {mode === 'signin'
              ? 'Sign in to access your campaigns and notes'
              : 'Create an account to save your notes across devices'}
          </div>
        </div>

        <div className="signin-form myrtavia">
          {mode === 'signup' && (
            <label>
              <span className="signin-label-text-m">Display name</span>
              <input
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="The name fellow players see"
                autoFocus
              />
            </label>
          )}
          <label>
            <span className="signin-label-text-m">Email</span>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={mode === 'signin'}
            />
          </label>
          <label>
            <span className="signin-label-text-m">
              Password {mode === 'signup' && <em>(min 6 characters)</em>}
            </span>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={mode === 'signup' ? 6 : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit && !busy) {
                  mode === 'signin' ? doSignIn() : doSignUp();
                }
              }}
            />
          </label>
          {mode === 'signup' && (
            <div className="signin-color-group">
              <span className="signin-label-text-m">Your note &amp; marker color</span>
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
          )}

          {error && <div className="signin-error myrt">{error}</div>}
          {success && <div className="signin-success">{success}</div>}

          <button
            className="signin-submit myrt"
            onClick={mode === 'signin' ? doSignIn : doSignUp}
            disabled={!canSubmit || busy}
          >
            {busy ? '…' : (mode === 'signin' ? 'Enter Myrtavia' : 'Create account')}
          </button>

          <button
            className="signin-mode-switch"
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
          >
            {mode === 'signin'
              ? "New to Myrtavia? Create an account →"
              : '← Already have an account? Sign in'}
          </button>
        </div>

        <div className="signin-footer">
          <span>Notes and markers sync across all your devices.</span>
        </div>
      </div>
    </div>
  );
}
window.SignInModal = SignInModal;

// ─── NotePostits & HotspotNotes (visual indicator and notes UI) ────────
function NotePostits({ regionId, poiId }) {
  const store = window.useMyrtaviaStore();
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

function HotspotNotes({ regionId, poiId, onSignIn }) {
  const store = window.useMyrtaviaStore();
  const user = store.getUser();
  const campaign = store.getActiveCampaign();
  const notes = store.getNotes(regionId, poiId);
  const [text, setText] = React.useState('');
  const [adding, setAdding] = React.useState(false);

  const submit = async () => {
    if (!text.trim() || !user || !campaign) return;
    await window.MyrtaviaStore.addNote({
      regionId, poiId, text: text.trim(),
    });
    setText('');
    setAdding(false);
  };

  return (
    <div className="hotspot-notes">
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
                <span className="note-card-time">{window.formatRel(n.ts)}</span>
                {user && user.id === n.userId && (
                  <button
                    className="note-card-delete"
                    onClick={() => window.MyrtaviaStore.removeNote(n.id)}
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
          Sign in to pin notes here
        </button>
      ) : !campaign ? (
        <div className="note-no-campaign">Join or create a campaign to add notes</div>
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
