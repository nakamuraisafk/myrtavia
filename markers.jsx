/* global React */
// markers.jsx — User-placed markers with thematic icons + note popup

const { useState: useStateM, useEffect: useEffectM } = React;

// ─── Themed icon set ───────────────────────────────────────────────────
const MARKER_ICONS = {
  sword: {
    label: 'Combat',
    paths: (
      <g>
        <path d="M8 1.8 L8.7 9.5 L7.3 9.5 Z" fill="currentColor"/>
        <rect x="4.8" y="9" width="6.4" height="1.4" fill="currentColor"/>
        <rect x="7.4" y="10" width="1.2" height="3.6" fill="currentColor"/>
        <circle cx="8" cy="14.2" r="1" fill="currentColor"/>
      </g>
    ),
  },
  skull: {
    label: 'Danger',
    paths: (
      <g>
        <path d="M3.7 7 Q3.7 3.2 8 3.2 Q12.3 3.2 12.3 7 L12.3 9.5 Q12.3 11 11 11 L11 12.6 L5 12.6 L5 11 Q3.7 11 3.7 9.5 Z" fill="currentColor"/>
        <circle cx="6.2" cy="7.6" r="1" fill="#1a1208"/>
        <circle cx="9.8" cy="7.6" r="1" fill="#1a1208"/>
        <path d="M7.4 10.4 L8.6 10.4 L8 11.6 Z" fill="#1a1208"/>
      </g>
    ),
  },
  tavern: {
    label: 'Tavern',
    paths: (
      <g>
        <path d="M4 4 L4 5.5 L4 12.5 Q4 13.6 5.1 13.6 L9.9 13.6 Q11 13.6 11 12.5 L11 4 Z" fill="currentColor"/>
        <path d="M11 6.5 L12.6 6.5 Q13.4 6.5 13.4 7.4 L13.4 10.6 Q13.4 11.4 12.6 11.4 L11 11.4" stroke="currentColor" strokeWidth="1.3" fill="none"/>
        <path d="M4.4 7.4 L10.6 7.4" stroke="#1a1208" strokeWidth="0.8" opacity="0.6"/>
        <path d="M5.3 3.5 Q5.3 2.5 6.2 2.5 M7.2 3.5 Q7.2 2.5 8 2.5 M9 3.5 Q9 2.5 9.7 2.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
      </g>
    ),
  },
  chest: {
    label: 'Treasure',
    paths: (
      <g>
        <rect x="2.5" y="7.6" width="11" height="5.4" fill="currentColor"/>
        <path d="M2.5 7.8 Q2.5 4.2 8 4.2 Q13.5 4.2 13.5 7.8 L13.5 8 L2.5 8 Z" fill="currentColor"/>
        <rect x="7" y="8.4" width="2" height="2.8" fill="#1a1208"/>
        <circle cx="8" cy="8.6" r="0.5" fill="currentColor"/>
        <line x1="2.5" y1="9.5" x2="13.5" y2="9.5" stroke="#1a1208" strokeWidth="0.5" opacity="0.5"/>
      </g>
    ),
  },
  quest: {
    label: 'Quest',
    paths: (
      <g>
        <circle cx="8" cy="8" r="6" fill="currentColor"/>
        <path d="M5.8 6.3 Q5.8 4.5 8 4.5 Q10.2 4.5 10.2 6.3 Q10.2 7.6 8 8.5 L8 9.8" stroke="#1a1208" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <circle cx="8" cy="11.5" r="0.85" fill="#1a1208"/>
      </g>
    ),
  },
  star: {
    label: 'Important',
    paths: (
      <g>
        <path d="M8 1.6 L9.7 6.4 L14.8 6.4 L10.6 9.5 L12.3 14.4 L8 11.3 L3.7 14.4 L5.4 9.5 L1.2 6.4 L6.3 6.4 Z" fill="currentColor"/>
      </g>
    ),
  },
  camp: {
    label: 'Camp',
    paths: (
      <g>
        <path d="M8 2.5 L1.8 13.6 L14.2 13.6 Z" fill="currentColor"/>
        <path d="M8 2.5 L8 13.6" stroke="#1a1208" strokeWidth="1.1"/>
        <path d="M6 13.6 L8 10.2 L10 13.6 Z" fill="#1a1208"/>
      </g>
    ),
  },
  eye: {
    label: 'Secret',
    paths: (
      <g>
        <path d="M1.5 8 Q8 2.5 14.5 8 Q8 13.5 1.5 8 Z" fill="currentColor"/>
        <circle cx="8" cy="8" r="2.5" fill="#1a1208"/>
        <circle cx="8.5" cy="7.3" r="0.7" fill="#f8f3e0"/>
      </g>
    ),
  },
};
window.MARKER_ICONS = MARKER_ICONS;

