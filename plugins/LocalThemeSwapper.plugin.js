/**
 * @name LocalThemeSwitcher
 * @author Pagoni Hax
 * @description Randomly applies one of your installed BetterDiscord themes on startup. Press Escape to open the switcher.
 * @version 1.0.3
 */

module.exports = (_ => {

    const PANEL_CSS = `
        #ts-overlay {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0,0,0,0.72);
            backdrop-filter: blur(6px) saturate(0.7);
            align-items: center;
            justify-content: center;
        }
        #ts-overlay.ts-open {
            display: flex;
            animation: ts-fadein 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes ts-fadein {
            from { opacity:0; transform:scale(0.93) translateY(-10px); }
            to   { opacity:1; transform:scale(1)    translateY(0); }
        }
        #ts-panel {
            width: 280px;
            max-height: 480px;
            display: flex;
            flex-direction: column;
            border-radius: 6px;
            overflow: hidden;
            background: #0d0d0d;
            border: 1px solid #2a2a2a;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.9), 0 20px 60px rgba(0,0,0,0.95), 0 0 40px rgba(255,255,255,0.03);
            font-family: 'Share Tech Mono','Fira Code','Courier New',monospace;
        }
        #ts-header {
            flex-shrink: 0;
            padding: 10px 14px 9px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #1e1e1e;
            background: #0a0a0a;
        }
        #ts-header-left {
            display: flex;
            align-items: center;
            gap: 7px;
        }
        #ts-header-icon { width:14px; height:14px; opacity:0.8; }
        #ts-title {
            font-size: 10px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #aaaaaa;
        }
        #ts-version {
            font-size: 8px;
            opacity: 0.3;
            letter-spacing: 0.1em;
            color: #888;
            margin-left: 4px;
        }
        #ts-close {
            width:18px; height:18px;
            border-radius: 3px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: #444;
            font-size: 14px;
            transition: color 0.1s, background 0.1s;
            line-height: 1;
            user-select: none;
        }
        #ts-close:hover { color:#ccc; background:rgba(255,255,255,0.06); }
        #ts-active-bar {
            flex-shrink: 0;
            padding: 5px 14px;
            font-size: 9px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #333;
            background: #0a0a0a;
            border-bottom: 1px solid #161616;
            display: flex; align-items: center; gap: 6px;
            min-height: 26px;
        }
        #ts-active-dot {
            width:5px; height:5px;
            border-radius: 50%;
            background: #333;
            flex-shrink: 0;
            transition: background 0.2s, box-shadow 0.2s;
        }
        #ts-active-label { transition: color 0.2s; }
        #ts-search-wrap {
            padding: 8px 10px;
            border-bottom: 1px solid #161616;
            background: #0a0a0a;
            flex-shrink: 0;
        }
        #ts-search {
            width: 100%;
            box-sizing: border-box;
            background: rgba(255,255,255,0.04);
            border: 1px solid #222;
            border-radius: 3px;
            padding: 5px 9px;
            color: #ccc;
            font-family: inherit;
            font-size: 10px;
            letter-spacing: 0.06em;
            outline: none;
            transition: border-color 0.15s;
        }
        #ts-search::placeholder { color:#333; }
        #ts-search:focus { border-color:#444; }
        #ts-list {
            overflow-y: auto;
            flex: 1;
            padding: 4px 0;
        }
        #ts-list::-webkit-scrollbar { width:3px; }
        #ts-list::-webkit-scrollbar-track { background:transparent; }
        #ts-list::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
        .ts-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 14px;
            cursor: pointer;
            border-left: 2px solid transparent;
            user-select: none;
            transition: background 0.08s, border-color 0.1s;
        }
        .ts-row:hover { background:rgba(255,255,255,0.03); }
        .ts-row.ts-active { background:rgba(255,255,255,0.05); }
        .ts-dot {
            width:8px; height:8px;
            border-radius: 50%;
            flex-shrink: 0;
            transition: box-shadow 0.2s;
        }
        .ts-row:not(.ts-active) .ts-dot { opacity:0.55; }
        .ts-row.ts-active .ts-dot { opacity:1; }
        .ts-name {
            flex: 1;
            font-size: 11px;
            letter-spacing: 0.06em;
            color: #777;
            transition: color 0.1s, text-shadow 0.2s;
        }
        .ts-row.ts-active .ts-name { color:#dddddd; }
        .ts-row:hover:not(.ts-active) .ts-name { color:#999; }
        .ts-badge {
            font-size: 8px;
            letter-spacing: 0.12em;
            padding: 1px 5px;
            border-radius: 2px;
            border: 1px solid #222;
            color: #333;
            text-transform: uppercase;
            opacity: 0;
            transition: opacity 0.15s;
        }
        .ts-row.ts-active .ts-badge { opacity:1; }
        .ts-check {
            width:14px; height:14px;
            border-radius: 2px;
            border: 1px solid #252525;
            flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 9px;
            color: transparent;
            transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .ts-row.ts-active .ts-check { color:#000; }
        #ts-footer {
            flex-shrink: 0;
            padding: 7px 14px;
            border-top: 1px solid #141414;
            background: #080808;
            display: flex; align-items: center; justify-content: space-between;
        }
        .ts-footer-text {
            font-size: 8px;
            letter-spacing: 0.12em;
            color: #252525;
            text-transform: uppercase;
        }
        #ts-reset {
            font-size: 8px;
            letter-spacing: 0.12em;
            color: #333;
            cursor: pointer;
            text-transform: uppercase;
            transition: color 0.1s;
        }
        #ts-reset:hover { color:#888; }
        #ts-pill {
            position: fixed;
            bottom: 16px;
            left: 16px;
            z-index: 9998;
            display: flex; align-items: center; gap: 6px;
            padding: 4px 11px 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-family: 'Share Tech Mono',monospace;
            font-size: 9px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            user-select: none;
            background: #0c0c0c;
            border: 1px solid #1e1e1e;
            color: #444;
            transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
        }
        #ts-pill:hover { color:#aaa; border-color:#333; box-shadow:0 0 12px rgba(0,0,0,0.6); }
        #ts-pill-dot {
            width:5px; height:5px;
            border-radius: 50%;
            background: #2a2a2a;
            flex-shrink: 0;
            transition: background 0.25s, box-shadow 0.25s;
        }
    `;

    function hexToRgb(hex) {
        const m = hex.replace('#','').match(/.{2}/g);
        return m ? m.map(x => parseInt(x,16)) : [136,136,136];
    }
    function withAlpha(hex, a) {
        const [r,g,b] = hexToRgb(hex);
        return `rgba(${r},${g},${b},${a})`;
    }

    return class LocalThemeSwitcher {
        constructor() {
            this._activeName = BdApi.Data.load('LocalThemeSwitcher','activeName') || null;
            this._menuOpen   = false;
            this._keyHandler = null;
            this._observer   = null;
            this._styleKey   = 'LocalThemeSwitcher-styles';
        }

        start() {
            BdApi.DOM.addStyle(this._styleKey, PANEL_CSS);
            this._buildPill();
            this._buildOverlay();

            this._keyHandler = e => this._onKey(e);
            document.addEventListener('keydown', this._keyHandler, true);

            this._observer = new MutationObserver(() => {
                if (!document.getElementById('ts-pill'))    this._buildPill();
                if (!document.getElementById('ts-overlay')) this._buildOverlay();
            });
            this._observer.observe(document.body, { childList: true, subtree: false });

            const themes = this._getThemes();
            if (this._activeName && themes.find(t => t.name === this._activeName)) {
                this._applyTheme(this._activeName, true);
            } else if (themes.length > 0) {
                const pick = themes[Math.floor(Math.random() * themes.length)];
                this._applyTheme(pick.name, false);
            } else {
                BdApi.UI.showToast('LocalThemeSwitcher: No installed themes found.', { type:'warning', timeout:4000 });
            }

            this._log('Started.');
        }

        stop() {
            document.removeEventListener('keydown', this._keyHandler, true);
            if (this._observer) { this._observer.disconnect(); this._observer = null; }
            BdApi.DOM.removeStyle(this._styleKey);
            document.getElementById('ts-overlay')?.remove();
            document.getElementById('ts-pill')?.remove();
            this._log('Stopped.');
        }

        _getThemes() {
            try {
                return (BdApi.Themes.getAll() || []).map(t => ({
                    name: t.name || t.getName?.() || 'Unknown',
                    color: '#4AEF98'
                }));
            } catch(e) {
                this._err('Could not read themes:', e);
                return [];
            }
        }

        _applyTheme(name, silent = false) {
            const themes = this._getThemes();
            const entry  = themes.find(t => t.name === name);

            if (!entry) {
                this._activeName = null;
                BdApi.Data.save('LocalThemeSwitcher','activeName', null);
                this._syncUI();
                return;
            }

            themes.forEach(t => {
                try { BdApi.Themes.disable(t.name); } catch(_) {}
            });

            // Flush any lingering theme styles before applying the new one
            document.querySelectorAll('style[id^="bd-"], bd-themes, #bd-stylesheet, link[href*=".theme.css"]').forEach(el => {
                try { el.remove(); } catch(_) {}
            });

            BdApi.Themes.enable(name);
            this._activeName = name;
            BdApi.Data.save('LocalThemeSwitcher','activeName', name);
            this._syncUI();

            if (!silent) BdApi.UI.showToast(`Theme: ${name}`, { type:'success', timeout:2000 });
        }

        _resetTheme() {
            const themes = this._getThemes();
            themes.forEach(t => { try { BdApi.Themes.disable(t.name); } catch(_) {} });

            // Force-remove any lingering theme <style> tags BdApi may have left behind
            document.querySelectorAll('style[id^="bd-"], bd-themes, #bd-stylesheet, link[href*=".theme.css"]').forEach(el => {
                try { el.remove(); } catch(_) {}
            });

            this._activeName = null;
            BdApi.Data.save('LocalThemeSwitcher','activeName', null);
            this._syncUI();
            BdApi.UI.showToast('Theme reset.', { type: 'info', timeout: 2000 });
        }

        _buildPill() {
            if (document.getElementById('ts-pill')) return;
            const pill = document.createElement('div');
            pill.id = 'ts-pill';
            pill.innerHTML = `<div id="ts-pill-dot"></div><span id="ts-pill-label">themes</span>`;
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
                <div id="ts-close" title="Close (ESC)">×</div>
            `;
            header.querySelector('#ts-close').addEventListener('click', () => this._closeMenu());
            panel.appendChild(header);

            const activeBar = document.createElement('div');
            activeBar.id = 'ts-active-bar';
            activeBar.innerHTML = `<div id="ts-active-dot"></div><span id="ts-active-label">no theme active</span>`;
            panel.appendChild(activeBar);

            const searchWrap = document.createElement('div');
            searchWrap.id = 'ts-search-wrap';
            const search = document.createElement('input');
            search.id = 'ts-search';
            search.type = 'text';
            search.placeholder = 'search themes…';
            search.addEventListener('input', () => this._filterRows(search.value));
            searchWrap.appendChild(search);
            panel.appendChild(searchWrap);

            const list = document.createElement('div');
            list.id = 'ts-list';
            this._getThemes().forEach(t => list.appendChild(this._makeRow(t)));
            panel.appendChild(list);

            const footer = document.createElement('div');
            footer.id = 'ts-footer';
            footer.innerHTML = `<span class="ts-footer-text">${this._getThemes().length} themes · esc to close</span><span id="ts-reset">Reset</span>`;
            footer.querySelector('#ts-reset').addEventListener('click', () => this._resetTheme());
            panel.appendChild(footer);

            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            this._syncUI();
        }

        _makeRow(theme) {
            const row = document.createElement('div');
            row.className = 'ts-row';
            row.dataset.name = theme.name;

            const dot = document.createElement('div');
            dot.className = 'ts-dot';
            dot.style.background = theme.color;
            dot.style.boxShadow  = `0 0 6px ${theme.color}`;

            const name = document.createElement('span');
            name.className = 'ts-name';
            name.textContent = theme.name;

            const badge = document.createElement('span');
            badge.className = 'ts-badge';
            badge.textContent = 'active';
            badge.style.borderColor = withAlpha(theme.color, 0.3);
            badge.style.color       = theme.color;

            const check = document.createElement('div');
            check.className = 'ts-check';
            check.textContent = '✓';

            row.appendChild(dot);
            row.appendChild(name);
            row.appendChild(badge);
            row.appendChild(check);

            row.addEventListener('click', () => {
                if (this._activeName === theme.name) this._resetTheme();
                else this._applyTheme(theme.name);
            });

            return row;
        }

        _syncUI() {
            const entry = this._getThemes().find(t => t.name === this._activeName) || null;
            const color = entry ? entry.color : null;

            document.querySelectorAll('.ts-row').forEach(row => {
                const active = row.dataset.name === this._activeName;
                row.classList.toggle('ts-active', active);
                const c = this._getThemes().find(t => t.name === row.dataset.name)?.color || '#888';
                if (active) {
                    row.style.borderLeftColor = c;
                    const check = row.querySelector('.ts-check');
                    if (check) { check.style.background = c; check.style.borderColor = c; }
                } else {
                    row.style.borderLeftColor = 'transparent';
                    const check = row.querySelector('.ts-check');
                    if (check) { check.style.background = ''; check.style.borderColor = ''; }
                }
            });

            const dot   = document.getElementById('ts-active-dot');
            const label = document.getElementById('ts-active-label');
            if (dot && label) {
                if (color) {
                    dot.style.background  = color;
                    dot.style.boxShadow   = `0 0 6px ${color}`;
                    label.style.color     = color;
                    label.textContent     = this._activeName;
                } else {
                    dot.style.background  = '#333';
                    dot.style.boxShadow   = 'none';
                    label.style.color     = '#333';
                    label.textContent     = 'no theme active';
                }
            }

            const pillDot   = document.getElementById('ts-pill-dot');
            const pillLabel = document.getElementById('ts-pill-label');
            if (pillDot && pillLabel) {
                if (color) {
                    pillDot.style.background  = color;
                    pillDot.style.boxShadow   = `0 0 5px ${color}`;
                    pillLabel.textContent     = this._activeName;
                } else {
                    pillDot.style.background  = '#2a2a2a';
                    pillDot.style.boxShadow   = 'none';
                    pillLabel.textContent     = 'themes';
                }
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
            if (list) {
                list.innerHTML = '';
                this._getThemes().forEach(t => list.appendChild(this._makeRow(t)));
            }
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

        _onKey(e) {
            if (e.key !== 'Escape') return;
            if (this._menuOpen) {
                e.stopPropagation();
                this._closeMenu();
                return;
            }
            if (document.querySelector('[class*="modal-"],[class*="popout-"],[class*="layer-"]')) return;
            e.stopPropagation();
            this._openMenu();
        }

        _log(...a) { console.log(`%c[LocalThemeSwitcher]`,'color:#4AEF98;font-weight:bold',...a); }
        _err(...a) { console.error(`%c[LocalThemeSwitcher]`,'color:#ff4a4a;font-weight:bold',...a); }
    };
})();
