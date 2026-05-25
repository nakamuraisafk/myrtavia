/* global React */
// campaigns.jsx — Campaign chooser / creator / joiner modal

function CampaignsModal({ onClose, initialMode }) {
  const store = window.useMyrtaviaStore();
  const user = store.getUser();
  const campaigns = store.getCampaigns();
  const activeId = store.getActiveCampaignId();
  const [mode, setMode] = React.useState(initialMode || (campaigns.length === 0 ? 'create' : 'list'));
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [copied, setCopied] = React.useState(null);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const doCreate = async () => {
    if (!name.trim()) return;
    setBusy(true); setError('');
    try {
      await window.MyrtaviaStore.createCampaign({ name: name.trim() });
      onClose();
    } catch (e) {
      setError(e.message || 'Could not create campaign.');
    } finally {
      setBusy(false);
    }
  };

  const doJoin = async () => {
    if (!code.trim()) return;
    setBusy(true); setError('');
    try {
      await window.MyrtaviaStore.joinCampaign(code.trim());
      onClose();
    } catch (e) {
      setError(e.message || 'Could not join. Check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1400);
  };

  const switchTo = async (id) => {
    await window.MyrtaviaStore.setActiveCampaign(id);
    onClose();
  };

  const leave = async (id) => {
    if (!window.confirm('Leave this campaign? Your notes will remain visible to other members.')) return;
    await window.MyrtaviaStore.leaveCampaign(id);
  };

  if (!user) {
    onClose();
    return null;
  }

  return (
    <div className="signin-overlay" onClick={onClose}>
      <div className="campaign-modal" onClick={e => e.stopPropagation()}>
        <button className="signin-close" onClick={onClose} aria-label="Close">×</button>

        <div className="campaign-head">
          <div className="campaign-title">Your Campaigns</div>
          <div className="campaign-subtitle">
            Each campaign is a shared atlas — your party sees the same notes and markers.
          </div>
        </div>

        <div className="campaign-tabs">
          <button className={mode === 'list'   ? 'on' : ''} onClick={() => { setMode('list'); setError(''); }}>
            My campaigns {campaigns.length > 0 && <span className="tab-badge">{campaigns.length}</span>}
          </button>
          <button className={mode === 'create' ? 'on' : ''} onClick={() => { setMode('create'); setError(''); }}>
            Create new
          </button>
          <button className={mode === 'join'   ? 'on' : ''} onClick={() => { setMode('join'); setError(''); }}>
            Join with code
          </button>
        </div>

        {mode === 'list' && (
          campaigns.length === 0 ? (
            <div className="campaign-empty">
              <div className="campaign-empty-icon">⚔</div>
              <div className="campaign-empty-title">No campaigns yet</div>
              <div className="campaign-empty-text">
                Create your first campaign as DM, or join one with an invite code from your party.
              </div>
              <div className="campaign-empty-actions">
                <button className="campaign-primary" onClick={() => setMode('create')}>Create a campaign</button>
                <button className="campaign-ghost"   onClick={() => setMode('join')}>I have a code</button>
              </div>
            </div>
          ) : (
            <ul className="campaign-list">
              {campaigns.map(c => (
                <li key={c.id} className={`campaign-row ${c.id === activeId ? 'active' : ''}`}>
                  <div className="campaign-row-main">
                    <div className="campaign-row-title">
                      <span className={`campaign-role ${c.role}`}>{c.role === 'dm' ? 'DM' : 'Player'}</span>
                      <span className="campaign-row-name">{c.name}</span>
                    </div>
                    <div className="campaign-row-meta">
                      <span className="campaign-code-label">Invite code</span>
                      <code className="campaign-code-val">{c.invite_code}</code>
                      <button
                        className="campaign-copy"
                        onClick={() => copy(c.invite_code, c.id)}
                        title="Copy invite code"
                      >
                        {copied === c.id ? '✓ copied' : 'copy'}
                      </button>
                    </div>
                  </div>
                  <div className="campaign-row-actions">
                    {c.id === activeId ? (
                      <span className="campaign-active-badge">● Active</span>
                    ) : (
                      <button className="campaign-primary small" onClick={() => switchTo(c.id)}>
                        Switch to
                      </button>
                    )}
                    <button className="campaign-leave" onClick={() => leave(c.id)} title="Leave campaign">
                      Leave
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {mode === 'create' && (
          <div className="campaign-form">
            <label>
              <span className="signin-label-text-m">Campaign name</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g. "The Eldorian Tides"'
                autoFocus
                onKeyDown={e => e.key === 'Enter' && doCreate()}
              />
            </label>
            <p className="campaign-help">
              You'll be the DM. We'll generate an 8-character invite code your players
              can use to join.
            </p>
            {error && <div className="signin-error myrt">{error}</div>}
            <button className="signin-submit myrt" onClick={doCreate} disabled={!name.trim() || busy}>
              {busy ? '…' : 'Create campaign'}
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="campaign-form">
            <label>
              <span className="signin-label-text-m">Invite code</span>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="abc12345"
                autoFocus
                maxLength={12}
                style={{ letterSpacing: '0.2em', textTransform: 'lowercase' }}
                onKeyDown={e => e.key === 'Enter' && doJoin()}
              />
            </label>
            <p className="campaign-help">
              Ask your DM for the 8-character code from their campaign.
            </p>
            {error && <div className="signin-error myrt">{error}</div>}
            <button className="signin-submit myrt" onClick={doJoin} disabled={!code.trim() || busy}>
              {busy ? '…' : 'Join campaign'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
window.CampaignsModal = CampaignsModal;

// First-time prompt when user is signed in but has no active campaign
function CampaignPromptBanner({ onOpen }) {
  const store = window.useMyrtaviaStore();
  const user = store.getUser();
  const active = store.getActiveCampaign();
  if (!user || active) return null;

  return (
    <div className="campaign-prompt-banner">
      <div className="cpb-text">
        <strong>No active campaign.</strong>
        <span>Notes &amp; markers are scoped per campaign.</span>
      </div>
      <button className="cpb-btn" onClick={onOpen}>Set up a campaign</button>
    </div>
  );
}
window.CampaignPromptBanner = CampaignPromptBanner;