function MarkerIcon({ icon, size = 16 }) {
  const def = MARKER_ICONS[icon];
  if (!def) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {def.paths}
    </svg>
  );
}
window.MarkerIcon = MarkerIcon;

// ─── AddMarkerControl ──────────────────────────────────────────────────
function AddMarkerControl({ scope, placingActive, onStartPlacement, onCancelPlacement, onRequestSignIn, variant }) {
  const store = window.useMyrtaviaStore();
  const user = store.getUser();
  const [open, setOpen] = useStateM(false);

  useEffectM(() => {
    if (!open) return;
    const c = (e) => {
      if (!e.target.closest('.add-marker-control')) setOpen(false);
    };
    window.addEventListener('mousedown', c);
    return () => window.removeEventListener('mousedown', c);
  }, [open]);

  useEffectM(() => { if (placingActive) setOpen(false); }, [placingActive]);

  const handleClick = () => {
    if (!user) { onRequestSignIn && onRequestSignIn(); return; }
    if (placingActive) { onCancelPlacement && onCancelPlacement(); return; }
    setOpen(o => !o);
  };

  const pick = (icon) => {
    setOpen(false);
    onStartPlacement(icon, scope);
  };

  return (
    <div className={`add-marker-control ${variant || ''}`}>
      <button
        className={`add-marker-btn ${open ? 'open' : ''} ${placingActive ? 'placing' : ''}`}
        onClick={handleClick}
        title={!user ? 'Sign in to add markers' : placingActive ? 'Cancel placement' : 'Add a custom marker'}
      >
        {placingActive ? (
          <svg width="13" height="13" viewBox="0 0 14 14">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 14 14">
            <path d="M7 1 L7 13 M1 7 L13 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        )}
        <span>{placingActive ? 'Cancel' : 'Add Marker'}</span>
      </button>

      {open && (
        <div className="marker-picker">
          <div className="marker-picker-title">Marker type</div>
          <div className="marker-picker-grid">
            {Object.entries(MARKER_ICONS).map(([id, def]) => (
              <button key={id} className="marker-picker-item" onClick={() => pick(id)} title={def.label}>
                <span className="marker-picker-icon" style={{ color: user?.color || 'var(--gold)' }}>
                  <MarkerIcon icon={id} size={22} />
                </span>
                <span className="marker-picker-label">{def.label}</span>
              </button>
            ))}
          </div>
          <div className="marker-picker-foot">
            Click any icon, then click the map to place it.
          </div>
        </div>
      )}
    </div>
  );
}
window.AddMarkerControl = AddMarkerControl;

// ─── UserMarker ────────────────────────────────────────────────────────
function UserMarker({ marker, currentUserId, onDelete }) {
  const [hover, setHover] = useStateM(false);
  const [pinned, setPinned] = useStateM(false);
  const show = hover || pinned;
  const above = marker.y > 60;

  return (
    <div
      className={`user-marker ${pinned ? 'pinned' : ''}`}
      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        className="user-marker-dot"
        style={{ background: marker.userColor, color: '#1a1208' }}
        onClick={(e) => { e.stopPropagation(); setPinned(p => !p); }}
        aria-label={`${MARKER_ICONS[marker.icon]?.label || 'Marker'} by ${marker.userName}`}
      >
        <MarkerIcon icon={marker.icon} size={13} />
      </button>
      {show && (
        <div
          className="user-marker-card"
          style={{
            transform: above
              ? 'translate(-50%, calc(-100% - 28px))'
              : 'translate(-50%, 22px)',
          }}
        >
          <div className="umc-head">
            <span className="umc-author">
              <span className="umc-avatar" style={{ background: marker.userColor }}>
                {marker.userName.charAt(0).toUpperCase()}
              </span>
              {marker.userName}
            </span>
            <span className="umc-time">{window.formatRel(marker.ts)}</span>
          </div>
          <div className="umc-icon-row">
            <span className="umc-icon" style={{ color: marker.userColor }}>
              <MarkerIcon icon={marker.icon} size={13} />
            </span>
            <span className="umc-label">{MARKER_ICONS[marker.icon]?.label || 'Marker'}</span>
          </div>
          <div className="umc-text">{marker.text}</div>
          {currentUserId === marker.userId && (
            <button className="umc-delete" onClick={() => onDelete(marker.id)}>
              Delete marker
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MarkerNoteModal — anchored to placed marker, prompts for note ─────
function MarkerNoteModal({ pending, user, onSave, onCancel }) {
  const [text, setText] = useStateM('');

  useEffectM(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) onSave(text.trim());
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [text, onSave, onCancel]);

  const above = pending.y > 55;
  const def = MARKER_ICONS[pending.icon];

  return (
    <div
      className={`marker-note-modal ${above ? 'above' : 'below'}`}
      style={{
        left: `${pending.x}%`,
        top: `${pending.y}%`,
        transform: above
          ? 'translate(-50%, calc(-100% - 32px))'
          : 'translate(-50%, 32px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="mnm-arrow"/>
      <div className="mnm-head">
        <span className="mnm-icon" style={{ background: user?.color }}>
          <MarkerIcon icon={pending.icon} size={13} />
        </span>
        <div>
          <div className="mnm-type">{def?.label}</div>
          <div className="mnm-title">New marker</div>
        </div>
        <button className="mnm-close" onClick={onCancel} aria-label="Cancel">×</button>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Describe what's here…"
        rows={3}
      />
      <div className="mnm-actions">
        <button className="mnm-cancel" onClick={onCancel}>Cancel</button>
        <button
          className="mnm-save"
          style={{ background: user?.color, color: '#1a1208' }}
          onClick={() => onSave(text.trim())}
          disabled={!text.trim()}
        >
          Pin marker
        </button>
      </div>
      <div className="mnm-tip">Esc to cancel · ⌘/Ctrl + Enter to save</div>
    </div>
  );
}

// ─── MarkerLayer — renders markers + placement click overlay + modal ───
function MarkerLayer({ scope, placingMarker, pendingMarker, onPlace, onSaveNote, onCancelNote }) {
  const store = window.useMyrtaviaStore();
  const user = store.getUser();
  const markers = store.getMarkers(scope);
  const isPlacing = placingMarker && placingMarker.scope === scope;
  const hasPending = pendingMarker && pendingMarker.scope === scope;

  const handleClick = (e) => {
    if (!isPlacing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPlace(x, y);
  };

  return (
    <>
      <div className="markers-layer">
        {markers.map(m => (
          <UserMarker
            key={m.id}
            marker={m}
            currentUserId={user?.id}
            onDelete={(id) => window.MyrtaviaStore.removeMarker(id)}
          />
        ))}
      </div>

      {isPlacing && (
        <div className="placement-overlay" onClick={handleClick}>
          {/* Subtle pulsing crosshair effect handled in CSS via cursor */}
        </div>
      )}

      {hasPending && (
        <MarkerNoteModal
          pending={pendingMarker}
          user={user}
          onSave={onSaveNote}
          onCancel={onCancelNote}
        />
      )}
    </>
  );
}
window.MarkerLayer = MarkerLayer;

// ─── PlacementBanner — top-of-screen prompt during placement ───────────
function PlacementBanner({ placingMarker, onCancel }) {
  if (!placingMarker) return null;
  const def = MARKER_ICONS[placingMarker.icon];
  const store = window.useMyrtaviaStore();
  const user = store.getUser();

  return (
    <div className="placement-banner">
      <span className="pb-icon" style={{ color: user?.color || 'var(--gold)' }}>
        <MarkerIcon icon={placingMarker.icon} size={16} />
      </span>
      <span className="pb-text">
        Click the map to place <strong>{def?.label}</strong> marker
      </span>
      <button className="pb-cancel" onClick={onCancel}>
        Cancel <kbd>Esc</kbd>
      </button>
    </div>
  );
}
window.PlacementBanner = PlacementBanner;
