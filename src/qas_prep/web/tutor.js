/* The tutor panel (spec section 10). It opens beside the page with the material already in place:
   a question, a test's mistakes, or a progress summary. Conversations are saved on the host and reopen
   from the same question or test (AIT-05). Nothing is sent until the learner turns the tutor on (AIT-09). */
(function () {
  const store = window.QAS_STORE, panel = document.getElementById('tutor');
  let locked = false, conv = null, busy = false, req = null, lastFocus = null;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- light Markdown: paragraphs, lists, headings, bold, italics, code ---------- */
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  }
  function md(text) {
    const lines = String(text).replace(/\r/g, '').split('\n'), out = []; let list = null, para = [];
    const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
    const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.t}>`); list = null; } };
    for (const raw of lines) {
      const line = raw.trimEnd(), ul = /^\s*[-*•]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line), h = /^#{1,4}\s+(.*)$/.exec(line);
      if (!line.trim()) { flushP(); flushL(); continue; }
      if (h) { flushP(); flushL(); out.push(`<h4>${inline(h[1])}</h4>`); continue; }
      if (ul || ol) { flushP(); const t = ul ? 'ul' : 'ol'; if (!list || list.t !== t) { flushL(); list = { t, items: [] }; } list.items.push((ul || ol)[1]); continue; }
      if (list && /^\s{2,}\S/.test(raw)) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
      flushL(); para.push(line);
    }
    flushP(); flushL();
    return out.join('').replace(/<p>Not verified<\/p>/g, '<p class="nv">Not verified</p>').replace(/(<li>|<p>)Not verified(<br>)?/g, '$1<span class="nv">Not verified</span>$2');
  }

  /* ---------- panel ---------- */
  function close() {
    if (req) req.abort();
    panel.hidden = true; panel.innerHTML = ''; conv = null; document.body.classList.remove('with-tutor');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function shell(title, body) {
    panel.hidden = false; document.body.classList.add('with-tutor');
    panel.innerHTML = `<header class="tu-head"><div><span class="tu-kicker">Tutor · Claude</span><h2>${esc(title)}</h2></div><button class="btn ghost small" id="tu-close" aria-label="Close the tutor">Close</button></header><div class="tu-body">${body}</div>`;
    panel.querySelector('#tu-close').onclick = close;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

  async function open(spec) {
    if (locked) return; // AIT-08: no tutor during a test
    lastFocus = document.activeElement;
    const p = store.profile(); if (!p) return;
    if (!p.tutorOptIn) return consent(spec);
    shell(spec.title || 'Tutor', '<p class="muted">Opening…</p>');
    try {
      const found = await store.api(`/api/profiles/${store.pid}/conversations?kind=${encodeURIComponent(spec.kind)}&ref=${encodeURIComponent(spec.ref)}`);
      conv = found.length ? await store.api(`/api/conversations/${found[0].id}`)
        : await store.api(`/api/profiles/${store.pid}/conversations`, { method: 'POST', body: spec.body });
      render();
      document.dispatchEvent(new CustomEvent('tutor-change'));
      if (!conv.messages.length && spec.autoAsk) send(spec.autoAsk);
      else panel.querySelector('#tu-text')?.focus();
      checkStatus();
    } catch (e) {
      shell(spec.title || 'Tutor', `<p class="tu-err">${esc(e.message)}</p>`);
    }
  }

  function consent(spec) {
    shell('Turn on the tutor?', `
      <p>The tutor is Claude, made by Anthropic. It runs through the Claude login on the computer that hosts this app.</p>
      <p>When you ask it something, the app sends Claude what you're asking about:</p>
      <ul><li>a question, its figure, the four choices, your answer and the worked solution</li><li>or the questions you missed on a test</li><li>or a summary of your scores and topics, for a study plan</li></ul>
      <p>Nothing else leaves the computer. Practice tests, progress and everything else keep working without it.</p>
      <div class="end-row"><button class="btn primary" id="tu-yes">Turn on the tutor</button><button class="btn ghost" id="tu-no">Not now</button></div>`);
    panel.querySelector('#tu-yes').onclick = async () => { try { await store.setOptIn(true); open(spec); } catch (e) { alert(e.message); } };
    panel.querySelector('#tu-no').onclick = close;
    panel.querySelector('#tu-yes').focus();
  }

  function render() {
    shell(conv.title, `
      <p class="tu-ctx"><span class="tu-ctx-l">The tutor already has</span> ${esc(conv.summary)}${conv.figures ? ` · ${conv.figures} figure${conv.figures > 1 ? 's' : ''}` : ''}</p>
      <p class="fine">Practice questions the tutor writes are marked “Not verified”: they have not been checked like the app’s question bank.</p>
      <div class="tu-status" id="tu-status" hidden></div>
      <div class="tu-log" id="tu-log" aria-live="polite">${conv.messages.map(m => msgHTML(m.role, m.text)).join('')}</div>
      <div class="tu-sug" id="tu-sug">${conv.suggestions.map(s => `<button class="chip-btn" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="tu-form" id="tu-form"><label class="sr" for="tu-text">Ask the tutor</label>
        <textarea id="tu-text" rows="2" placeholder="Ask about this…" maxlength="4000"></textarea>
        <button class="btn primary" id="tu-send" type="submit">Send</button></form>
      <div class="tu-foot"><button class="link" id="tu-new">Start a fresh conversation</button></div>`);
    const form = panel.querySelector('#tu-form'), ta = panel.querySelector('#tu-text');
    form.onsubmit = e => { e.preventDefault(); if (ta.value.trim()) send(ta.value.trim()); };
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } };
    panel.querySelectorAll('[data-s]').forEach(b => (b.onclick = () => send(b.dataset.s)));
    panel.querySelector('#tu-new').onclick = async () => {
      if (busy) return;
      await store.api(`/api/conversations/${conv.id}`, { method: 'DELETE' });
      const spec = conv._spec; conv = null; start(spec);
    };
    scrollLog();
  }
  const msgHTML = (role, text) => `<div class="tu-msg ${role === 'user' ? 'me' : 'ai'}">${role === 'user' ? `<p>${esc(text)}</p>` : md(text)}</div>`;
  const scrollLog = () => { const l = panel.querySelector('#tu-log'); if (l) l.scrollTop = l.scrollHeight; };

  async function checkStatus() {
    try {
      const s = await store.api('/api/tutor/status');
      const el = panel.querySelector('#tu-status'); if (!el) return;
      if (!s.ok) { el.hidden = false; el.textContent = s.message + ' Everything else in the app keeps working.'; }
    } catch (e) { }
  }

  async function send(text) {
    if (busy || !conv) return;
    busy = true;
    const log = panel.querySelector('#tu-log'), sendBtn = panel.querySelector('#tu-send'), ta = panel.querySelector('#tu-text');
    ta.value = ''; sendBtn.disabled = true; panel.querySelectorAll('[data-s]').forEach(b => (b.disabled = true));
    log.insertAdjacentHTML('beforeend', msgHTML('user', text) + '<div class="tu-msg ai pending"><p class="muted">Thinking…</p></div>');
    const out = log.lastElementChild; scrollLog();
    let acc = '', finished = false;
    req = new AbortController();
    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: req.signal });
      if (!res.ok) { let d = null; try { d = await res.json(); } catch (e) { } throw new Error((d && d.detail) || 'The tutor could not be reached.'); }
      const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          if (!chunk.startsWith('data: ')) continue;
          const ev = JSON.parse(chunk.slice(6));
          if (ev.delta) { acc += ev.delta; out.classList.remove('pending'); out.innerHTML = md(acc); scrollLog(); }
          if (ev.done) { finished = true; out.innerHTML = md(ev.text); conv.messages.push({ role: 'user', text }, { role: 'assistant', text: ev.text }); }
          if (ev.error) throw new Error(ev.error);
        }
      }
      if (!finished) throw new Error('The reply was cut off. Try asking again.');
    } catch (e) {
      if (e.name === 'AbortError') return;
      out.classList.remove('pending'); out.classList.add('err');
      out.innerHTML = `${acc ? md(acc) : ''}<p class="tu-err">${esc(e.message)} Everything else in the app keeps working.</p>`;
    } finally {
      busy = false; req = null;
      if (panel.contains(sendBtn)) { sendBtn.disabled = false; panel.querySelectorAll('[data-s]').forEach(b => (b.disabled = false)); ta.focus(); }
      scrollLog();
    }
  }

  /* Opens a conversation. spec: {kind, ref, title, body (for creating it), autoAsk}. */
  function start(spec) { open(spec).then(() => { if (conv) conv._spec = spec; }); }

  window.QAS_TUTOR = {
    open: start, close,
    lock(on) { locked = on; if (on) close(); },
    isLocked: () => locked,
    // conversation refs this profile already has, so buttons can say "Continue with the tutor"
    async refs() { try { return new Set((await store.api(`/api/profiles/${store.pid}/conversations`)).map(c => c.kind + '|' + c.ref)); } catch (e) { return new Set(); } }
  };
})();
