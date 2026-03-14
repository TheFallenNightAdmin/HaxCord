/**
 * @name DiscordMenu
 * @author pagoni meow
 * @description Music player (Alt + M) + Theme switcher (Esc) in one plugin.
 * @version 1.0.4
 */

module.exports = (() => {

    function hexToRgb(hex) {
        const m = hex.replace('#','').match(/.{2}/g);
        return m ? m.map(x => parseInt(x,16)) : [136,136,136];
    }
    function withAlpha(hex, a) {
        const [r,g,b] = hexToRgb(hex);
        return `rgba(${r},${g},${b},${a})`;
    }

    const THEME_CSS = `
        #ts-overlay {
            display: none; position: fixed; inset: 0; z-index: 9999;
            background: rgba(0,0,0,0.72); backdrop-filter: blur(6px) saturate(0.7);
            align-items: center; justify-content: center;
        }
        #ts-overlay.ts-open {
            display: flex;
            animation: ts-fadein 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes ts-fadein {
            from { opacity:0; transform:scale(0.93) translateY(-10px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
        }
        #ts-panel {
            width: 280px; max-height: 480px; display: flex; flex-direction: column;
            border-radius: 6px; overflow: hidden; background: #0d0d0d;
            border: 1px solid #2a2a2a;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.9), 0 20px 60px rgba(0,0,0,0.95), 0 0 40px rgba(255,255,255,0.03);
            font-family: 'Share Tech Mono','Fira Code','Courier New',monospace;
        }
        #ts-header {
            flex-shrink: 0; padding: 10px 14px 9px; display: flex; align-items: center;
            justify-content: space-between; border-bottom: 1px solid #1e1e1e; background: #0a0a0a;
        }
        #ts-header-left { display: flex; align-items: center; gap: 7px; }
        #ts-header-icon { width:14px; height:14px; opacity:0.8; }
        #ts-title { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #aaaaaa; }
        #ts-version { font-size: 8px; opacity: 0.3; letter-spacing: 0.1em; color: #888; margin-left: 4px; }
        #ts-close {
            width:18px; height:18px; border-radius: 3px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: #444; font-size: 14px; transition: color 0.1s, background 0.1s; line-height: 1; user-select: none;
        }
        #ts-close:hover { color:#ccc; background:rgba(255,255,255,0.06); }
        #ts-active-bar {
            flex-shrink: 0; padding: 5px 14px; font-size: 9px; letter-spacing: 0.14em;
            text-transform: uppercase; color: #333; background: #0a0a0a;
            border-bottom: 1px solid #161616; display: flex; align-items: center; gap: 6px; min-height: 26px;
        }
        #ts-active-dot {
            width:5px; height:5px; border-radius: 50%; background: #333; flex-shrink: 0;
            transition: background 0.2s, box-shadow 0.2s;
        }
        #ts-active-label { transition: color 0.2s; }
        #ts-search-wrap { padding: 8px 10px; border-bottom: 1px solid #161616; background: #0a0a0a; flex-shrink: 0; }
        #ts-search {
            width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.04);
            border: 1px solid #222; border-radius: 3px; padding: 5px 9px; color: #ccc;
            font-family: inherit; font-size: 10px; letter-spacing: 0.06em; outline: none; transition: border-color 0.15s;
        }
        #ts-search::placeholder { color:#333; }
        #ts-search:focus { border-color:#444; }
        #ts-list { overflow-y: auto; flex: 1; padding: 4px 0; }
        #ts-list::-webkit-scrollbar { width:3px; }
        #ts-list::-webkit-scrollbar-track { background:transparent; }
        #ts-list::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
        .ts-row {
            display: flex; align-items: center; gap: 10px; padding: 8px 14px;
            cursor: pointer; border-left: 2px solid transparent; user-select: none;
            transition: background 0.08s, border-color 0.1s;
        }
        .ts-row:hover { background:rgba(255,255,255,0.03); }
        .ts-row.ts-active { background:rgba(255,255,255,0.05); }
        .ts-dot { width:8px; height:8px; border-radius: 50%; flex-shrink: 0; transition: box-shadow 0.2s; }
        .ts-row:not(.ts-active) .ts-dot { opacity:0.55; }
        .ts-row.ts-active .ts-dot { opacity:1; }
        .ts-name { flex: 1; font-size: 11px; letter-spacing: 0.06em; color: #777; transition: color 0.1s, text-shadow 0.2s; }
        .ts-row.ts-active .ts-name { color:#dddddd; }
        .ts-row:hover:not(.ts-active) .ts-name { color:#999; }
        .ts-badge {
            font-size: 8px; letter-spacing: 0.12em; padding: 1px 5px; border-radius: 2px;
            border: 1px solid #222; color: #333; text-transform: uppercase; opacity: 0; transition: opacity 0.15s;
        }
        .ts-row.ts-active .ts-badge { opacity:1; }
        .ts-check {
            width:14px; height:14px; border-radius: 2px; border: 1px solid #252525; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 9px; color: transparent; transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .ts-row.ts-active .ts-check { color:#000; }
        #ts-footer {
            flex-shrink: 0; padding: 7px 14px; border-top: 1px solid #141414; background: #080808;
            display: flex; align-items: center; justify-content: space-between;
        }
        .ts-footer-text { font-size: 8px; letter-spacing: 0.12em; color: #252525; text-transform: uppercase; }
        #ts-reset { font-size: 8px; letter-spacing: 0.12em; color: #333; cursor: pointer; text-transform: uppercase; transition: color 0.1s; }
        #ts-reset:hover { color:#888; }
        #ts-pill {
            position: fixed; bottom: 16px; left: 16px; z-index: 9998;
            display: flex; align-items: center; gap: 6px;
            padding: 4px 11px 4px 8px; border-radius: 3px; cursor: pointer;
            font-family: 'Share Tech Mono',monospace; font-size: 9px; letter-spacing: 0.12em;
            text-transform: uppercase; user-select: none; background: #0c0c0c;
            border: 1px solid #1e1e1e; color: #444;
            transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
        }
        #ts-pill:hover { color:#aaa; border-color:#333; box-shadow:0 0 12px rgba(0,0,0,0.6); }
        #ts-pill-dot { width:5px; height:5px; border-radius: 50%; background: #2a2a2a; flex-shrink: 0; transition: background 0.25s, box-shadow 0.25s; }
    `;

    return class DiscordMenu {
        constructor() {
            this._activeName = null;
            this._menuOpen   = false;
            this._keyHandler = null;
            this._tsObserver = null;
            this._styleKey   = 'DiscordMenu-styles';

            this.dragging     = false;
            this.dragOffX     = 0;
            this.dragOffY     = 0;
            this.player       = null;
            this.ytReady      = false;
            this.currentSource = "youtube";
            this.queue        = [];
            this.queueIdx     = -1;
            this.settings     = { x: null, y: null, volume: 70 };
            this._mmMove      = this._mmMove.bind(this);
            this._mmUp        = this._mmUp.bind(this);
            this._themeOb     = null;

            try { this._activeName = BdApi.Data.load('DiscordMenu','activeName') || null; } catch(e) {}
        }

        getName()        { return "DiscordMenu"; }
        getAuthor()      { return "pagoni meow"; }
        getVersion()     { return "1.0.0"; }
        getDescription() { return "Music player (Tab) + Theme switcher (Esc) in one plugin."; }

        load() {
            try { const s = BdApi.Data.load("DiscordMenu","mmSettings"); if (s) Object.assign(this.settings, s); } catch(e) {}
        }

        save() {
            try { BdApi.Data.save("DiscordMenu","mmSettings", this.settings); } catch(e) {}
        }

        start() {
            this.load();

            try { BdApi.DOM.addStyle(this._styleKey, THEME_CSS); } catch(e) {
                try { BdApi.injectCSS(this._styleKey, THEME_CSS); } catch(e) {}
            }

            this._mmInjectCSS();
            this._buildPill();
            this._buildOverlay();
            this._mmBuildPanel();
            this._mmAddToggleBtn();
            this._mmLoadYTApi();
            this._mmWatchTheme();

            this._keyHandler = e => this._onKey(e);
            document.addEventListener('keydown', this._keyHandler, true);

            this._tsObserver = new MutationObserver(() => {
                if (!document.getElementById('ts-pill'))    this._buildPill();
                if (!document.getElementById('ts-overlay')) this._buildOverlay();
            });
            this._tsObserver.observe(document.body, { childList: true, subtree: false });

            if (this._activeName) {
                const themes = this._getThemes();
                if (themes.find(t => t.name === this._activeName)) {
                    this._applyTheme(this._activeName, true);
                } else {
                    
                    this._activeName = null;
                    try { BdApi.Data.save('DiscordMenu','activeName', null); } catch(e) {}
                }
            }
            this._syncUI();
        }

        stop() {
            document.removeEventListener('keydown', this._keyHandler, true);
            document.removeEventListener('mousemove', this._mmMove);
            document.removeEventListener('mouseup',   this._mmUp);

            if (this._tsObserver) { this._tsObserver.disconnect(); this._tsObserver = null; }
            if (this._themeOb)    { this._themeOb.disconnect();    this._themeOb = null; }
            if (this.player && this.player.destroy) try { this.player.destroy(); } catch(e) {}

            try { BdApi.DOM.removeStyle(this._styleKey); } catch(e) {
                try { BdApi.clearCSS(this._styleKey); } catch(e) {}
            }

            ['ts-overlay','ts-pill','mm-panel','mm-toggle','mm-style'].forEach(id => {
                document.getElementById(id)?.remove();
            });
        }

        _onKey(e) {
            const active = document.activeElement;
            const tag    = active ? active.tagName : '';
            const typing = tag === 'TEXTAREA' || (active && active.isContentEditable);

            if (e.key === 'Escape') {
                if (this._menuOpen) {
                    e.stopPropagation();
                    this._closeMenu();
                    return;
                }
                if (document.querySelector('[class*="modal-"],[class*="popout-"],[class*="layer-"]')) return;
                e.stopPropagation();
                this._openMenu();
                return;
            }

            if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (tag === 'INPUT' || typing) return;
                e.preventDefault();
                const p = document.getElementById('mm-panel');
                if (!p) { this._mmBuildPanel(); return; }
                p.style.display = p.style.display === 'none' ? '' : 'none';
            }
        }

        _getThemes() {
            try {
                return (BdApi.Themes.getAll() || []).map(t => ({
                    name: t.name || t.getName?.() || 'Unknown',
                    color: '#4AEF98'
                }));
            } catch(e) { return []; }
        }

        _applyTheme(name, silent = false) {
            const themes = this._getThemes();
            const entry  = themes.find(t => t.name === name);
            if (!entry) {
                this._activeName = null;
                try { BdApi.Data.save('DiscordMenu','activeName', null); } catch(e) {}
                this._syncUI(); return;
            }

            themes.forEach(t => {
                try {
                    if (t.name === name) BdApi.Themes.enable(t.name);
                    else BdApi.Themes.disable(t.name);
                } catch(_) {}
            });
            this._activeName = name;
            try { BdApi.Data.save('DiscordMenu','activeName', name); } catch(e) {}
            this._syncUI();
            if (!silent) try { BdApi.UI.showToast(`Theme: ${name}`, { type:'success', timeout:2000 }); } catch(e) {}
        }

        _resetTheme() {
            const themes = this._getThemes();
            themes.forEach(t => { try { BdApi.Themes.disable(t.name); } catch(_) {} });
            this._activeName = null;
            try { BdApi.Data.save('DiscordMenu','activeName', null); } catch(e) {}
            this._syncUI();
            try { BdApi.UI.showToast('Theme reset.', { type:'info', timeout:2000 }); } catch(e) {}
        }

        _buildPill() {
            if (document.getElementById('ts-pill')) return;
            const pill = document.createElement('div');
            pill.id = 'ts-pill';
            pill.innerHTML = '<div id="ts-pill-dot"></div><span id="ts-pill-label">themes</span>';
            pill.addEventListener('click', () => this._toggleMenu());
            document.body.appendChild(pill);
            this._syncUI();
        }

        _buildOverlay() {
            if (document.getElementById('ts-overlay')) return;
            const overlay = document.createElement('div');
            overlay.id = 'ts-overlay';
            overlay.addEventListener('click', e => { if (e.target === overlay) this._closeMenu(); });

            const panel = document.createElement('div');
            panel.id = 'ts-panel';

            const header = document.createElement('div');
            header.id = 'ts-header';
            header.innerHTML = `
                <div id="ts-header-left">
                    <svg id="ts-header-icon" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="7" cy="7" r="5.5" stroke="#555" stroke-width="1"/>
                        <circle cx="7" cy="7" r="2" fill="#555"/>
                        <line x1="7" y1="1.5" x2="7" y2="3.5" stroke="#555" stroke-width="1"/>
                        <line x1="7" y1="10.5" x2="7" y2="12.5" stroke="#555" stroke-width="1"/>
                        <line x1="1.5" y1="7" x2="3.5" y2="7" stroke="#555" stroke-width="1"/>
                        <line x1="10.5" y1="7" x2="12.5" y2="7" stroke="#555" stroke-width="1"/>
                    </svg>
                    <span id="ts-title">Theme Switcher</span>
                    <span id="ts-version">v1.0.0</span>
                </div>
                <div id="ts-close" title="Close (ESC)">\u00d7</div>
            `;
            header.querySelector('#ts-close').addEventListener('click', () => this._closeMenu());
            panel.appendChild(header);

            const activeBar = document.createElement('div');
            activeBar.id = 'ts-active-bar';
            activeBar.innerHTML = '<div id="ts-active-dot"></div><span id="ts-active-label">no theme active</span>';
            panel.appendChild(activeBar);

            const searchWrap = document.createElement('div');
            searchWrap.id = 'ts-search-wrap';
            const search = document.createElement('input');
            search.id = 'ts-search'; search.type = 'text'; search.placeholder = 'search themes\u2026';
            search.addEventListener('input', () => this._filterRows(search.value));
            searchWrap.appendChild(search);
            panel.appendChild(searchWrap);

            const list = document.createElement('div');
            list.id = 'ts-list';
            this._getThemes().forEach(t => list.appendChild(this._makeRow(t)));
            panel.appendChild(list);

            const footer = document.createElement('div');
            footer.id = 'ts-footer';
            footer.innerHTML = `<span class="ts-footer-text">${this._getThemes().length} themes \u00b7 esc to close</span><span id="ts-reset">Reset</span>`;
            footer.querySelector('#ts-reset').addEventListener('click', () => this._resetTheme());
            panel.appendChild(footer);

            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            this._syncUI();
        }

        _makeRow(theme) {
            const row = document.createElement('div');
            row.className = 'ts-row'; row.dataset.name = theme.name;
            const dot = document.createElement('div');
            dot.className = 'ts-dot'; dot.style.background = theme.color; dot.style.boxShadow = `0 0 6px ${theme.color}`;
            const name = document.createElement('span');
            name.className = 'ts-name'; name.textContent = theme.name;
            const badge = document.createElement('span');
            badge.className = 'ts-badge'; badge.textContent = 'active';
            badge.style.borderColor = withAlpha(theme.color, 0.3); badge.style.color = theme.color;
            const check = document.createElement('div');
            check.className = 'ts-check'; check.textContent = '\u2713';
            row.appendChild(dot); row.appendChild(name); row.appendChild(badge); row.appendChild(check);
            row.addEventListener('click', () => {
                if (this._activeName === theme.name) this._resetTheme();
                else this._applyTheme(theme.name);
            });
            return row;
        }

        _syncUI() {
            const themes = this._getThemes();
            const entry  = themes.find(t => t.name === this._activeName) || null;
            const color  = entry ? entry.color : null;
            document.querySelectorAll('.ts-row').forEach(row => {
                const active = row.dataset.name === this._activeName;
                row.classList.toggle('ts-active', active);
                const c = themes.find(t => t.name === row.dataset.name)?.color || '#888';
                if (active) {
                    row.style.borderLeftColor = c;
                    const ck = row.querySelector('.ts-check');
                    if (ck) { ck.style.background = c; ck.style.borderColor = c; }
                } else {
                    row.style.borderLeftColor = 'transparent';
                    const ck = row.querySelector('.ts-check');
                    if (ck) { ck.style.background = ''; ck.style.borderColor = ''; }
                }
            });
            const dot = document.getElementById('ts-active-dot');
            const lbl = document.getElementById('ts-active-label');
            if (dot && lbl) {
                if (color) { dot.style.background = color; dot.style.boxShadow = `0 0 6px ${color}`; lbl.style.color = color; lbl.textContent = this._activeName; }
                else       { dot.style.background = '#333'; dot.style.boxShadow = 'none'; lbl.style.color = '#333'; lbl.textContent = 'no theme active'; }
            }
            const pd = document.getElementById('ts-pill-dot');
            const pl = document.getElementById('ts-pill-label');
            if (pd && pl) {
                if (color) { pd.style.background = color; pd.style.boxShadow = `0 0 5px ${color}`; pl.textContent = this._activeName; }
                else       { pd.style.background = '#2a2a2a'; pd.style.boxShadow = 'none'; pl.textContent = 'themes'; }
            }
        }

        _filterRows(query) {
            const q = query.trim().toLowerCase();
            document.querySelectorAll('.ts-row').forEach(row => {
                row.style.display = (!q || row.dataset.name.toLowerCase().includes(q)) ? '' : 'none';
            });
        }

        _openMenu() {
            this._buildOverlay();
            const list = document.getElementById('ts-list');
            if (list) { list.innerHTML = ''; this._getThemes().forEach(t => list.appendChild(this._makeRow(t))); }
            const o = document.getElementById('ts-overlay');
            const s = document.getElementById('ts-search');
            if (o) { o.classList.add('ts-open'); this._menuOpen = true; }
            if (s) { s.value = ''; this._filterRows(''); setTimeout(() => s.focus(), 80); }
            this._syncUI();
        }

        _closeMenu() {
            const o = document.getElementById('ts-overlay');
            if (o) { o.classList.remove('ts-open'); this._menuOpen = false; }
        }

        _toggleMenu() {
            if (this._menuOpen) this._closeMenu(); else this._openMenu();
        }

        _mmLoadYTApi() {
            if (window.YT && window.YT.Player) { this.ytReady = true; return; }
            if (document.getElementById('mm-yt-api')) return;
            window.onYouTubeIframeAPIReady = () => { this.ytReady = true; };
            const s = document.createElement('script');
            s.id = 'mm-yt-api';
            s.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(s);
        }

        _mmBuildPanel() {
            const old = document.getElementById('mm-panel');
            if (old) old.remove();
            const x = this.settings.x !== null ? this.settings.x : window.innerWidth  - 340;
            const y = this.settings.y !== null ? this.settings.y : window.innerHeight - 520;
            const panel = document.createElement('div');
            panel.id = 'mm-panel';
            panel.style.left = x + 'px';
            panel.style.top  = y + 'px';
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
            document.addEventListener('mousemove', this._mmMove);
            document.addEventListener('mouseup',   this._mmUp);
            panel.querySelector('#mm-hdr').addEventListener('mousedown', ev => {
                if (ev.target.classList.contains('mm-hbtn')) return;
                this.dragging = true;
                const r = panel.getBoundingClientRect();
                this.dragOffX = ev.clientX - r.left; this.dragOffY = ev.clientY - r.top;
                ev.preventDefault();
            });
            panel.querySelector('#mm-close').addEventListener('click', () => { panel.style.display = 'none'; });
            let collapsed = false;
            panel.querySelector('#mm-min').addEventListener('click', () => {
                collapsed = !collapsed;
                const b = document.getElementById('mm-body');
                if (b) b.style.display = collapsed ? 'none' : '';
                panel.querySelector('#mm-min').textContent = collapsed ? '\u25a1' : '\u2212';
            });
            panel.querySelector('#mm-tab-yt').addEventListener('click', () => this._mmSwitch('youtube'));
            panel.querySelector('#mm-tab-sc').addEventListener('click', () => this._mmSwitch('soundcloud'));
            const searchEl = panel.querySelector('#mm-search');
            const doSearch = () => {
                const q = searchEl.value.trim(); if (!q) return;
                if (this.currentSource === 'youtube') this._mmHandleYT(q);
                else this._mmHandleSC(q);
            };
            panel.querySelector('#mm-go').addEventListener('click', doSearch);
            searchEl.addEventListener('keydown', ev => { if (ev.key === 'Enter') doSearch(); });
            panel.querySelector('#mm-playpause').addEventListener('click', () => this._mmTogglePlay());
            panel.querySelector('#mm-next').addEventListener('click',      () => this._mmNext());
            panel.querySelector('#mm-prev').addEventListener('click',      () => this._mmPrev());
            panel.querySelector('#mm-vol').addEventListener('input', ev => {
                const v = parseInt(ev.target.value);
                this.settings.volume = v; this.save();
                document.getElementById('mm-vol-val').textContent = v + '%';
                this._mmSetVol(v);
            });
            setTimeout(() => this._mmInitPlayer(), 1500);
            this._mmApplyTheme();
            this._mmRenderQueue();
        }

        _mmSwitch(src) {
            this.currentSource = src;
            const ytTab  = document.getElementById('mm-tab-yt');
            const scTab  = document.getElementById('mm-tab-sc');
            const ytWrap = document.getElementById('mm-yt-wrap');
            const scWrap = document.getElementById('mm-sc-wrap');
            if (!ytTab || !scTab) return;
            if (src === 'youtube') {
                ytTab.classList.add('mm-tab-active'); scTab.classList.remove('mm-tab-active');
                if (ytWrap) ytWrap.style.display = ''; if (scWrap) scWrap.style.display = 'none';
            } else {
                scTab.classList.add('mm-tab-active'); ytTab.classList.remove('mm-tab-active');
                if (ytWrap) ytWrap.style.display = 'none'; if (scWrap) scWrap.style.display = '';
            }
        }

        _mmInitPlayer() {
            if (!window.YT || !window.YT.Player) { setTimeout(() => this._mmInitPlayer(), 1000); return; }
            try {
                this.player = new window.YT.Player('mm-yt-player', {
                    height: '140', width: '100%',
                    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
                    events: {
                        onReady: () => { this.ytReady = true; this._mmSetVol(this.settings.volume); },
                        onStateChange: ev => {
                            if (ev.data === window.YT.PlayerState.ENDED) this._mmNext();
                            const pp = document.getElementById('mm-playpause');
                            if (!pp) return;
                            pp.innerHTML = ev.data === window.YT.PlayerState.PLAYING ? '&#9646;&#9646;' : '&#9654;';
                        }
                    }
                });
            } catch(e) {}
        }

        _mmExtractYTId(input) {
            const m = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ||
                      input.match(/^([a-zA-Z0-9_-]{11})$/);
            return m ? m[1] : null;
        }

        _mmHandleYT(input) {
            const id = this._mmExtractYTId(input);
            if (id) {
                this._mmAddQueue({ source: 'youtube', id, title: 'YouTube: ' + id });
                if (this.queueIdx === -1) this._mmPlay(0);
            } else {
                this._mmNP('Searching: ' + input + '\u2026');
                fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(input))
                    .then(r => r.text())
                    .then(html => {
                        const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                        if (!m) { this._mmNP('No results found'); return; }
                        const id = m[1];
                        const tm = html.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
                        const title = tm ? tm[1] : 'YouTube result';
                        this._mmAddQueue({ source: 'youtube', id, title });
                        if (this.queueIdx === -1) this._mmPlay(0); else this._mmRenderQueue();
                    })
                    .catch(() => this._mmNP('Search failed \u2014 try pasting a URL'));
            }
        }

        _mmHandleSC(input) {
            if (input.includes('soundcloud.com/')) {
                const title = input.split('/').slice(-2).join(' \u2013 ');
                this._mmAddQueue({ source: 'soundcloud', url: input, title });
                if (this.queueIdx === -1) this._mmPlay(0);
            } else {
                this._mmNP('Searching SoundCloud: ' + input + '\u2026');
                fetch('https://soundcloud.com/search?q=' + encodeURIComponent(input))
                    .then(r => r.text())
                    .then(html => {
                        const m = html.match(/soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(?=")/);
                        if (!m) { this._mmNP('No results \u2014 paste a SoundCloud URL'); return; }
                        const url   = 'https://soundcloud.com/' + m[0].split('soundcloud.com/')[1];
                        const title = url.split('/').slice(-2).join(' \u2013 ');
                        this._mmAddQueue({ source: 'soundcloud', url, title });
                        if (this.queueIdx === -1) this._mmPlay(0); else this._mmRenderQueue();
                    })
                    .catch(() => this._mmNP('Search failed \u2014 paste a SoundCloud URL'));
            }
        }

        _mmAddQueue(item) { this.queue.push(item); this._mmRenderQueue(); }

        _mmPlay(idx) {
            if (idx < 0 || idx >= this.queue.length) return;
            this.queueIdx = idx;
            const item = this.queue[idx];
            this._mmNP(item.title);
            this._mmRenderQueue();
            if (item.source === 'youtube') {
                this._mmSwitch('youtube');
                if (this.player && this.player.loadVideoById) {
                    try { this.player.loadVideoById(item.id); this._mmSetVol(this.settings.volume); } catch(e) {}
                }
            } else {
                this._mmSwitch('soundcloud');
                const frame = document.getElementById('mm-sc-frame');
                if (frame) {
                    frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(item.url) +
                        '&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false';
                }
            }
        }

        _mmNext() { if (this.queue.length) this._mmPlay((this.queueIdx + 1) % this.queue.length); }
        _mmPrev() { if (this.queue.length) this._mmPlay((this.queueIdx - 1 + this.queue.length) % this.queue.length); }

        _mmTogglePlay() {
            if (this.currentSource !== 'youtube' || !this.player) return;
            try {
                if (this.player.getPlayerState() === 1) this.player.pauseVideo();
                else this.player.playVideo();
            } catch(e) {}
        }

        _mmSetVol(v) { if (this.player && this.player.setVolume) try { this.player.setVolume(v); } catch(e) {} }
        _mmNP(text)  { const el = document.getElementById('mm-np-text'); if (el) el.textContent = text; }

        _mmRenderQueue() {
            const el = document.getElementById('mm-queue'); if (!el) return;
            if (!this.queue.length) { el.innerHTML = "<div class='mm-q-empty'>Search something to add to your queue</div>"; return; }
            el.innerHTML = this.queue.map((item, i) =>
                "<div class='mm-q-item" + (i === this.queueIdx ? " mm-q-active" : "") + "' data-idx='" + i + "'>" +
                    "<span class='mm-q-src'>" + (item.source === 'youtube' ? 'YT' : 'SC') + "</span>" +
                    "<span class='mm-q-title'>" + this._esc(item.title) + "</span>" +
                    "<button class='mm-q-rm' data-idx='" + i + "'>\u2715</button>" +
                "</div>"
            ).join('');
            el.querySelectorAll('.mm-q-item').forEach(row => {
                row.addEventListener('click', ev => {
                    if (ev.target.classList.contains('mm-q-rm')) return;
                    this._mmPlay(parseInt(row.dataset.idx));
                });
            });
            el.querySelectorAll('.mm-q-rm').forEach(btn => {
                btn.addEventListener('click', ev => {
                    ev.stopPropagation();
                    const idx = parseInt(btn.dataset.idx);
                    this.queue.splice(idx, 1);
                    if (this.queueIdx >= idx) this.queueIdx = Math.max(-1, this.queueIdx - 1);
                    this._mmRenderQueue();
                });
            });
        }

        _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

        _mmAddToggleBtn() {
            const old = document.getElementById('mm-toggle'); if (old) old.remove();
            const btn = document.createElement('div');
            btn.id = 'mm-toggle'; btn.title = 'MusicMenu (Tab)';
            btn.innerHTML = "<svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z'/></svg>";
            btn.addEventListener('click', () => {
                const p = document.getElementById('mm-panel');
                if (!p) { this._mmBuildPanel(); return; }
                p.style.display = p.style.display === 'none' ? '' : 'none';
            });
            document.body.appendChild(btn);
        }

        _mmMove(ev) {
            if (!this.dragging) return;
            const p = document.getElementById('mm-panel'); if (!p) return;
            p.style.left = Math.max(0, Math.min(window.innerWidth  - p.offsetWidth,  ev.clientX - this.dragOffX)) + 'px';
            p.style.top  = Math.max(0, Math.min(window.innerHeight - p.offsetHeight, ev.clientY - this.dragOffY)) + 'px';
        }

        _mmUp() {
            if (!this.dragging) return; this.dragging = false;
            const p = document.getElementById('mm-panel'); if (!p) return;
            const r = p.getBoundingClientRect();
            this.settings.x = Math.round(r.left); this.settings.y = Math.round(r.top); this.save();
        }

        _mmWatchTheme() {
            this._mmApplyTheme();
            let _rafPending = false;
            this._themeOb = new MutationObserver(() => {
                if (_rafPending) return;
                _rafPending = true;
                requestAnimationFrame(() => { _rafPending = false; this._mmApplyTheme(); });
            });
            this._themeOb.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            this._themeOb.observe(document.body,            { attributes: true, attributeFilter: ['class'] });
        }

        _mmGetColors() {
            const html  = document.documentElement;
            const body  = document.body;
            const cls   = (html.className + ' ' + body.className).toLowerCase();
            const style = getComputedStyle(html);
            const isLight = cls.includes('theme-light') || cls.includes('light');
            const get = (vars) => { for (const v of vars) { const val = style.getPropertyValue(v).trim(); if (val) return val; } return null; };
            return {
                bg:      get(['--background-primary','--bg-base-primary'])     || (isLight ? '#ffffff' : '#313338'),
                bgSec:   get(['--background-secondary','--bg-base-secondary'])  || (isLight ? '#f2f3f5' : '#2b2d31'),
                bgTer:   get(['--background-tertiary','--bg-base-tertiary'])    || (isLight ? '#e3e5e8' : '#1e1f22'),
                txt:     get(['--text-normal'])                                  || (isLight ? '#060607' : '#dbdee1'),
                muted:   get(['--text-muted'])                                   || '#80848e',
                border:  get(['--background-modifier-accent'])                   || (isLight ? 'rgba(6,6,7,.08)' : 'rgba(255,255,255,.06)'),
                accent:  get(['--brand-500','--brand-experiment'])               || '#5865f2',
                isLight,
            };
        }

        _mmApplyTheme() {
            const c = this._mmGetColors();
            const faint  = c.isLight ? 'rgba(0,0,0,.06)'  : 'rgba(255,255,255,.06)';
            const hover  = c.isLight ? 'rgba(0,0,0,.08)'  : 'rgba(255,255,255,.08)';
            const scroll = c.isLight ? 'rgba(0,0,0,.12)'  : 'rgba(255,255,255,.08)';
            const vars = {
                '--mm-bg':     c.bg,
                '--mm-bg2':    c.bgSec,
                '--mm-bg3':    c.bgTer,
                '--mm-txt':    c.txt,
                '--mm-muted':  c.muted,
                '--mm-faint':  faint,
                '--mm-hover':  hover,
                '--mm-border': c.border,
                '--mm-accent': c.accent,
                '--mm-scroll': scroll,
            };
            ['mm-panel','mm-toggle'].forEach(id => {
                const el = document.getElementById(id); if (!el) return;
                Object.entries(vars).forEach(([k,v]) => el.style.setProperty(k, v));
            });
            const styleEl = document.getElementById('mm-style');
            if (styleEl) styleEl.textContent = this._mmBuildCSS();
        }

        _mmBuildCSS() {
            return [
                "#mm-panel{position:fixed;width:320px;background:var(--mm-bg,#313338);border:1px solid var(--mm-border,rgba(255,255,255,.08));",
                "border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.5);z-index:9000;overflow:hidden;font-family:'gg sans','Noto Sans',sans-serif;transition:background .2s,border-color .2s;}",
                "#mm-hdr{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:grab;background:var(--mm-faint,rgba(255,255,255,.03));border-bottom:1px solid var(--mm-border);}",
                "#mm-hdr:active{cursor:grabbing;}",
                "#mm-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;letter-spacing:.5px;color:var(--mm-txt);}",
                "#mm-note{color:var(--mm-accent);font-size:16px;animation:mm-bounce .8s ease-in-out infinite alternate;}",
                "@keyframes mm-bounce{from{transform:translateY(0)}to{transform:translateY(-3px)}}",
                "#mm-hbtns{display:flex;gap:4px;}",
                ".mm-hbtn{background:var(--mm-faint);border:none;border-radius:4px;color:var(--mm-muted);cursor:pointer;width:22px;height:22px;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0;transition:all .15s;}",
                ".mm-hbtn:hover{background:var(--mm-hover);color:var(--mm-txt);}",
                "#mm-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:var(--mm-bg);}",
                "#mm-tabs{display:flex;gap:6px;}",
                ".mm-tab{flex:1;padding:6px;background:var(--mm-faint);border:1px solid var(--mm-border);border-radius:6px;color:var(--mm-muted);cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .15s;}",
                ".mm-tab:hover{background:var(--mm-hover);color:var(--mm-txt);}",
                ".mm-tab-active{background:var(--mm-bg2);border-color:var(--mm-accent);color:var(--mm-accent);}",
                "#mm-search-row{display:flex;gap:6px;}",
                "#mm-search{flex:1;padding:8px 10px;background:var(--mm-bg2);border:1px solid var(--mm-border);border-radius:7px;color:var(--mm-txt);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;}",
                "#mm-search:focus{border-color:var(--mm-accent);}",
                "#mm-search::placeholder{color:var(--mm-muted);}",
                "#mm-go{padding:0 12px;background:var(--mm-accent);border:none;border-radius:7px;color:#fff;cursor:pointer;font-size:14px;font-weight:700;transition:opacity .15s;}",
                "#mm-go:hover{opacity:.85;}",
                "#mm-yt-wrap{border-radius:8px;overflow:hidden;background:#000;}",
                "#mm-yt-player{width:100%;height:140px;}",
                "#mm-sc-wrap{border-radius:8px;overflow:hidden;}",
                "#mm-nowplaying{background:var(--mm-bg2);border:1px solid var(--mm-border);border-radius:7px;padding:7px 10px;font-size:11px;color:var(--mm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
                "#mm-nowplaying::before{content:'\\266B  ';color:var(--mm-accent);}",
                "#mm-controls{display:flex;align-items:center;justify-content:center;gap:8px;}",
                ".mm-ctrl{background:var(--mm-faint);border:1px solid var(--mm-border);border-radius:8px;color:var(--mm-muted);cursor:pointer;width:36px;height:36px;font-size:11px;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:all .15s;}",
                ".mm-ctrl:hover{background:var(--mm-hover);color:var(--mm-txt);}",
                ".mm-play{width:44px;height:44px;font-size:14px;border-color:var(--mm-accent);color:var(--mm-accent);}",
                ".mm-play:hover{background:var(--mm-bg2);}",
                "#mm-vol-row{display:flex;align-items:center;gap:8px;}",
                "#mm-vol-icon{font-size:14px;color:var(--mm-muted);flex-shrink:0;}",
                "#mm-vol{flex:1;accent-color:var(--mm-accent);cursor:pointer;}",
                "#mm-vol-val{font-size:11px;color:var(--mm-muted);min-width:30px;text-align:right;}",
                "#mm-queue-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--mm-muted);display:flex;align-items:center;justify-content:space-between;}",
                "#mm-tab-hint{font-size:9px;font-weight:400;letter-spacing:.3px;color:var(--mm-muted);opacity:.6;text-transform:none;}",
                "#mm-queue{max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;scrollbar-width:thin;scrollbar-color:var(--mm-scroll,rgba(255,255,255,.07)) transparent;}",
                ".mm-q-empty{font-size:11px;color:var(--mm-muted);padding:8px 0;text-align:center;opacity:.6;}",
                ".mm-q-item{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:5px;cursor:pointer;background:var(--mm-faint);transition:background .1s;}",
                ".mm-q-item:hover{background:var(--mm-hover);}",
                ".mm-q-active{background:var(--mm-bg2);border:1px solid var(--mm-accent);}",
                ".mm-q-src{font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;background:var(--mm-bg3);color:var(--mm-accent);flex-shrink:0;}",
                ".mm-q-title{flex:1;font-size:11px;color:var(--mm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
                ".mm-q-rm{background:none;border:none;color:var(--mm-muted);cursor:pointer;font-size:10px;flex-shrink:0;padding:2px 4px;border-radius:3px;transition:all .1s;opacity:.5;}",
                ".mm-q-rm:hover{background:rgba(255,60,60,.2);color:#ff6060;opacity:1;}",
                "#mm-toggle{position:fixed;bottom:52px;left:8px;width:34px;height:34px;background:var(--mm-bg,#313338);border:1px solid var(--mm-border,rgba(255,255,255,.1));border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:8999;color:var(--mm-muted);transition:all .15s;}",
                "#mm-toggle:hover{color:var(--mm-accent);border-color:var(--mm-accent);}",
            ].join('');
        }

        _mmInjectCSS() {
            const old = document.getElementById('mm-style'); if (old) old.remove();
            const s = document.createElement('style');
            s.id = 'mm-style';
            s.textContent = this._mmBuildCSS();
            document.head.appendChild(s);
        }

        getSettingsPanel() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:16px;color:var(--text-normal);font-family:var(--font-primary);max-width:420px;';
            const note = document.createElement('p');
            note.textContent = 'Tab \u2014 toggle MusicMenu   \u00b7   Esc \u2014 toggle Theme Switcher. The music panel colors adapt to your active Discord theme automatically.';
            note.style.cssText = 'font-size:14px;line-height:1.6;color:var(--text-muted);margin-bottom:12px;';
            const rst = document.createElement('button');
            rst.textContent = 'Reset Music Panel Position';
            rst.style.cssText = [
                'padding:7px 14px;',
                'background:var(--background-secondary);',
                'color:var(--text-normal);',
                'border:1px solid var(--background-modifier-accent);',
                'border-radius:4px;',
                'cursor:pointer;',
                'font-size:13px;',
                'font-family:var(--font-primary);',
                'transition:background .15s;',
            ].join('');
            rst.addEventListener('mouseenter', () => rst.style.background = 'var(--background-modifier-hover)');
            rst.addEventListener('mouseleave', () => rst.style.background = 'var(--background-secondary)');
            rst.addEventListener('click', () => {
                this.settings.x = null; this.settings.y = null; this.save();
                const p = document.getElementById('mm-panel'); if (p) p.remove();
                this._mmBuildPanel();
            });
            wrap.appendChild(note);
            wrap.appendChild(rst);
            return wrap;
        }
    };
})();
