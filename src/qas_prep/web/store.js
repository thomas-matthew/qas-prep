/* Profiles and saved tests, kept on the host (DAT-07) through the app's API.
   A test that cannot be saved is kept in this browser and saved again on the next visit (DAT-09). */
(function () {
  const PROFILE_KEY = 'qas-profile', PENDING_KEY = 'qas-pending';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  async function api(path, opts = {}) {
    const res = await fetch(path, { headers: opts.body ? { 'Content-Type': 'application/json' } : {}, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
    let data = null; try { data = await res.json(); } catch (e) { }
    if (!res.ok) { const err = new Error((data && (data.detail || data.error)) || `The app answered with an error (${res.status}).`); err.status = res.status; throw err; }
    return data;
  }

  const store = {
    mode: 'loading', // loading | server | offline
    cache: [], profiles: [], pid: null, listeners: [], lastError: '',
    api,
    get() { return this.cache.slice(); },
    profile() { return this.profiles.find(p => p.id === this.pid) || null; },
    onChange(f) { this.listeners.push(f); },
    emit() { this.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },

    async init() {
      try {
        this.profiles = await api('/api/profiles');
        const saved = ls.get(PROFILE_KEY, null);
        this.pid = (this.profiles.find(p => p.id === saved) || this.profiles[0] || {}).id ?? null;
        await this.load();
      } catch (e) {
        console.error(e); this.mode = 'offline'; this.lastError = 'The app’s server could not be reached. Check that it is running on the host computer.';
        this.emit();
      }
    },
    async load() {
      this.cache = [];
      if (this.pid !== null) {
        ls.set(PROFILE_KEY, this.pid);
        await this.flushPending();
        this.cache = await api(`/api/profiles/${this.pid}/attempts`);
      }
      this.mode = 'server'; this.lastError = '';
      this.emit();
    },
    async refreshProfiles() { this.profiles = await api('/api/profiles'); },
    async switchTo(pid) { this.pid = pid; this.mode = 'loading'; this.emit(); await this.refreshProfiles(); await this.load(); },
    async createProfile(name) { const p = await api('/api/profiles', { method: 'POST', body: { name } }); await this.refreshProfiles(); await this.switchTo(p.id); return p; },
    async renameProfile(name) { await api(`/api/profiles/${this.pid}`, { method: 'PATCH', body: { name } }); await this.refreshProfiles(); this.emit(); },
    async deleteProfile() { await api(`/api/profiles/${this.pid}`, { method: 'DELETE' }); await this.refreshProfiles(); this.pid = this.profiles[0] ? this.profiles[0].id : null; await this.load(); },
    async setOptIn(on) { await api(`/api/profiles/${this.pid}/tutor-optin`, { method: 'POST', body: { on } }); await this.refreshProfiles(); },

    pending() { return ls.get(PENDING_KEY, []).filter(p => p.pid === this.pid); },
    async flushPending() {
      const all = ls.get(PENDING_KEY, []), keep = [];
      for (const p of all) {
        if (p.pid !== this.pid) { keep.push(p); continue; }
        try { await api(`/api/profiles/${p.pid}/attempts`, { method: 'POST', body: p.r }); } catch (e) { keep.push(p); }
      }
      ls.set(PENDING_KEY, keep);
    },
    /* Saves a finished test. Resolves to the saved test (with its id) or null if saving failed. */
    async add(r) {
      try {
        const { id } = await api(`/api/profiles/${this.pid}/attempts`, { method: 'POST', body: r });
        const saved = { ...r, id }; this.cache.push(saved); this.lastError = '';
        this.emit(); return saved;
      } catch (e) {
        console.error(e);
        const kept = ls.set(PENDING_KEY, ls.get(PENDING_KEY, []).concat([{ pid: this.pid, r }]));
        this.lastError = 'This test could not be saved to the app. ' + (kept ? 'It is kept in this browser and will be saved the next time the app opens.' : 'Keep this page open and try again later.');
        this.cache.push({ ...r, id: null }); this.emit(); return null;
      }
    },
    async clear() {
      await api(`/api/profiles/${this.pid}/attempts`, { method: 'DELETE' });
      ls.set(PENDING_KEY, ls.get(PENDING_KEY, []).filter(p => p.pid !== this.pid));
      this.cache = []; this.emit();
    },
    exportUrl() { return `/api/profiles/${this.pid}/export`; },
    async importFile(file) {
      const text = await file.text(); let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error('That file is not a QAS Prep history export.'); }
      const { added } = await api(`/api/profiles/${this.pid}/import`, { method: 'POST', body: data });
      await this.load(); return added;
    },
    label() {
      return { loading: 'Loading your saved tests…', server: 'Saved on the host computer, so every device on your network sees the same history.', offline: this.lastError }[this.mode];
    }
  };
  window.QAS_STORE = store;
})();
