/**
 * @name MusicMenu
 * @author pagoni meow
 * @description A floating music player inside Discord. Search and play YouTube and SoundCloud tracks directly.
 * @version 1.1.0
 */

module.exports = class MusicMenu {
  constructor() {
    this.dragging = false;
    this.dragOffX = 0;
    this.dragOffY = 0;
    this.player = null;
    this.ytReady = false;
    this.currentSource = "youtube";
    this.queue = [];
    this.queueIdx = -1;
    this.settings = { x: null, y: null, volume: 70 };
    this._move    = this._move.bind(this);
    this._up      = this._up.bind(this);
    this._keydown = this._keydown.bind(this);
    this._themeOb = null;
  }

  getName()        { return "MusicMenu"; }
  getAuthor()      { return "pagoni meow"; }
  getVersion()     { return "1.1.0"; }
  getDescription() { return "Floating music player for YouTube and SoundCloud inside Discord."; }

  load() {
    try { const s = BdApi.Data.load("MusicMenu", "s"); if (s) Object.assign(this.settings, s); } catch(e) {}
    try { const s = BdApi.getData("MusicMenu", "s");  if (s) Object.assign(this.settings, s); } catch(e) {}
  }

  save() {
    try { BdApi.Data.save("MusicMenu", "s", this.settings); } catch(e) {}
    try { BdApi.saveData("MusicMenu", "s", this.settings);  } catch(e) {}
  }

  start() {
    this.load();
    this.injectCSS();
    this.buildPanel();
    this.addToggleBtn();
    this.loadYTApi();
    document.addEventListener("keydown", this._keydown);
    this.watchTheme();
  }

  stop() {
    document.removeEventListener("keydown", this._keydown);
    document.removeEventListener("mousemove", this._move);
    document.removeEventListener("mouseup",   this._up);
    if (this._themeOb) { this._themeOb.disconnect(); this._themeOb = null; }
    if (this.player && this.player.destroy) try { this.player.destroy(); } catch(e) {}
    ["mm-panel","mm-toggle","mm-style"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  _keydown(ev) {
    if (ev.key === "Tab" && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      const active = document.activeElement;
      const tag = active ? active.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (active && active.isContentEditable)) return;
      ev.preventDefault();
      const p = document.getElementById("mm-panel");
      if (!p) { this.buildPanel(); return; }
      p.style.display = p.style.display === "none" ? "" : "none";
    }
  }

  watchTheme() {
    this.applyTheme();
    this._themeOb = new MutationObserver(() => this.applyTheme());
    this._themeOb.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    this._themeOb.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  getThemeColors() {
    const html  = document.documentElement;
    const body  = document.body;
    const cls   = (html.className + " " + body.className).toLowerCase();
    const style = getComputedStyle(html);

    const isLight = cls.includes("theme-light") || cls.includes("light");

    const get = (vars) => {
      for (const v of vars) {
        const val = style.getPropertyValue(v).trim();
        if (val) return val;
      }
      return null;
    };

    const bg      = get(["--background-primary","--bg-base-primary"])    || (isLight ? "#ffffff" : "#313338");
    const bgSec   = get(["--background-secondary","--bg-base-secondary"]) || (isLight ? "#f2f3f5" : "#2b2d31");
    const bgTer   = get(["--background-tertiary","--bg-base-tertiary"])   || (isLight ? "#e3e5e8" : "#1e1f22");
    const txt     = get(["--text-normal"])                                 || (isLight ? "#060607" : "#dbdee1");
    const txtMute = get(["--text-muted"])                                  || (isLight ? "#80848e" : "#80848e");
    const border  = get(["--background-modifier-accent"])                  || (isLight ? "rgba(6,6,7,.08)" : "rgba(255,255,255,.06)");
    const accent  = get(["--brand-500","--brand-experiment"])              || "#5865f2";

    return { bg, bgSec, bgTer, txt, txtMute, border, accent, isLight };
  }

  applyTheme() {
    const c = this.getThemeColors();
    const panel  = document.getElementById("mm-panel");
    const toggle = document.getElementById("mm-toggle");

    const txtAlpha   = c.isLight ? "rgba(0,0,0,.7)"   : "rgba(255,255,255,.8)";
    const mutedAlpha = c.isLight ? "rgba(0,0,0,.4)"   : "rgba(255,255,255,.4)";
    const faintAlpha = c.isLight ? "rgba(0,0,0,.06)"  : "rgba(255,255,255,.06)";
    const hoverAlpha = c.isLight ? "rgba(0,0,0,.08)"  : "rgba(255,255,255,.08)";
    const scrollCol  = c.isLight ? "rgba(0,0,0,.12)"  : "rgba(255,255,255,.08)";

    const vars = [
      "--mm-bg:"      + c.bg,
      "--mm-bg2:"     + c.bgSec,
      "--mm-bg3:"     + c.bgTer,
      "--mm-txt:"     + txtAlpha,
      "--mm-muted:"   + mutedAlpha,
      "--mm-faint:"   + faintAlpha,
      "--mm-hover:"   + hoverAlpha,
      "--mm-border:"  + c.border,
      "--mm-accent:"  + c.accent,
      "--mm-scroll:"  + scrollCol,
    ].join(";");

    if (panel)  panel.setAttribute("style",  (panel.getAttribute("style")  || "").replace(/--mm-[^;]+;?/g,"") + ";" + vars);
    if (toggle) toggle.setAttribute("style", (toggle.getAttribute("style") || "").replace(/--mm-[^;]+;?/g,"") + ";" + vars);

    const styleEl = document.getElementById("mm-style");
    if (styleEl) styleEl.textContent = this.buildCSS();
  }

  loadYTApi() {
    if (window.YT && window.YT.Player) { this.ytReady = true; return; }
    if (document.getElementById("mm-yt-api")) return;
    window.onYouTubeIframeAPIReady = () => { this.ytReady = true; };
    const s = document.createElement("script");
    s.id  = "mm-yt-api";
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }

  buildPanel() {
    const old = document.getElementById("mm-panel");
    if (old) old.remove();

    const x = this.settings.x !== null ? this.settings.x : window.innerWidth  - 340;
    const y = this.settings.y !== null ? this.settings.y : window.innerHeight - 520;

    const panel = document.createElement("div");
    panel.id = "mm-panel";
    panel.style.left = x + "px";
    panel.style.top  = y + "px";

    panel.innerHTML =
      "<div id='mm-hdr'>" +
        "<div id='mm-title'><span id='mm-note'>&#9835;</span><span>MusicMenu</span></div>" +
        "<div id='mm-hbtns'>" +
          "<button class='mm-hbtn' id='mm-min'>\u2212</button>" +
          "<button class='mm-hbtn' id='mm-close'>\u2715</button>" +
        "</div>" +
      "</div>" +
      "<div id='mm-body'>" +
        "<div id='mm-tabs'>" +
          "<button class='mm-tab mm-tab-active' id='mm-tab-yt'>YouTube</button>" +
          "<button class='mm-tab' id='mm-tab-sc'>SoundCloud</button>" +
        "</div>" +
        "<div id='mm-search-row'>" +
          "<input id='mm-search' type='text' placeholder='Search or paste URL\u2026' autocomplete='off' spellcheck='false'>" +
          "<button id='mm-go'>&#9654;</button>" +
        "</div>" +
        "<div id='mm-player-wrap'>" +
          "<div id='mm-yt-wrap'><div id='mm-yt-player'></div></div>" +
          "<div id='mm-sc-wrap' style='display:none'>" +
            "<iframe id='mm-sc-frame' allow='autoplay' scrolling='no' frameborder='no' width='100%' height='166'></iframe>" +
          "</div>" +
        "</div>" +
        "<div id='mm-nowplaying'><span id='mm-np-text'>Nothing playing</span></div>" +
        "<div id='mm-controls'>" +
          "<button class='mm-ctrl' id='mm-prev'>&#9664;&#9664;</button>" +
          "<button class='mm-ctrl mm-play' id='mm-playpause'>&#9654;</button>" +
          "<button class='mm-ctrl' id='mm-next'>&#9654;&#9654;</button>" +
        "</div>" +
        "<div id='mm-vol-row'>" +
          "<span id='mm-vol-icon'>&#128266;</span>" +
          "<input id='mm-vol' type='range' min='0' max='100' value='" + this.settings.volume + "'>" +
          "<span id='mm-vol-val'>" + this.settings.volume + "%</span>" +
        "</div>" +
        "<div id='mm-queue-label'>Queue <span id='mm-tab-hint'>\u21e5 Tab to toggle</span></div>" +
        "<div id='mm-queue'><div class='mm-q-empty'>Search something to add to your queue</div></div>" +
      "</div>";

    document.body.appendChild(panel);

    document.addEventListener("mousemove", this._move);
    document.addEventListener("mouseup",   this._up);

    panel.querySelector("#mm-hdr").addEventListener("mousedown", ev => {
      if (ev.target.classList.contains("mm-hbtn")) return;
      this.dragging = true;
      const r = panel.getBoundingClientRect();
      this.dragOffX = ev.clientX - r.left;
      this.dragOffY = ev.clientY - r.top;
      ev.preventDefault();
    });

    panel.querySelector("#mm-close").addEventListener("click", () => { panel.style.display = "none"; });

    let collapsed = false;
    panel.querySelector("#mm-min").addEventListener("click", () => {
      collapsed = !collapsed;
      const b = document.getElementById("mm-body");
      if (b) b.style.display = collapsed ? "none" : "";
      panel.querySelector("#mm-min").textContent = collapsed ? "\u25a1" : "\u2212";
    });

    panel.querySelector("#mm-tab-yt").addEventListener("click", () => this.switchSource("youtube"));
    panel.querySelector("#mm-tab-sc").addEventListener("click", () => this.switchSource("soundcloud"));

    const searchEl = panel.querySelector("#mm-search");
    const doSearch = () => {
      const q = searchEl.value.trim();
      if (!q) return;
      if (this.currentSource === "youtube") this.handleYT(q);
      else this.handleSC(q);
    };
    panel.querySelector("#mm-go").addEventListener("click", doSearch);
    searchEl.addEventListener("keydown", ev => { if (ev.key === "Enter") doSearch(); });

    panel.querySelector("#mm-playpause").addEventListener("click", () => this.togglePlay());
    panel.querySelector("#mm-next").addEventListener("click",      () => this.playNext());
    panel.querySelector("#mm-prev").addEventListener("click",      () => this.playPrev());

    panel.querySelector("#mm-vol").addEventListener("input", ev => {
      const v = parseInt(ev.target.value);
      this.settings.volume = v;
      this.save();
      document.getElementById("mm-vol-val").textContent = v + "%";
      this.setVolume(v);
    });

    setTimeout(() => this.initYTPlayer(), 1500);
    this.applyTheme();
    this.renderQueue();
  }

  switchSource(src) {
    this.currentSource = src;
    const ytTab  = document.getElementById("mm-tab-yt");
    const scTab  = document.getElementById("mm-tab-sc");
    const ytWrap = document.getElementById("mm-yt-wrap");
    const scWrap = document.getElementById("mm-sc-wrap");
    if (!ytTab || !scTab) return;
    if (src === "youtube") {
      ytTab.classList.add("mm-tab-active"); scTab.classList.remove("mm-tab-active");
      if (ytWrap) ytWrap.style.display = ""; if (scWrap) scWrap.style.display = "none";
    } else {
      scTab.classList.add("mm-tab-active"); ytTab.classList.remove("mm-tab-active");
      if (ytWrap) ytWrap.style.display = "none"; if (scWrap) scWrap.style.display = "";
    }
  }

  initYTPlayer() {
    if (!window.YT || !window.YT.Player) { setTimeout(() => this.initYTPlayer(), 1000); return; }
    try {
      this.player = new window.YT.Player("mm-yt-player", {
        height: "140", width: "100%",
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { this.ytReady = true; this.setVolume(this.settings.volume); },
          onStateChange: ev => {
            if (ev.data === window.YT.PlayerState.ENDED) this.playNext();
            const pp = document.getElementById("mm-playpause");
            if (!pp) return;
            pp.innerHTML = ev.data === window.YT.PlayerState.PLAYING ? "&#9646;&#9646;" : "&#9654;";
          }
        }
      });
    } catch(e) {}
  }

  extractYTId(input) {
    const m = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ||
              input.match(/^([a-zA-Z0-9_-]{11})$/);
    return m ? m[1] : null;
  }

  handleYT(input) {
    const id = this.extractYTId(input);
    if (id) {
      this.addToQueue({ source: "youtube", id, title: "YouTube: " + id });
      if (this.queueIdx === -1) this.playQueueItem(0);
    } else {
      this.setNowPlaying("Searching: " + input + "\u2026");
      fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(input))
        .then(r => r.text())
        .then(html => {
          const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (!m) { this.setNowPlaying("No results found"); return; }
          const id = m[1];
          const tm = html.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
          const title = tm ? tm[1] : "YouTube result";
          this.addToQueue({ source: "youtube", id, title });
          if (this.queueIdx === -1) this.playQueueItem(0);
          else this.renderQueue();
        })
        .catch(() => this.setNowPlaying("Search failed \u2014 try pasting a URL"));
    }
  }

  handleSC(input) {
    if (input.includes("soundcloud.com/")) {
      const title = input.split("/").slice(-2).join(" \u2013 ");
      this.addToQueue({ source: "soundcloud", url: input, title });
      if (this.queueIdx === -1) this.playQueueItem(0);
    } else {
      this.setNowPlaying("Searching SoundCloud: " + input + "\u2026");
      fetch("https://soundcloud.com/search?q=" + encodeURIComponent(input))
        .then(r => r.text())
        .then(html => {
          const m = html.match(/soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(?=")/);
          if (!m) { this.setNowPlaying("No results \u2014 paste a SoundCloud URL"); return; }
          const url   = "https://soundcloud.com/" + m[0].split("soundcloud.com/")[1];
          const title = url.split("/").slice(-2).join(" \u2013 ");
          this.addToQueue({ source: "soundcloud", url, title });
          if (this.queueIdx === -1) this.playQueueItem(0);
          else this.renderQueue();
        })
        .catch(() => this.setNowPlaying("Search failed \u2014 paste a SoundCloud URL"));
    }
  }

  addToQueue(item) { this.queue.push(item); this.renderQueue(); }

  playQueueItem(idx) {
    if (idx < 0 || idx >= this.queue.length) return;
    this.queueIdx = idx;
    const item = this.queue[idx];
    this.setNowPlaying(item.title);
    this.renderQueue();
    if (item.source === "youtube") {
      this.switchSource("youtube");
      if (this.player && this.player.loadVideoById) {
        try { this.player.loadVideoById(item.id); this.setVolume(this.settings.volume); } catch(e) {}
      }
    } else {
      this.switchSource("soundcloud");
      const frame = document.getElementById("mm-sc-frame");
      if (frame) {
        frame.src = "https://w.soundcloud.com/player/?url=" + encodeURIComponent(item.url) +
          "&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false";
      }
    }
  }

  playNext() {
    if (!this.queue.length) return;
    this.playQueueItem((this.queueIdx + 1) % this.queue.length);
  }

  playPrev() {
    if (!this.queue.length) return;
    this.playQueueItem((this.queueIdx - 1 + this.queue.length) % this.queue.length);
  }

  togglePlay() {
    if (this.currentSource !== "youtube" || !this.player) return;
    try {
      const state = this.player.getPlayerState();
      if (state === 1) this.player.pauseVideo();
      else             this.player.playVideo();
    } catch(e) {}
  }

  setVolume(v) {
    if (this.player && this.player.setVolume) try { this.player.setVolume(v); } catch(e) {}
  }

  setNowPlaying(text) {
    const el = document.getElementById("mm-np-text");
    if (el) el.textContent = text;
  }

  renderQueue() {
    const el = document.getElementById("mm-queue");
    if (!el) return;
    if (!this.queue.length) {
      el.innerHTML = "<div class='mm-q-empty'>Search something to add to your queue</div>";
      return;
    }
    el.innerHTML = this.queue.map((item, i) =>
      "<div class='mm-q-item" + (i === this.queueIdx ? " mm-q-active" : "") + "' data-idx='" + i + "'>" +
        "<span class='mm-q-src'>" + (item.source === "youtube" ? "YT" : "SC") + "</span>" +
        "<span class='mm-q-title'>" + this.esc(item.title) + "</span>" +
        "<button class='mm-q-rm' data-idx='" + i + "'>\u2715</button>" +
      "</div>"
    ).join("");
    el.querySelectorAll(".mm-q-item").forEach(row => {
      row.addEventListener("click", ev => {
        if (ev.target.classList.contains("mm-q-rm")) return;
        this.playQueueItem(parseInt(row.dataset.idx));
      });
    });
    el.querySelectorAll(".mm-q-rm").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        this.queue.splice(idx, 1);
        if (this.queueIdx >= idx) this.queueIdx = Math.max(-1, this.queueIdx - 1);
        this.renderQueue();
      });
    });
  }

  esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  addToggleBtn() {
    const old = document.getElementById("mm-toggle");
    if (old) old.remove();
    const btn = document.createElement("div");
    btn.id    = "mm-toggle";
    btn.title = "MusicMenu (Tab)";
    btn.innerHTML = "<svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z'/></svg>";
    btn.addEventListener("click", () => {
      const p = document.getElementById("mm-panel");
      if (!p) { this.buildPanel(); return; }
      p.style.display = p.style.display === "none" ? "" : "none";
    });
    document.body.appendChild(btn);
    this.applyTheme();
  }

  _move(ev) {
    if (!this.dragging) return;
    const p = document.getElementById("mm-panel"); if (!p) return;
    p.style.left = Math.max(0, Math.min(window.innerWidth  - p.offsetWidth,  ev.clientX - this.dragOffX)) + "px";
    p.style.top  = Math.max(0, Math.min(window.innerHeight - p.offsetHeight, ev.clientY - this.dragOffY)) + "px";
  }

  _up() {
    if (!this.dragging) return;
    this.dragging = false;
    const p = document.getElementById("mm-panel"); if (!p) return;
    const r = p.getBoundingClientRect();
    this.settings.x = Math.round(r.left);
    this.settings.y = Math.round(r.top);
    this.save();
  }

  buildCSS() {
    return [
      "#mm-panel{position:fixed;width:320px;background:var(--mm-bg,#313338);border:1px solid var(--mm-border,rgba(255,255,255,.08));",
      "border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.5);z-index:9000;overflow:hidden;",
      "font-family:'gg sans','Noto Sans',sans-serif;transition:background .2s,border-color .2s;}",

      "#mm-hdr{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;",
      "cursor:grab;background:var(--mm-faint,rgba(255,255,255,.03));border-bottom:1px solid var(--mm-border,rgba(255,255,255,.06));}",
      "#mm-hdr:active{cursor:grabbing;}",
      "#mm-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;",
      "letter-spacing:.5px;color:var(--mm-txt,rgba(255,255,255,.8));}",
      "#mm-note{color:var(--mm-accent,#5865f2);font-size:16px;animation:mm-bounce .8s ease-in-out infinite alternate;}",
      "@keyframes mm-bounce{from{transform:translateY(0)}to{transform:translateY(-3px)}}",
      "#mm-hbtns{display:flex;gap:4px;}",
      ".mm-hbtn{background:var(--mm-faint,rgba(255,255,255,.06));border:none;border-radius:4px;",
      "color:var(--mm-muted);cursor:pointer;width:22px;height:22px;font-size:12px;",
      "display:flex;align-items:center;justify-content:center;padding:0;transition:all .15s;}",
      ".mm-hbtn:hover{background:var(--mm-hover);color:var(--mm-txt);}",

      "#mm-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:var(--mm-bg);}",

      "#mm-tabs{display:flex;gap:6px;}",
      ".mm-tab{flex:1;padding:6px;background:var(--mm-faint);border:1px solid var(--mm-border);",
      "border-radius:6px;color:var(--mm-muted);cursor:pointer;font-size:12px;font-weight:600;",
      "font-family:inherit;transition:all .15s;}",
      ".mm-tab:hover{background:var(--mm-hover);color:var(--mm-txt);}",
      ".mm-tab-active{background:var(--mm-bg2);border-color:var(--mm-accent);color:var(--mm-accent);}",

      "#mm-search-row{display:flex;gap:6px;}",
      "#mm-search{flex:1;padding:8px 10px;background:var(--mm-bg2);border:1px solid var(--mm-border);",
      "border-radius:7px;color:var(--mm-txt);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;}",
      "#mm-search:focus{border-color:var(--mm-accent);}",
      "#mm-search::placeholder{color:var(--mm-muted);}",
      "#mm-go{padding:0 12px;background:var(--mm-accent);border:none;border-radius:7px;color:#fff;",
      "cursor:pointer;font-size:14px;font-weight:700;transition:opacity .15s;}",
      "#mm-go:hover{opacity:.85;}",

      "#mm-yt-wrap{border-radius:8px;overflow:hidden;background:#000;}",
      "#mm-yt-player{width:100%;height:140px;}",
      "#mm-sc-wrap{border-radius:8px;overflow:hidden;}",

      "#mm-nowplaying{background:var(--mm-bg2);border:1px solid var(--mm-border);",
      "border-radius:7px;padding:7px 10px;font-size:11px;color:var(--mm-muted);",
      "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
      "#mm-nowplaying::before{content:'\\266B  ';color:var(--mm-accent);}",

      "#mm-controls{display:flex;align-items:center;justify-content:center;gap:8px;}",
      ".mm-ctrl{background:var(--mm-faint);border:1px solid var(--mm-border);",
      "border-radius:8px;color:var(--mm-muted);cursor:pointer;width:36px;height:36px;",
      "font-size:11px;display:flex;align-items:center;justify-content:center;",
      "font-family:inherit;transition:all .15s;}",
      ".mm-ctrl:hover{background:var(--mm-hover);color:var(--mm-txt);}",
      ".mm-play{width:44px;height:44px;font-size:14px;border-color:var(--mm-accent);color:var(--mm-accent);}",
      ".mm-play:hover{background:var(--mm-bg2);}",

      "#mm-vol-row{display:flex;align-items:center;gap:8px;}",
      "#mm-vol-icon{font-size:14px;color:var(--mm-muted);flex-shrink:0;}",
      "#mm-vol{flex:1;accent-color:var(--mm-accent);cursor:pointer;}",
      "#mm-vol-val{font-size:11px;color:var(--mm-muted);min-width:30px;text-align:right;}",

      "#mm-queue-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;",
      "color:var(--mm-muted);display:flex;align-items:center;justify-content:space-between;}",
      "#mm-tab-hint{font-size:9px;font-weight:400;letter-spacing:.3px;color:var(--mm-muted);opacity:.6;text-transform:none;}",
      "#mm-queue{max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;",
      "scrollbar-width:thin;scrollbar-color:var(--mm-scroll,rgba(255,255,255,.07)) transparent;}",
      ".mm-q-empty{font-size:11px;color:var(--mm-muted);padding:8px 0;text-align:center;opacity:.6;}",
      ".mm-q-item{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:5px;",
      "cursor:pointer;background:var(--mm-faint);transition:background .1s;}",
      ".mm-q-item:hover{background:var(--mm-hover);}",
      ".mm-q-active{background:var(--mm-bg2);border:1px solid var(--mm-accent);}",
      ".mm-q-src{font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;",
      "background:var(--mm-bg3);color:var(--mm-accent);flex-shrink:0;}",
      ".mm-q-title{flex:1;font-size:11px;color:var(--mm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
      ".mm-q-rm{background:none;border:none;color:var(--mm-muted);cursor:pointer;",
      "font-size:10px;flex-shrink:0;padding:2px 4px;border-radius:3px;transition:all .1s;opacity:.5;}",
      ".mm-q-rm:hover{background:rgba(255,60,60,.2);color:#ff6060;opacity:1;}",

      "#mm-toggle{position:fixed;bottom:68px;left:8px;width:34px;height:34px;",
      "background:var(--mm-bg,#313338);border:1px solid var(--mm-border,rgba(255,255,255,.1));border-radius:8px;",
      "display:flex;align-items:center;justify-content:center;cursor:pointer;",
      "z-index:8999;color:var(--mm-muted);transition:all .15s;}",
      "#mm-toggle:hover{color:var(--mm-accent);border-color:var(--mm-accent);}",
    ].join("");
  }

  injectCSS() {
    const old = document.getElementById("mm-style");
    if (old) old.remove();
    const s = document.createElement("style");
    s.id = "mm-style";
    s.textContent = this.buildCSS();
    document.head.appendChild(s);
  }

  getSettingsPanel() {
    const wrap = document.createElement("div");
    wrap.style.cssText = "padding:16px;color:var(--text-normal);font-family:var(--font-primary);max-width:420px;";
    const note = document.createElement("p");
    note.textContent = "Use the floating panel to search and play music. Press Tab anywhere in Discord to toggle it open or closed. The panel colors adapt automatically to your Discord theme.";
    note.style.cssText = "font-size:14px;line-height:1.6;color:var(--text-muted);margin-bottom:12px;";
    const rst = document.createElement("button");
    rst.textContent = "Reset Panel Position";
    rst.style.cssText = "padding:7px 14px;background:rgba(255,255,255,.07);color:var(--text-normal);border:1px solid rgba(255,255,255,.1);border-radius:4px;cursor:pointer;font-size:13px;";
    rst.addEventListener("click", () => {
      this.settings.x = null; this.settings.y = null; this.save();
      const p = document.getElementById("mm-panel"); if (p) p.remove();
      this.buildPanel();
    });
    wrap.appendChild(note);
    wrap.appendChild(rst);
    return wrap;
  }
};
