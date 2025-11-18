(() => {
})();
(() => {
  const container = document.getElementById('evo-container');
  const progressRoot = document.getElementById('evo-progress-container');
  const modalRoot = document.getElementById('evo-modal-root');
  const defaults = { position: 'top-right', max: 5, accentColor: undefined, style: 'card' };
  const rootEl = document.documentElement;

  // Color helpers for subtle shades
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 255, g: 151, b: 14 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }
  function rgbToHex(r, g, b) {
    const to = (v) => (v.toString(16).padStart(2, '0'));
    return `#${to(r)}${to(g)}${to(b)}`;
  }
  function lighten(hex, amt = 30) {
    const { r, g, b } = hexToRgb(hex);
    const nr = Math.min(255, Math.round(r + (255 - r) * (amt / 100)));
    const ng = Math.min(255, Math.round(g + (255 - g) * (amt / 100)));
    const nb = Math.min(255, Math.round(b + (255 - b) * (amt / 100)));
    return rgbToHex(nr, ng, nb);
  }

  function setPosition(pos) {
    const classes = [
      'pos-top-right','pos-top-left','pos-bottom-right','pos-bottom-left','pos-top-center','pos-bottom-center'
    ];
    classes.forEach(c => container.classList.remove(c));
    switch ((pos || defaults.position)) {
      case 'top-left': container.classList.add('pos-top-left'); break;
      case 'bottom-right': container.classList.add('pos-bottom-right'); break;
      case 'bottom-left': container.classList.add('pos-bottom-left'); break;
      case 'top-center': container.classList.add('pos-top-center'); break;
      case 'bottom-center': container.classList.add('pos-bottom-center'); break;
      default: container.classList.add('pos-top-right'); break;
    }
  }

  const icons = {
    info: '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>',
    success: '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>',
    error: '<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>'
  };
  const typeColors = {
    info: '#60a5fa',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  function makeToast({ title, message, nType = 'info', duration = 4000, position, accentColor, style, className, sound }) {
    setPosition(position);

    // Enforce max shown
    while (container.children.length >= (defaults.max || 5)) {
      container.removeChild(container.firstElementChild);
    }

    const toast = document.createElement('div');
    let styleName = (style || defaults.style);
    // Backward compatibility: map deprecated/removed styles
    if (styleName === 'glass') styleName = 'square';
    if (styleName === 'pill') styleName = 'card';
    toast.className = `evo-toast type-${nType} style-${styleName}`;
    if (className) toast.classList.add(String(className));


    const icon = document.createElement('div');
    icon.className = 'evo-icon';
    icon.innerHTML = icons[nType] || icons.info;

    const text = document.createElement('div');
    text.className = 'evo-text';
    if (typeof title === 'string' && title.trim() !== '') {
      const ttl = document.createElement('div');
      ttl.className = 'title';
      ttl.textContent = String(title);
      text.appendChild(ttl);
    }
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = String(message ?? '');
    text.appendChild(msg);
    toast.appendChild(icon);
    toast.appendChild(text);

    // bottom progress line (single full-width bar that depletes)
    const underline = document.createElement('div');
    underline.className = 'evo-underline';
    const bar = document.createElement('div');
    bar.className = 'bar';
    underline.appendChild(bar);
    toast.appendChild(underline);

    let hideTimer;

    function removeToast() {
      if (!toast.isConnected) return;
      // graceful exit: slide fully off-screen to the right (much slower, constant speed)
      toast.style.animation = 'evo-slide-out 2000ms linear forwards';
      setTimeout(() => toast.isConnected && toast.remove(), 2100);
    }

    toast.addEventListener('click', removeToast);

    container.appendChild(toast);

    // Play custom sound if provided
    try {
      if (sound && sound.enabled && typeof sound.file === 'string') {
        const a = new Audio(sound.file);
        if (typeof sound.volume === 'number') a.volume = Math.min(1, Math.max(0, sound.volume));
        a.play().catch(() => {});
      }
    } catch (e) {}

    // Accent color for notify: prefer explicit option, else use classic per-type color
    const acc = accentColor || typeColors[nType] || '#60a5fa';
    if (acc) {
      toast.style.setProperty('--accent', acc);
      // soft accent for glow
      try {
        // reuse lighten util
        toast.style.setProperty('--accentSoft', lighten(acc, 28));
        const { r, g, b } = hexToRgb(acc);
        toast.style.setProperty('--accentA12', `rgba(${r}, ${g}, ${b}, 0.12)`);
        toast.style.setProperty('--accentA08', `rgba(${r}, ${g}, ${b}, 0.08)`);
        toast.style.setProperty('--accentA04', `rgba(${r}, ${g}, ${b}, 0.04)`);
      } catch (e) {}
    }

    // Start progress animation (deplete full bar over the duration)
    // robust layout + double-RAF to ensure transition fires in CEF
    const notifDur = Math.max(0, Number(duration) || 0);
    bar.style.transition = 'none';
    bar.style.width = '100%';
    requestAnimationFrame(() => {
      // force layout before enabling transition
      void bar.getBoundingClientRect();
      bar.style.transition = `width ${notifDur}ms linear`;
      requestAnimationFrame(() => {
        bar.style.width = '0%';
      });
    });

    // Auto hide
    hideTimer = setTimeout(() => {
      // mark bar done to remove glow tails then remove toast
      bar.classList.add('done');
      removeToast();
    }, duration);

    return () => {
      clearTimeout(hideTimer);
      removeToast();
    };
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action === 'config') {
      if (data.position) defaults.position = data.position;
      if (typeof data.max === 'number') defaults.max = data.max;
      if (typeof data.accentColor === 'string') defaults.accentColor = data.accentColor;
      if (typeof data.style === 'string') defaults.style = data.style;
      setPosition(defaults.position);
    }
    if (data.action === 'notify') {
      makeToast({
        title: (typeof data.title === 'string') ? data.title : undefined,
        message: data.message,
        nType: data.nType || 'info',
        duration: Number(data.duration) || 4000,
        position: data.position || defaults.position,
        accentColor: (typeof data.accentColor === 'string') ? data.accentColor : defaults.accentColor,
        style: (typeof data.style === 'string') ? data.style : defaults.style,
        sound: (data.sound && typeof data.sound === 'object') ? data.sound : undefined,
      });
    }
    if (data.action === 'clear') {
      container.innerHTML = '';
    }
  });

  // Guard against unwanted selection/shortcuts while a modal is open
  document.addEventListener('keydown', (e) => {
    if (!modalOpen) return;
    const target = e.target;
    // Allow full typing inside inputs/textarea/contenteditable
    if (target && (target.closest && target.closest('.evo-input')))
      return;
    if (target && (/^(input|textarea)$/i).test(target.tagName))
      return;
    if (target && target.isContentEditable)
      return;
    const k = (e.key || '').toLowerCase();
    if (k === 'w' || k === 'a' || k === 's' || k === 'd' || (e.ctrlKey && (k === 'a' || k === 'f'))) {
      e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
  }, true);

  // Initialize position
  setPosition(defaults.position);

  // Progress system (one at a time)
  let currentBar = null;
  let currentCircle = null;

  function runProgressBar(payload) {
    if (currentBar && currentBar.isConnected) currentBar.remove();
    const el = document.createElement('div');
    el.className = 'evo-pbar p-pos-top-center';
    const acc = payload.accentColor || defaults.accentColor || '#FF970E';
    el.style.setProperty('--accent', acc);
    el.style.setProperty('--accentSoft', lighten(acc, 28));
    if (payload.position === 'bottom-center') el.className = 'evo-pbar p-pos-bottom-center';
    if (payload.position === 'top-center') el.className = 'evo-pbar p-pos-top-center';
    if (payload.minimal) el.classList.add('p-minimal');
    if (payload.compact) el.classList.add('p-compact');
    if (payload.className) el.classList.add(String(payload.className));

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = payload.label || '';

    const track = document.createElement('div');
    track.className = 'track';
    // Single center-anchored fill to avoid double glow at seam
    const fill = document.createElement('div');
    fill.className = 'fill';
    track.appendChild(fill);

    const percent = document.createElement('div');
    percent.className = 'percent';
    percent.textContent = payload.showPercent ? '0%' : '';

    el.appendChild(label);
    el.appendChild(track);
    el.appendChild(percent);
    progressRoot.appendChild(el);
    currentBar = el;

    const dur = Math.max(0, Number(payload.duration) || 0);
    // Math-driven easing: linear to halfway, then progressively slower with continuous slope
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    let done = false;
    const start = performance.now();
    // initialize UI text
    if (payload.showPercent && dur > 0) {
      percent.textContent = `${(dur/1000).toFixed(1)}s`;
    }

    const step = (now) => {
      if (!el.isConnected || done) return;
      const u = dur > 0 ? clamp((now - start) / dur, 0, 1) : 1;
      const startEase = (typeof payload.easeStart === 'number') ? clamp(payload.easeStart, 0.0, 0.95) : 0.5;
      // Enforce a strictly linear start, then decelerate.
      // We intentionally lock the seam slope to 1.0 to avoid any
      // initial slow/fast behavior before the deceleration phase.
      const seamSlope = 1.0;
      const endSlope = (typeof payload.easeEnd === 'number') ? clamp(payload.easeEnd, 0.05, 0.8) : 0.20;
      let s;
      if (u <= startEase) {
        // first phase: strictly linear (constant speed)
        s = u;
      } else {
        // second phase: cubic Hermite on [0,1] with endpoint values y(0)=0, y(1)=1
        // and endpoint derivatives y'(0)=k (seam slope), y'(1)=e (final slope)
        // This ensures s(u=1)=1 exactly and a smooth, continuously decelerating finish.
        const a = startEase;
        const v = (u - a) / (1 - a); // normalize to 0..1 across second phase
        const k = seamSlope;         // seam slope locked to 1.0 for linear start
        const e = endSlope;          // end slope (keeps finish from feeling sticky)
        const v2 = v * v, v3 = v2 * v;
        const h10 = v3 - 2*v2 + v;
        const h01 = -2*v3 + 3*v2;
        const h11 = v3 - v2;
        const y = h10 * k + h01 * 1 + h11 * e;
        s = a + (1 - a) * y;
      }
      fill.style.width = `${(s * 100).toFixed(3)}%`;
      if (payload.showPercent && dur > 0) {
        const rem = Math.max(0, dur - (now - start));
        percent.textContent = `${(rem/1000).toFixed(1)}s`;
      }
      if (u < 1) {
        requestAnimationFrame(step);
      } else {
        done = true;
        setTimeout(() => { if (el.isConnected) el.remove(); if (currentBar === el) currentBar = null; }, 40);
      }
    };
    requestAnimationFrame(step);
  }

  // removed set/stop for clean one-shot API

  function runProgressCircle(payload) {
    if (currentCircle && currentCircle.isConnected) currentCircle.remove();
    const size = Math.max(60, Math.min(320, Number(payload.size) || 120));
    const thick = Math.max(4, Math.min(24, Number(payload.thickness) || 10));
    const radius = (size/2) - thick/2;
    const circumference = 2 * Math.PI * radius;

    const el = document.createElement('div');
    el.className = 'evo-pcircle p-pos-center';
    if (payload.position === 'top-center') el.className = 'evo-pcircle p-pos-top-center';
    if (payload.position === 'bottom-center') el.className = 'evo-pcircle p-pos-bottom-center';
    if (payload.className) el.classList.add(String(payload.className));
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    const canvas = document.createElement('div');
    canvas.className = 'canvas';
    const acc = payload.accentColor || defaults.accentColor || '#FF970E';
    el.style.setProperty('--accent', acc);
    el.style.setProperty('--accentSoft', lighten(acc, 28));

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('cx', String(size/2));
    track.setAttribute('cy', String(size/2));
    track.setAttribute('r', String(radius));
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', 'rgba(255,255,255,0.10)');
    track.setAttribute('stroke-width', String(thick));

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', String(size/2));
    ring.setAttribute('cy', String(size/2));
    ring.setAttribute('r', String(radius));
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', acc);
    ring.setAttribute('stroke-width', String(thick));
    // Flat ends on the progress arc (no rounded cap)
    ring.setAttribute('stroke-linecap', 'butt');
    ring.setAttribute('transform', `rotate(-90 ${size/2} ${size/2})`);
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = String(circumference);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = payload.label || '';

    const percent = document.createElement('div');
    percent.className = 'percent';
    percent.textContent = payload.showPercent ? '0%' : '';

    svg.appendChild(track);
    svg.appendChild(ring);
    canvas.appendChild(svg);
    canvas.appendChild(percent);
    wrap.appendChild(canvas);
    wrap.appendChild(label);
    el.appendChild(wrap);
    progressRoot.appendChild(el);
    currentCircle = el;

    const dur = Math.max(0, Number(payload.duration) || 0);
    ring.style.transition = `stroke-dashoffset ${dur}ms linear`;
    requestAnimationFrame(() => {
      // ensure a frame has passed before animating
      ring.getBoundingClientRect();
      ring.style.strokeDashoffset = '0';
    });
    // Smooth countdown text tied to duration
    if (payload.showPercent && dur > 0) {
      const start = performance.now();
      percent.textContent = `${(dur/1000).toFixed(1)}s`;
      const tick = (t) => {
        if (!el.isConnected) return;
        const elapsed = t - start;
        const rem = Math.max(0, dur - elapsed);
        percent.textContent = `${(rem/1000).toFixed(1)}s`;
        if (rem > 0) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    const onEnd = () => {
      ring.removeEventListener('transitionend', onEnd);
      setTimeout(() => { el.remove(); if (currentCircle === el) currentCircle = null; }, 120);
    };
    ring.addEventListener('transitionend', onEnd);
  }

  // removed set/stop for clean one-shot API

  // removed unused runtime CSS injection for spin keyframes

  // Progress messages router (one-shot only)
  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action !== 'progress') return;
    if (data.kind === 'bar' && data.cmd === 'run') return runProgressBar(data);
    if (data.kind === 'circle' && data.cmd === 'run') return runProgressCircle(data);
  });

  // Theme overrides: apply CSS vars at runtime
  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action !== 'theme') return;
    if (data.vars && typeof data.vars === 'object') {
      for (const [k, v] of Object.entries(data.vars)) {
        try { rootEl.style.setProperty(`--${k}`, String(v)); } catch (e) {}
      }
    }
  });

  // Menu system
  let modalOpen = false;
  const catRefs = new Map();
  function closeModal() {
    const m = modalRoot.querySelector('.evo-modal');
    if (m) m.remove();
    modalOpen = false;
  }

  // Allow Lua to close any open modal programmatically
  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action === 'closeMenu' || data.action === 'hideContext') {
      closeModal();
    }
  });

  function resolveMenu(result) {
    const resName = (typeof GetParentResourceName === 'function') ? GetParentResourceName() : 'evo-lib';
    fetch(`https://${resName}/menuResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(result || {})
    });
    closeModal();
  }

  function openConfirm(payload) {
    if (modalOpen) closeModal();
    modalOpen = true;
    const acc = payload.accentColor || defaults.accentColor || '#FF970E';
    const modal = document.createElement('div');
    modal.className = 'evo-modal';
    const panel = document.createElement('div');
    panel.className = 'evo-panel';
    panel.style.setProperty('--accent', acc);
    try { panel.style.setProperty('--accentSoft', lighten(acc, 28)); } catch (e) {}
    if (payload.className) panel.classList.add(String(payload.className));

    const hd = document.createElement('div'); hd.className = 'hd';
    const icon = document.createElement('div'); icon.className = 'icon'; icon.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = payload.title || 'Confirm';
    const close = document.createElement('button'); close.className = 'evo-close'; close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    hd.appendChild(icon); hd.appendChild(title); hd.appendChild(close);

    const msg = document.createElement('div'); msg.className = 'msg'; msg.textContent = payload.message || '';

    const actions = document.createElement('div'); actions.className = 'actions';
    const yes = document.createElement('button'); yes.className = 'evo-btn primary confirm-yes'; yes.textContent = payload.yesLabel || 'Yes';
    actions.appendChild(yes);

    panel.appendChild(hd); panel.appendChild(msg); panel.appendChild(actions);
    modal.appendChild(panel); modalRoot.appendChild(modal);

    function onKey(e){ if (!modalOpen) return; if (e.key==='Escape') { resolveMenu({ type:'confirm', accepted:false }); } if (e.key==='Enter') { resolveMenu({ type:'confirm', accepted:true }); } }
    // block WASD and selection while modal is open
    modal.addEventListener('keydown', (e) => { const k=(e.key||'').toLowerCase(); if(k==='w'||k==='a'||k==='s'||k==='d'){ e.preventDefault(); e.stopPropagation(); } });
    modal.addEventListener('selectstart', (e) => { e.preventDefault(); });
    document.addEventListener('keydown', onKey, { once: true });
    close.addEventListener('click', () => resolveMenu({ type:'confirm', accepted:false }));
    yes.addEventListener('click', () => resolveMenu({ type:'confirm', accepted:true }));
  }

  function openSelect(payload) {
    if (modalOpen) closeModal();
    modalOpen = true;
    const acc = payload.accentColor || defaults.accentColor || '#FF970E';
    const modal = document.createElement('div'); modal.className = 'evo-modal';
    const panel = document.createElement('div'); panel.className = 'evo-panel'; panel.style.setProperty('--accent', acc); try { panel.style.setProperty('--accentSoft', lighten(acc, 28)); } catch (e) {}
    if (payload.className) panel.classList.add(String(payload.className));
    const canClose = (payload.canClose !== false);

    const hd = document.createElement('div'); hd.className = 'hd';
    const icon = document.createElement('div'); icon.className = 'icon'; icon.innerHTML = '<i class="fa-solid fa-list"></i>';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = payload.title || 'Select';
    const close = document.createElement('button'); close.className = 'evo-close'; close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    hd.appendChild(icon); hd.appendChild(title); hd.appendChild(close);

    // Block WASD from causing unintended selection/scroll
    modal.addEventListener('keydown', (e) => {
      const lk = (e.key || '').toLowerCase();
      if (lk === 'w' || lk === 'a' || lk === 's' || lk === 'd') {
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    });
    // Prevent text selection in modal
    modal.addEventListener('selectstart', (e) => { e.preventDefault(); });

    const list = document.createElement('div'); list.className = 'evo-list';
    let selIndex = -1; // no preselected item
    const options = Array.isArray(payload.options) ? payload.options : [];
    options.forEach((opt, i) => {
      const item = document.createElement('div'); item.className = 'evo-item'; item.dataset.id = String(opt.id ?? i);
      if (opt.disabled || opt.readOnly) item.classList.add('disabled');
      const ii = document.createElement('div'); ii.className = 'i'; ii.innerHTML = opt.icon ? `<i class="${opt.icon}"></i>` : '<i class="fa-solid fa-circle"></i>';
      const t = document.createElement('div'); t.className = 't';
      const l = document.createElement('div'); l.className = 'l'; l.textContent = String(opt.label ?? ('Option '+(i+1)));
      const d = document.createElement('div'); d.className = 'd'; d.textContent = opt.description ? String(opt.description) : '';
      t.appendChild(l); if (opt.description) t.appendChild(d);
      const r = document.createElement('div'); r.className = 'r'; r.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      item.appendChild(ii); item.appendChild(t); item.appendChild(r);
      if (!item.classList.contains('disabled')) {
        item.addEventListener('click', () => resolveMenu({ type:'select', id: item.dataset.id }));
      }
      // hover bump animation
      try { item.addEventListener('mouseenter', () => { item.classList.remove('bump'); void item.offsetWidth; item.classList.add('bump'); }); } catch (e) {}
      list.appendChild(item);
    });

    function highlight(idx){
      const items = list.querySelectorAll('.evo-item');
      items.forEach(el => el.classList.remove('sel'));
      const el = items[idx]; if (el) el.classList.add('sel');
      el?.scrollIntoView({ block: 'nearest' });
    }

    function findNextSelectable(from, dir) {
      const items = list.querySelectorAll('.evo-item');
      if (items.length === 0) return from;
      let i = from;
      for (let step = 0; step < items.length; step++) {
        i = Math.min(items.length - 1, Math.max(0, i + dir));
        if (!items[i].classList.contains('disabled')) return i;
      }
      return from;
    }

    modal.addEventListener('keydown', (e) => {
      if (!modalOpen) return;
      if (e.key === 'Escape') {
        if (!canClose) return; 
        return resolveMenu({ type:'select', id: null });
      }
      if (e.key === 'Backspace' && payload.backButton) {
        return resolveMenu({ type:'select', id: '__back' });
      }
      const items = list.querySelectorAll('.evo-item');
      if (items.length === 0) return;
      if (e.key === 'ArrowDown') { selIndex = findNextSelectable(selIndex, +1); highlight(selIndex); }
      if (e.key === 'ArrowUp') { selIndex = findNextSelectable(selIndex, -1); highlight(selIndex); }
      if (e.key === 'Enter') {
        const el = items[selIndex];
        if (el && !el.classList.contains('disabled')) {
          try { el.classList.add('bump'); el.addEventListener('animationend', () => el.classList.remove('bump'), { once: true }); } catch (e) {}
          const id = el.dataset.id; resolveMenu({ type:'select', id });
        }
      }
    });
    close.addEventListener('click', () => resolveMenu({ type:'select', id: null }));

    panel.appendChild(hd); panel.appendChild(list);
    const needsActions = !!payload.backButton; // remove text Close button, keep header X
    if (needsActions) {
      const actions = document.createElement('div'); actions.className = 'actions';
      if (payload.backButton) {
        const backBtn = document.createElement('button'); backBtn.className = 'evo-btn'; backBtn.textContent = 'Back';
        actions.appendChild(backBtn);
        backBtn.addEventListener('click', () => resolveMenu({ type:'select', id: '__back' }));
      }
      panel.appendChild(actions);
    }
    modal.appendChild(panel); modalRoot.appendChild(modal);
    // no initial highlight; focus to capture keys
    panel.tabIndex = 0; panel.focus();
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action !== 'menu') return;
    if (data.kind === 'confirm') return openConfirm(data);
    if (data.kind === 'select') return openSelect(data);
    if (data.kind === 'input') return openInput(data);
    if (data.kind === 'multiselect') return openMultiSelect(data);
    if (data.kind === 'category') return openCategory(data);
  });

  function openInput(payload) {
    if (modalOpen) closeModal();
    modalOpen = true;
    const acc = payload.accentColor || defaults.accentColor || '#FF970E';
    const modal = document.createElement('div'); modal.className = 'evo-modal';
    const panel = document.createElement('div'); panel.className = 'evo-panel'; panel.style.setProperty('--accent', acc); try { panel.style.setProperty('--accentSoft', lighten(acc, 28)); } catch (e) {}
    const hd = document.createElement('div'); hd.className = 'hd';
    const icon = document.createElement('div'); icon.className = 'icon'; icon.innerHTML = '<i class="fa-solid fa-pen"></i>';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = payload.title || 'Input';
    const close = document.createElement('button'); close.className = 'evo-close'; close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    hd.appendChild(icon); hd.appendChild(title); hd.appendChild(close);
    // Prevent selection except within input
    modal.addEventListener('selectstart', (e) => { if (!e.target.closest('.evo-input')) e.preventDefault(); });
    const msg = document.createElement('div'); msg.className = 'msg'; msg.textContent = payload.message || '';
    const input = document.createElement('input'); input.className = 'evo-input'; input.type = 'text'; input.placeholder = payload.placeholder || ''; input.value = payload.default || '';
    const actions = document.createElement('div'); actions.className = 'actions';
    const ok = document.createElement('button'); ok.className = 'evo-btn primary'; ok.textContent = payload.okLabel || 'OK';
    actions.appendChild(ok);
    panel.appendChild(hd); if (payload.message) panel.appendChild(msg); panel.appendChild(input); panel.appendChild(actions);
    modal.appendChild(panel); modalRoot.appendChild(modal);
    input.focus(); input.select();
    function onKey(e){ if (!modalOpen) return; if (e.key==='Escape') resolveMenu({ type:'input', text:null }); if (e.key==='Enter') resolveMenu({ type:'input', text: input.value }); }
    panel.addEventListener('keydown', onKey);
    close.addEventListener('click', () => resolveMenu({ type:'input', text:null }));
    ok.addEventListener('click', () => resolveMenu({ type:'input', text: input.value }));
  }

  function openMultiSelect(payload) {
    if (modalOpen) closeModal();
    modalOpen = true;
    const acc = payload.accentColor || defaults.accentColor || '#FF970E';
    const modal = document.createElement('div'); modal.className = 'evo-modal';
    const panel = document.createElement('div'); panel.className = 'evo-panel'; panel.style.setProperty('--accent', acc); try { panel.style.setProperty('--accentSoft', lighten(acc, 28)); } catch (e) {}
    const hd = document.createElement('div'); hd.className = 'hd';
    const icon = document.createElement('div'); icon.className = 'icon'; icon.innerHTML = '<i class="fa-solid fa-list-check"></i>';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = payload.title || 'Select Items';
    const close = document.createElement('button'); close.className = 'evo-close'; close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    hd.appendChild(icon); hd.appendChild(title); hd.appendChild(close);
    // Block WASD and selection
    modal.addEventListener('keydown', (e) => { const lk=(e.key||'').toLowerCase(); if(lk==='w'||lk==='a'||lk==='s'||lk==='d'){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); } });
    modal.addEventListener('selectstart', (e) => { e.preventDefault(); });
    const list = document.createElement('div'); list.className = 'evo-list';
    const options = Array.isArray(payload.options) ? payload.options : [];
    const selected = new Set();
    options.forEach((opt, i) => {
      const item = document.createElement('div'); item.className = 'evo-item'; item.dataset.id = String(opt.id ?? i);
      const chk = document.createElement('div'); chk.className = 'chk'; chk.innerHTML = '<i class="fa-solid fa-check"></i>';
      const t = document.createElement('div'); t.className = 't';
      const l = document.createElement('div'); l.className = 'l'; l.textContent = String(opt.label ?? ('Option '+(i+1)));
      const d = document.createElement('div'); d.className = 'd'; d.textContent = opt.description ? String(opt.description) : '';
      t.appendChild(l); if (opt.description) t.appendChild(d);
      item.appendChild(chk); item.appendChild(t);
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (selected.has(id)) { selected.delete(id); item.classList.remove('active'); }
        else { selected.add(id); item.classList.add('active'); }
      });
      list.appendChild(item);
    });
    const actions = document.createElement('div'); actions.className = 'actions';
    const done = document.createElement('button'); done.className = 'evo-btn primary'; done.textContent = payload.doneLabel || 'Done';
    actions.appendChild(done);
    panel.appendChild(hd); panel.appendChild(list); panel.appendChild(actions);
    modal.appendChild(panel); modalRoot.appendChild(modal);
    panel.tabIndex = 0; panel.focus();
    panel.addEventListener('keydown', (e) => { if (e.key==='Escape') resolveMenu({ type:'multiselect', ids: [] }); if (e.key==='Enter') resolveMenu({ type:'multiselect', ids: Array.from(selected) }); });
    done.addEventListener('click', () => resolveMenu({ type:'multiselect', ids: Array.from(selected) }));
    close.addEventListener('click', () => resolveMenu({ type:'multiselect', ids: [] }));
  }

  function openCategory(payload) {
    if (modalOpen) closeModal();
    modalOpen = true;
    const acc = payload.accentColor || defaults.accentColor || '#FF970E';
    const modal = document.createElement('div'); modal.className = 'evo-modal';
    const panel = document.createElement('div'); panel.className = 'evo-panel'; panel.style.setProperty('--accent', acc); try { panel.style.setProperty('--accentSoft', lighten(acc, 28)); } catch (e) {}
    if (payload.className) panel.classList.add(String(payload.className));

    const hd = document.createElement('div'); hd.className = 'hd';
    const icon = document.createElement('div'); icon.className = 'icon'; icon.innerHTML = '<i class="fa-solid fa-layer-group"></i>';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = payload.title || 'Categories';
    const xbtn = document.createElement('button'); xbtn.className = 'evo-close'; xbtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    hd.appendChild(icon); hd.appendChild(title); hd.appendChild(xbtn);
    // Block WASD and selection
    modal.addEventListener('keydown', (e) => { const lk=(e.key||'').toLowerCase(); if(lk==='w'||lk==='a'||lk==='s'||lk==='d'){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); } });
    modal.addEventListener('selectstart', (e) => { e.preventDefault(); });

    const grid = document.createElement('div'); grid.className = 'evo-catgrid';
    const cats = Array.isArray(payload.categories) ? payload.categories : [];
    
    // Simple/normalized mode: allow string/number entries and minimal UI
    (function(){
      const normalize = (arr) => arr.map((c, i) => {
        if (typeof c === 'string' || typeof c === 'number') return { id: String(c), label: String(c) };
        if (c && typeof c === 'object') {
          const id = (c.id != null) ? String(c.id) : (c.label ? String(c.label) : String(i));
          return {
            id,
            label: String(c.label || id || ('Item '+(i+1))),
            description: c.description ? String(c.description) : '',
            icon: c.icon || null,
            stats: Array.isArray(c.stats) ? c.stats : [],
            progress: (c.progress && typeof c.progress.value === 'number' && typeof c.progress.max === 'number') ? c.progress : null,
            items: Array.isArray(c.items) ? c.items : []
          };
        }
        return { id: String(i), label: 'Item '+(i+1) };
      });
      const simpleFlag = (payload.simple === true);
      const norm = normalize(cats);
      const hasAdvanced = norm.some(c => (c.items && c.items.length) || (c.stats && c.stats.length) || c.progress);
      if (simpleFlag || !hasAdvanced) {
        norm.forEach((c, i) => {
          const card = document.createElement('div'); card.className = 'evo-cat'; card.dataset.id = String(c.id || i);
          const ttl = document.createElement('div'); ttl.className = 'ttl'; ttl.innerHTML = (c.icon ? `<i class="${c.icon}"></i>` : '') + (c.label ? ` ${c.label}` : '');
          card.appendChild(ttl);
          if (c.description) { const d = document.createElement('div'); d.className = 'desc'; d.textContent = c.description; card.appendChild(d); }
          card.addEventListener('click', () => resolveMenu({ type:'category', categoryId: card.dataset.id, itemId: null }));
          grid.appendChild(card);
        });
        panel.appendChild(hd);
        panel.appendChild(grid);
        // Remove text Close button; keep header X for closing
        xbtn.addEventListener('click', () => resolveMenu({ type:'category', categoryId: null, itemId: null }));
        modal.appendChild(panel); modalRoot.appendChild(modal);
        return;
      }
    })();
    catRefs.clear();
    cats.forEach((c) => {
      const card = document.createElement('div'); card.className = 'evo-cat'; card.dataset.id = String(c.id ?? '');
      const ttl = document.createElement('div'); ttl.className = 'ttl'; ttl.innerHTML = (c.icon ? `<i class="${c.icon}"></i>` : '') + (c.label ? ` ${c.label}` : '');
      const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = c.description || '';
      card.appendChild(ttl); if (c.description) card.appendChild(desc);
      const statMap = new Map();
      if (Array.isArray(c.stats) && c.stats.length) {
        const meta = document.createElement('div'); meta.className = 'meta';
        c.stats.forEach((s, i) => {
          const st = document.createElement('div'); st.className = 'stat';
          const key = String(s.label || s.key || ('stat'+i));
          const k = document.createElement('span'); k.className = 'k'; k.textContent = key;
          const v = document.createElement('span'); v.className = 'v'; v.textContent = String(s.value || '');
          st.appendChild(k); st.appendChild(v); meta.appendChild(st);
          statMap.set(key, v);
        });
        card.appendChild(meta);
      }
      if (c.progress && typeof c.progress.value === 'number' && typeof c.progress.max === 'number') {
        const prog = document.createElement('div'); prog.className = 'catprog';
        const fill = document.createElement('div'); fill.className = 'fill';
        prog.appendChild(fill); card.appendChild(prog);
        const p = Math.max(0, Math.min(1, Number(c.progress.value) / Number(c.progress.max)));
        requestAnimationFrame(() => { fill.style.width = `${Math.round(p*100)}%`; });
        catRefs.set(card.dataset.id, { fill, statMap });
      } else {
        catRefs.set(card.dataset.id, { fill: null, statMap });
      }
      card.addEventListener('click', () => {
        if (Array.isArray(c.items) && c.items.length) {
          // Render detail view
          grid.replaceChildren();
          const head = document.createElement('div'); head.className = 'evo-catdetail';
          const hdline = document.createElement('div'); hdline.className = 'hdline';
          const htitle = document.createElement('div'); htitle.className = 'title'; htitle.textContent = c.label || '';
          const hmeta = document.createElement('div'); hmeta.className = 'meta'; hmeta.textContent = c.description || '';
          hdline.appendChild(htitle); hdline.appendChild(hmeta);
          panel.appendChild(head); head.appendChild(hdline);
          const list = document.createElement('div'); list.className = 'list'; head.appendChild(list);
          c.items.forEach((it, i) => {
            const item = document.createElement('div'); item.className = 'evo-item'; item.dataset.id = String(it.id ?? i);
            const ii = document.createElement('div'); ii.className = 'i'; ii.innerHTML = it.icon ? `<i class="${it.icon}"></i>` : '<i class="fa-solid fa-circle"></i>';
            const t = document.createElement('div'); t.className = 't';
            const l = document.createElement('div'); l.className = 'l'; l.textContent = String(it.label ?? ('Item '+(i+1)));
            const d = document.createElement('div'); d.className = 'd'; d.textContent = it.description ? String(it.description) : '';
            t.appendChild(l); if (it.description) t.appendChild(d);
            item.appendChild(ii); item.appendChild(t);
            item.addEventListener('click', () => resolveMenu({ type:'category', categoryId: card.dataset.id, itemId: item.dataset.id }));
            list.appendChild(item);
          });
          const actions = document.createElement('div'); actions.className = 'actions';
          const back = document.createElement('button'); back.className = 'evo-btn'; back.textContent = 'Back';
          actions.appendChild(back);
          head.appendChild(actions);
          back.addEventListener('click', () => { panel.replaceChildren(hd, grid); });
          // Close via header X only
        } else {
          resolveMenu({ type:'category', categoryId: card.dataset.id, itemId: null });
        }
      });
      grid.appendChild(card);
    });

    panel.appendChild(hd);
    panel.appendChild(grid);
    modal.appendChild(panel); modalRoot.appendChild(modal);
  }

  function updateCategory(payload) {
    const id = String(payload.id ?? '');
    const ref = catRefs.get(id);
    if (!ref) return;
    if (payload.progress && ref.fill) {
      const v = Number(payload.progress.value || 0);
      const m = Math.max(1, Number(payload.progress.max || 100));
      const p = Math.max(0, Math.min(1, v / m));
      ref.fill.style.width = `${Math.round(p*100)}%`;
    }
    if (Array.isArray(payload.stats) && ref.statMap) {
      payload.stats.forEach((s, i) => {
        const key = String(s.label || s.key || ('stat'+i));
        const vEl = ref.statMap.get(key);
        if (vEl) vEl.textContent = String(s.value || '');
      });
    }
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action !== 'menuUpdate') return;
    if (data.kind === 'category') return updateCategory(data);
  });
})();
