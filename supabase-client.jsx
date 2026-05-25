/* global supabase, React */
// supabase-client.jsx
// Real auth + Postgres + Realtime, swapped in for the local Store.
// Exposes the same public API (Store.getUser / getNotes / addNote / ...)
// that the existing UI components expect.

const SUPABASE_URL  = 'https://tpzzwmkpzwtpcdlrqfgm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwenp3bWtwend0cGNkbHJxZmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTg3MzksImV4cCI6MjA5NTI5NDczOX0.CNuUnvyJk3CocNEix7BizSFpMQe40PRzWyhY4eJH6yM';

// The supabase-js UMD exposes a global named `supabase` with `createClient`.
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
});
window.supabaseClient = client;

// ─── Store ───────────────────────────────────────────────────────────────
const Store = {
  _user: null,                       // { id, email, name, color }
  _campaigns: [],                    // [{ id, name, invite_code, dm_user_id, role }]
  _activeCampaignId: localStorage.getItem('myrtavia.activeCampaign') || null,
  _members: [],                      // [{ user_id, profiles: { name, color } }]
  _notes: [],                        // raw rows from notes table
  _markers: [],                      // raw rows from markers table
  _ready: false,                     // first auth check done
  _channel: null,
  _listeners: new Set(),

  subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); },
  _emit() { this._listeners.forEach(fn => fn()); },

  isReady() { return this._ready; },
  getUser() { return this._user; },
  getUsers() { return []; },         // legacy from local store; not used in Supabase mode
  getCampaigns() { return this._campaigns; },
  getActiveCampaignId() { return this._activeCampaignId; },
  getActiveCampaign() { return this._campaigns.find(c => c.id === this._activeCampaignId) || null; },
  getMembers() { return this._members; },

  _profileFor(userId) {
    const m = this._members.find(mb => mb.user_id === userId);
    return m && m.profiles
      ? { name: m.profiles.name, color: m.profiles.color }
      : { name: 'Unknown', color: '#999' };
  },

  _noteView(n) {
    const p = this._profileFor(n.user_id);
    return {
      id: n.id,
      text: n.text,
      userId: n.user_id,
      userName: p.name,
      userColor: p.color,
      ts: new Date(n.created_at).getTime(),
      regionId: n.region_id,
      poiId: n.poi_id,
    };
  },

  _markerView(m) {
    const p = this._profileFor(m.user_id);
    return {
      id: m.id,
      scope: m.scope,
      x: m.x, y: m.y,
      icon: m.icon,
      text: m.text,
      userId: m.user_id,
      userName: p.name,
      userColor: p.color,
      ts: new Date(m.created_at).getTime(),
    };
  },

  getNotes(regionId, poiId) {
    let n = this._notes;
    if (regionId) n = n.filter(x => x.region_id === regionId);
    if (poiId)    n = n.filter(x => x.poi_id === poiId);
    return n.map(x => this._noteView(x)).sort((a, b) => b.ts - a.ts);
  },

  getMarkers(scope) {
    let m = this._markers;
    if (scope) m = m.filter(x => x.scope === scope);
    return m.map(x => this._markerView(x)).sort((a, b) => a.ts - b.ts);
  },

  // ─── Auth ─────────────────────────────────────────────────────────────
  async signUp({ email, password, name, color }) {
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { name, color } },
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await this._teardownRealtime();
    await client.auth.signOut();
    this._user = null;
    this._campaigns = [];
    this._members = [];
    this._notes = [];
    this._markers = [];
    this._activeCampaignId = null;
    localStorage.removeItem('myrtavia.activeCampaign');
    this._emit();
  },

  async _loadUserAndData() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { this._user = null; this._emit(); return; }
    const { data: profile } = await client
      .from('profiles').select('*').eq('id', user.id).maybeSingle();
    this._user = {
      id: user.id,
      email: user.email,
      name: profile?.name || user.email,
      color: profile?.color || '#c9a961',
    };
    await this._loadCampaigns();
    this._emit();
  },

  async _loadCampaigns() {
    if (!this._user) return;
    const { data, error } = await client
      .from('campaigns')
      .select('id, name, invite_code, dm_user_id, created_at, campaign_members!inner(role)')
      .eq('campaign_members.user_id', this._user.id);
    if (error) { console.warn('campaigns load', error); this._campaigns = []; return; }
    this._campaigns = (data || []).map(c => ({
      ...c,
      role: c.campaign_members?.[0]?.role || 'player',
    }));
    if (this._activeCampaignId && !this._campaigns.find(c => c.id === this._activeCampaignId)) {
      this._activeCampaignId = null;
    }
    if (!this._activeCampaignId && this._campaigns.length > 0) {
      this._activeCampaignId = this._campaigns[0].id;
      localStorage.setItem('myrtavia.activeCampaign', this._activeCampaignId);
    }
    if (this._activeCampaignId) await this._loadCampaignData();
  },

  async _loadCampaignData() {
    if (!this._activeCampaignId) return;
    const [mRes, nRes, kRes] = await Promise.all([
      client.from('campaign_members').select('user_id, role, profiles(name, color)').eq('campaign_id', this._activeCampaignId),
      client.from('notes').select('*').eq('campaign_id', this._activeCampaignId),
      client.from('markers').select('*').eq('campaign_id', this._activeCampaignId),
    ]);
    this._members = mRes.data || [];
    this._notes   = nRes.data || [];
    this._markers = kRes.data || [];
    this._setupRealtime();
    this._emit();
  },

  async setActiveCampaign(id) {
    if (id === this._activeCampaignId) return;
    this._activeCampaignId = id;
    if (id) localStorage.setItem('myrtavia.activeCampaign', id);
    else    localStorage.removeItem('myrtavia.activeCampaign');
    await this._teardownRealtime();
    this._notes = [];
    this._markers = [];
    this._members = [];
    this._emit();
    if (id) await this._loadCampaignData();
  },

  async createCampaign({ name }) {
    if (!this._user) throw new Error('Not signed in');
    const { data, error } = await client.from('campaigns')
      .insert({ name, dm_user_id: this._user.id })
      .select().single();
    if (error) throw error;
    await this._loadCampaigns();
    await this.setActiveCampaign(data.id);
    return data;
  },

  async joinCampaign(code) {
    if (!this._user) throw new Error('Not signed in');
    const trimmed = (code || '').trim().toLowerCase();
    if (!trimmed) throw new Error('Enter an invite code');
    const { data, error } = await client.rpc('join_campaign_by_code', { code: trimmed });
    if (error) throw error;
    await this._loadCampaigns();
    await this.setActiveCampaign(data);
    return data;
  },

  async leaveCampaign(id) {
    if (!this._user) return;
    await client.from('campaign_members').delete()
      .eq('campaign_id', id).eq('user_id', this._user.id);
    if (this._activeCampaignId === id) {
      await this.setActiveCampaign(null);
    }
    await this._loadCampaigns();
    this._emit();
  },

  // ─── Notes ────────────────────────────────────────────────────────────
  async addNote({ regionId, poiId, text }) {
    if (!this._user || !this._activeCampaignId) return;
    const { error } = await client.from('notes').insert({
      campaign_id: this._activeCampaignId,
      region_id: regionId,
      poi_id: poiId,
      user_id: this._user.id,
      text,
    });
    if (error) console.warn('addNote', error);
  },

  async removeNote(id) {
    const { error } = await client.from('notes').delete().eq('id', id);
    if (error) console.warn('removeNote', error);
  },

  // ─── Markers ──────────────────────────────────────────────────────────
  async addMarker(marker) {
    if (!this._user || !this._activeCampaignId) return null;
    const { data, error } = await client.from('markers').insert({
      campaign_id: this._activeCampaignId,
      scope: marker.scope,
      x: marker.x, y: marker.y,
      icon: marker.icon,
      text: marker.text,
      user_id: this._user.id,
    }).select().single();
    if (error) { console.warn('addMarker', error); return null; }
    return data;
  },

  async removeMarker(id) {
    const { error } = await client.from('markers').delete().eq('id', id);
    if (error) console.warn('removeMarker', error);
  },

  // ─── Profile updates ─────────────────────────────────────────────────
  async updateProfile({ name, color }) {
    if (!this._user) return;
    const patch = {};
    if (name)  patch.name  = name;
    if (color) patch.color = color;
    const { error } = await client.from('profiles').update(patch).eq('id', this._user.id);
    if (error) { console.warn('updateProfile', error); return; }
    Object.assign(this._user, patch);
    // also reflect in cached members
    const m = this._members.find(x => x.user_id === this._user.id);
    if (m && m.profiles) Object.assign(m.profiles, patch);
    this._emit();
  },

  // ─── Realtime ─────────────────────────────────────────────────────────
  _setupRealtime() {
    if (!this._activeCampaignId) return;
    if (this._channel) this._teardownRealtime();
    const cid = this._activeCampaignId;
    this._channel = client.channel(`campaign-${cid}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `campaign_id=eq.${cid}` },
        (p) => this._applyChange(this._notes, p, '_notes'))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'markers', filter: `campaign_id=eq.${cid}` },
        (p) => this._applyChange(this._markers, p, '_markers'))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_members', filter: `campaign_id=eq.${cid}` },
        () => this._loadCampaignData())  // members changed → refetch with profile join
      .subscribe();
  },

  async _teardownRealtime() {
    if (this._channel) {
      await client.removeChannel(this._channel);
      this._channel = null;
    }
  },

  _applyChange(arr, payload, key) {
    if (payload.eventType === 'INSERT') {
      if (!arr.find(x => x.id === payload.new.id)) arr.push(payload.new);
    } else if (payload.eventType === 'UPDATE') {
      const i = arr.findIndex(x => x.id === payload.new.id);
      if (i >= 0) arr[i] = payload.new;
    } else if (payload.eventType === 'DELETE') {
      this[key] = arr.filter(x => x.id !== payload.old.id);
    }
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

// ─── Boot ────────────────────────────────────────────────────────────────
(async () => {
  // Initial session check
  await Store._loadUserAndData();
  Store._ready = true;
  Store._emit();

  // React to sign-in / sign-out triggered elsewhere
  client.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      await Store._loadUserAndData();
    } else if (event === 'SIGNED_OUT') {
      await Store._teardownRealtime();
      Store._user = null;
      Store._campaigns = [];
      Store._members = [];
      Store._notes = [];
      Store._markers = [];
      Store._activeCampaignId = null;
      Store._emit();
    }
  });
})();

// Utility for note timestamps
function formatRel(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)       return 'just now';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000)  return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}
window.formatRel = formatRel;
