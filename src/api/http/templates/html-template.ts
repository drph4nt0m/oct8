import { Insight } from '#core/entities/types';
import { escapeHtml } from '#api/http/presenters/formatters';

const esc = (val: string | number | undefined | null): string => escapeHtml(String(val ?? ''));

export const htmlTemplate = (data: Insight): string => {
  const jsonData = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IP: ${esc(data.ip)} | oct8</title>
  <meta name="description" content="IP intelligence report for ${esc(data.ip)}">
  <meta name="robots" content="index, follow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <script type="importmap">{"imports":{"lit":"https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js"}}</script>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }

    /* ── Catppuccin Mocha tokens ── */
    :root {
      --base:    #1e1e2e;
      --mantle:  #181825;
      --crust:   #11111b;
      --text:    #cdd6f4;
      --sub0:    #a6adc8;
      --sub1:    #bac2de;
      --surf0:   #313244;
      --surf1:   #45475a;
      --overlay0:#6c7086;
      --mauve:   #cba6f7;
      --blue:    #89b4fa;
      --teal:    #94e2d5;
      --green:   #a6e3a1;
      --yellow:  #f9e2af;
      --peach:   #fab387;
      --red:     #f38ba8;
    }

    /* ── Base ── */
    body {
      font-family: 'JetBrains Mono', 'Menlo', 'Courier New', monospace;
      /* fluid: scales smoothly from 14px on mobile to 32px on 4k displays */
      font-size: clamp(14px, 1vw + 10px, 32px);
      line-height: 1.5;
      color: var(--text);
      background: var(--base);
      padding: 0.75em;
      display: flex;
      flex-direction: column;
    }

    /* ── Terminal window chrome ── */
    .win {
      background: var(--crust);
      border: 1px solid var(--surf0);
      border-radius: 8px;
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
      
      /* Stop expanding after 4 columns (89.5em) + padding (2em) and center it */
      width: 100%;
      max-width: calc(91.5em + 2px);
      margin: 0 auto;
    }

    .win-bar { 
      background: var(--mantle); padding: 0.75rem 1rem; border-bottom: 1px solid var(--surf0);
      display: flex; gap: 0.5rem; align-items: center; border-radius: 8px 8px 0 0;
      justify-content: space-between;
    }
    .win-bar-left { display: flex; gap: 0.5rem; }
    .win-bar-right { display: flex; gap: 1rem; font-family: monospace; font-size: 0.85rem; font-weight: 700; }
    .fmt-icon { color: var(--overlay0); text-decoration: none; transition: color 0.2s; }
    .fmt-icon:hover { color: var(--text); }
    .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .dot-r { background: var(--red); }
    .dot-y { background: var(--yellow); }
    .dot-g { background: var(--green); }

    .win-title {
      font-size: 0.78rem;
      color: var(--sub0);
      margin-left: 0.5rem;
    }

    .win-body {
      padding: 0.85em 1em 1em;
      flex: 1;
      overflow-x: auto;
    }

    /* ── Prompt lines ── */
    .prompt-line { margin-bottom: 0.75rem; white-space: nowrap; }
    .p-user  { color: var(--green);  font-weight: 700; }
    .p-cmd   { color: var(--blue);   font-weight: 700; }
    .p-sub   { color: var(--peach);  font-weight: 700; }
    .p-arg   { color: var(--text); }
    .p-foot { margin-top: 1.5em; padding-bottom: 2em; }
    .p-input { font-weight: 700; color: var(--text); }
    .p-cursor { color: var(--green); animation: blink 1s step-end infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    /* ── Card grid ── */
    /* em-based so everything scales with the fluid font-size */
    :root { --card-w: 22em; --gap: 0.5em; }

    oct8-grid { display: block; }

    .grid {
      column-width: var(--card-w);
      column-gap: var(--gap);
    }

    /* ── Individual card ── */
    .card {
      display: inline-block;  /* required for CSS columns */
      width: 100%;             /* fill the column — all columns equal, so all cards equal */
      break-inside: avoid;
      margin-bottom: var(--gap); /* vertical gap = column-gap, always identical */
      border: 1px solid var(--surf0);
      border-radius: 4px;
    }

    .card-title {
      border-bottom: 1px solid var(--surf0);
      padding: 0.25em 0.65em 0.25em 0.85em;
      color: var(--mauve);
      font-weight: 700;
      font-size: 0.78em;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* ── Card rows (flex, no table) ── */
    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 2em;
      padding: 0.22em 0.65em 0.22em 0.85em;
    }

    .row-k {
      color: var(--sub0);
      white-space: nowrap;
      flex-shrink: 0;
      font-size: 0.85em;
      border-bottom: 1px dotted var(--overlay0);
    }

    .row-v {
      text-align: right;
      line-height: 1.4;
      word-break: break-word; /* allow wrapping for long lines like coordinates + tags */
    }

    /* ── Value types ── */
    .s  { color: var(--teal); }
    .n  { color: var(--peach); }
    .nl { color: var(--overlay0); font-style: italic; }

    /* ── Boolean badges ── */
    .b {
      display: inline-block;
      padding: 0 0.4em;
      border-radius: 3px;
      font-weight: 700;
      font-size: 0.72em;
      letter-spacing: 0.06em;
      line-height: 1.8;
      color: var(--crust);
    }
    .b-ok   { background: var(--green); }
    .b-bad  { background: var(--red); }
    .b-warn { background: var(--yellow); }
    .b-warn { background: var(--yellow); }
    .b-neu  { background: var(--surf1); color: var(--text); }

    /* ── Clickable Value Menus (OSINT) ── */
    .val-menu {
      position: relative;
      display: inline-block;
    }
    .val-menu-btn {
      cursor: pointer;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 4px;
      transition: color 0.1s ease;
    }
    .val-menu-btn:hover, .val-menu-btn.active { color: var(--blue); }

    .val-menu-box {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 0.4rem;
      background: var(--crust);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      padding: 0.4rem;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 180px;
      animation: fadeIn 0.1s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-3px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .val-menu-box a {
      color: var(--text);
      text-decoration: none;
      font-size: 0.9em;
      padding: 0.4em 0.6em;
      border-radius: 4px;
      text-align: left;
      font-weight: 500;
      white-space: nowrap;
      transition: background 0.1s, color 0.1s;
    }
    .val-menu-box a:hover {
      background: var(--surface0);
      color: var(--blue);
    }

    .help-btn {
      cursor: pointer;
      border-bottom: 1px dotted var(--overlay0);
      transition: color 0.1s, border-bottom-color 0.1s;
      user-select: none;
    }
    .help-btn:hover, .help-btn.active { 
      color: var(--blue);
      border-bottom-color: var(--blue);
    }
    
    .help-box {
      white-space: normal;
      width: 220px;
      color: var(--text);
      font-size: 0.9em;
      left: 0; right: auto;
      font-weight: 400;
      padding: 0.6rem;
    }

    /* ── End CSS ── */
  </style>
</head>
<body>
  <div class="win">
    <div class="win-bar">
      <div class="win-bar-left">
        <span class="dot dot-r"></span>
        <span class="dot dot-y"></span>
        <span class="dot dot-g"></span>
      </div>
      <div class="win-bar-right">
        <a href="/${data.ip}?format=json" class="fmt-icon" title="View JSON">{ }</a>
        <a href="/${data.ip}?format=xml" class="fmt-icon" title="View XML">&lt;/&gt;</a>
        <a href="/${data.ip}?format=yaml" class="fmt-icon" title="View YAML">---</a>
        <a href="/${data.ip}?format=text" class="fmt-icon" title="View Plain Text">TXT</a>
      </div>
    </div>
    <div class="win-body">
      <oct8-grid></oct8-grid>
    </div>
  </div>

  <script type="application/json" id="insight-data">${jsonData}</script>

  <script type="module">
    import { LitElement, html } from 'lit';

    /* ── Value renderer ── */
    function rirUrl(reg, ip) {
      if (!reg || !ip) return '';
      switch(reg.toLowerCase()) {
        case 'arin': return \`https://search.arin.net/rdap/?query=\${ip}\`;
        case 'ripe': return \`https://apps.db.ripe.net/db-web-ui/query?searchtext=\${ip}\`;
        case 'apnic': return \`https://wq.apnic.net/query?searchtext=\${ip}\`;
        case 'lacnic': return \`https://whois.lacnic.net/cgi-bin/lacnic/whois?lg=EN&query=\${ip}\`;
        case 'afrinic': return \`https://whois.afrinic.net/?searchtext=\${ip}\`;
        default: return \`https://whois.com/whois/\${ip}\`;
      }
    }

    function fmtAlloc(dateStr, status) {
      if (!dateStr && !status) return null;
      let ds = dateStr ? String(dateStr) : '';
      if (/^[0-9]{8}$/.test(ds)) {
        const yr = ds.slice(0,4), mo = ds.slice(4,6), da = ds.slice(6,8);
        const dateObj = new Date(yr + '-' + mo + '-' + da + 'T00:00:00Z');
        if (!isNaN(dateObj)) {
          ds = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateObj);
        }
      }
      if (ds && status) return ds + ' (' + status + ')';
      return ds || status;
    }

    function fmt(key, val) {
      return val;
    }

    function v(val, sev = 'neutral') {
      if (val === null || val === undefined || val === '')
        return null; // skip null rows entirely

      if (typeof val === 'boolean') {
        const risky = sev === 'bad' || sev === 'warning';
        let cls, label;
        if (val) {
          cls  = sev === 'bad' ? 'b-bad' : sev === 'warning' ? 'b-warn' : sev === 'good' ? 'b-ok' : 'b-neu';
          label = 'YES';
        } else {
          cls  = risky ? 'b-ok' : sev === 'good' ? 'b-bad' : 'b-neu';
          label = 'NO';
        }
        return html\`<span class="b \${cls}">\${label}</span>\`;
      }

      if (typeof val === 'number') return html\`<span class="n">\${val}</span>\`;
      return html\`<span class="s">\${val}</span>\`;
    }

    /* ── Card builder ── */
    function r(k, v, t = '', s = 'neutral') {
      return { k, v, t, s };
    }

    /* ── oct8-grid element ── */
    class Oct8Grid extends LitElement {
      static get properties() {
        return {
          _d: { state: true },
          _openMenu: { state: true },
          _cmdInput: { state: true }
        };
      }

      constructor() {
        super();
        this._d = null;
        this._openMenu = null;
        this._cmdInput = '';
        this._handleClickOutside = (e) => {
          const path = e.composedPath();
          if (!path.find(el => el.classList && el.classList.contains('val-menu'))) {
            this._openMenu = null;
          }
        };
        this._handleKeydown = (e) => {
          if (e.ctrlKey || e.altKey || e.metaKey) return;
          if (e.key === 'Backspace') {
            this._cmdInput = this._cmdInput.slice(0, -1);
            e.preventDefault();
          } else if (e.key === 'Enter') {
            const target = this._cmdInput.trim();
            if (target) window.location.href = '/' + target;
          } else if (e.key.length === 1) {
            const next = this._cmdInput + e.key;
            let isValid = false;
            
            const isPartialV4 = (s) => {
              if (/[^0-9.]/.test(s)) return false;
              const parts = s.split('.');
              if (parts.length > 4) return false;
              for (const p of parts) {
                if (p.length > 3) return false;
                if (p.length > 0 && parseInt(p, 10) > 255) return false;
              }
              return true;
            };

            const isPartialV6 = (s) => {
              if (/[^0-9a-fA-F:]/.test(s)) return false;
              const parts = s.split(':');
              if (parts.length > 8) return false;
              if (s.indexOf('::') !== s.lastIndexOf('::')) return false; // Only one :: allowed
              for (const p of parts) {
                if (p.length > 4) return false;
              }
              return true;
            };

            if (next.includes('.')) {
              isValid = isPartialV4(next);
            } else if (next.includes(':') || /[a-fA-F]/i.test(next)) {
              isValid = isPartialV6(next);
            } else {
              isValid = isPartialV4(next) || isPartialV6(next);
            }
            
            if (isValid) {
              this._cmdInput = next;
            }
          }
        };
      }

      createRenderRoot() { return this; }

      connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this._handleClickOutside);
        document.addEventListener('keydown', this._handleKeydown);
        try { this._d = JSON.parse(document.getElementById('insight-data').textContent); }
        catch (e) { this._d = null; }
        this.requestUpdate();
      }

      disconnectedCallback() {
        document.removeEventListener('click', this._handleClickOutside);
        document.removeEventListener('keydown', this._handleKeydown);
        super.disconnectedCallback();
      }

      toggleMenu(key, e) {
        e.preventDefault();
        e.stopPropagation();
        this._openMenu = this._openMenu === key ? null : key;
      }

      card(title, rows) {
        const validRows = rows.filter(r => r && r.v !== null && r.v !== undefined && r.v !== '');
        if (validRows.length === 0) return html\`\`;
        
        return html\`
          <div class="card">
            <div class="card-title">\${title}</div>
            \${validRows.map(r => {
              const helpKey = 'help-' + title + '-' + r.k;
              return html\`<div class="row">
                <span class="row-k">
                  \${r.t ? html\`
                    <div class="val-menu">
                      <span class="help-btn \${this._openMenu === helpKey ? 'active' : ''}" @click=\${(e) => this.toggleMenu(helpKey, e)}>\${r.k}</span>
                      \${this._openMenu === helpKey ? html\`<div class="val-menu-box help-box" @click=\${e => e.stopPropagation()}>\${r.t}</div>\` : ''}
                    </div>
                  \` : r.k}
                </span>
                <span class="row-v">\${v(fmt(r.k, r.v), r.s)}</span>
              </div>\`;
            })}
          </div>
        \`;
      }

      render() {
        const d = this._d;
        const globalMenuHtml = html\`
          <a href="https://www.virustotal.com/gui/ip-address/\${d.ip}" target="_blank">VirusTotal ↗</a>
          <a href="https://www.shodan.io/host/\${d.ip}" target="_blank">Shodan ↗</a>
          <a href="https://search.censys.io/hosts/\${d.ip}" target="_blank">Censys ↗</a>
          <a href="https://radar.cloudflare.com/ip/\${d.ip}" target="_blank">Cloudflare Radar ↗</a>
          <a href="https://otx.alienvault.com/indicator/ip/\${d.ip}" target="_blank">AlienVault ↗</a>
          <a href="https://viz.greynoise.io/ip/\${d.ip}" target="_blank">GreyNoise ↗</a>
        \`;

        const menu = (key, label, links) => html\`
          <div class="val-menu">
            <span class="val-menu-btn \${this._openMenu === key ? 'active' : ''}" @click=\${(e) => this.toggleMenu(key, e)}>
              \${label}
            </span>
            \${this._openMenu === key ? html\`
              <div class="val-menu-box">
                \${links}
              </div>
            \` : ''}
          </div>
        \`;

        const sec = d.security || {};
        const srcs = sec.sources;
        const srcRow = srcs?.length
          ? r('sources', srcs.map(s => s.slug).join(', '), 'Threat intelligence sources reporting this IP', 'bad')
          : null;

        const secFlags = [
          [sec.is_anonymous, 'Anonymous'],
          [sec.is_proxy, 'Proxy'],
          [sec.is_tor, 'Tor'],
          [sec.is_vpn, 'VPN'],
        ].filter((x) => x[0]).map((x) => x[1]);

        const inf = d.infrastructure || {};

        const locHtml = (d.location?.latitude && d.location?.longitude)
          ? menu('loc', \`\${d.location.latitude}, \${d.location.longitude}\`, html\`
                     <a href="https://www.google.com/maps/search/?api=1&query=\${d.location.latitude},\${d.location.longitude}" target="_blank">Google Maps ↗</a>
                     <a href="https://www.openstreetmap.org/search?query=\${d.location.latitude}%2C\${d.location.longitude}" target="_blank">OpenStreetMap ↗</a>
                   \`)
          : null;

        const countryHtml = d.location?.country
          ? menu('country', d.location.country, html\`
                     <a href="https://en.wikipedia.org/wiki/\${encodeURIComponent(d.location.country)}" target="_blank">Wikipedia ↗</a>
                     <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(d.location.country)}" target="_blank">Google Maps ↗</a>
                   \`)
          : null;

        const regionHtml = d.location?.region
          ? menu('region', d.location.region, html\`
                     <a href="https://en.wikipedia.org/wiki/\${encodeURIComponent(d.location.region)}" target="_blank">Wikipedia ↗</a>
                     <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(d.location.region + ', ' + (d.location.country || ''))}" target="_blank">Google Maps ↗</a>
                   \`)
          : null;

        const cityHtml = d.location?.city
          ? menu('city', d.location.city, html\`
                     <a href="https://en.wikipedia.org/wiki/\${encodeURIComponent(d.location.city)}" target="_blank">Wikipedia ↗</a>
                     <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(d.location.city + ', ' + (d.location.country || ''))}" target="_blank">Google Maps ↗</a>
                   \`)
          : null;

        const asnHtml = inf?.asn
          ? menu('asn', inf.asn, html\`
                     <a href="https://bgp.he.net/AS\${inf.asn}" target="_blank">Hurricane Electric ↗</a>
                     <a href="https://www.peeringdb.com/asn/\${inf.asn}" target="_blank">PeeringDB ↗</a>
                   \`)
          : null;

        const orgHtml = inf?.org
          ? menu('org', inf.org, html\`
                     <a href="https://bgp.he.net/search?search%5Bsearch%5D=\${encodeURIComponent(inf.org)}" target="_blank">HE Search ↗</a>
                     <a href="https://www.peeringdb.com/search?q=\${encodeURIComponent(inf.org)}" target="_blank">PeeringDB ↗</a>
                   \`)
          : null;

        const routeHtml = inf?.route
          ? menu('route', inf.route, html\`
                     <a href="https://bgp.he.net/net/\${inf.route}" target="_blank">Hurricane Electric ↗</a>
                   \`)
          : null;

        const domainHtml = d.identity?.provider?.domain
          ? menu('domain', d.identity.provider.domain, html\`
                     <a href="https://urlscan.io/search/#domain:\${d.identity.provider.domain}" target="_blank">urlscan.io ↗</a>
                   \`)
          : null;

        const providerNameHtml = d.identity?.provider?.name
          ? menu('provider', d.identity.provider.name, html\`
                     <a href="https://www.google.com/search?q=\${encodeURIComponent(d.identity.provider.name)}" target="_blank">Google Search ↗</a>
                     <a href="https://en.wikipedia.org/wiki/Special:Search?search=\${encodeURIComponent(d.identity.provider.name)}" target="_blank">Wikipedia ↗</a>
                   \`)
          : null;

        const identityTypeHtml = d.identity?.type
          ? menu('id_type', d.identity.type, html\`
                     <a href="https://www.google.com/search?q=\${encodeURIComponent(d.identity.type + ' service provider')}" target="_blank">Google Search ↗</a>
                   \`)
          : null;

        const providerRegionHtml = d.identity?.provider?.region
          ? menu('id_region', d.identity.provider.region, html\`
                     <a href="https://www.google.com/search?q=\${encodeURIComponent((d.identity.provider.name || '') + ' ' + d.identity.provider.region + ' region')}" target="_blank">Google Search ↗</a>
                   \`)
          : null;

        const providerServiceHtml = d.identity?.provider?.service
          ? menu('id_service', d.identity.provider.service, html\`
                     <a href="https://www.google.com/search?q=\${encodeURIComponent((d.identity.provider.name || '') + ' ' + d.identity.provider.service)}" target="_blank">Google Search ↗</a>
                   \`)
          : null;

        const regHtml = inf?.registry
          ? menu('reg', inf.registry, html\`
                     <a href="\${rirUrl(inf.registry, d.ip)}" target="_blank">Direct Database (\${inf.registry.toUpperCase()}) ↗</a>
                   \`)
          : null;

        return html\`
          <div class="prompt-line">
            <span class="p-user">guest@oct8:~$</span>
            <span class="p-cmd"> oct8</span>
            <span class="p-sub"> inspect</span>
            <span class="p-arg"> \${menu('ip_global', d.ip, globalMenuHtml)}</span>
          </div>

          <div class="grid">
            \${this.card('Location', [
              r('country',      countryHtml,              'Full country name of the IP address'),
              r('country_code', d.location?.country_code, 'Two-letter ISO 3166-1 country code'),
              r('region',       regionHtml,               'State, province, or regional subdivision'),
              r('city',         cityHtml,                 'City or local municipality'),
              r('coordinates',  locHtml,                  'Geographic coordinates'),
            ])}

            \${this.card('Infrastructure', [
              r('asn',         asnHtml,                'Autonomous System Number (Network Identifier)'),
              r('org',         orgHtml,                'Organization that owns or operates the ASN'),
              r('route',       routeHtml,              'BGP routing prefix for the network block'),
              r('reverse_dns', inf?.reverse_dns,       'PTR record mapping the IP back to a hostname'),
              r('registry',    regHtml,                'Regional Internet Registry (RIR) managing the IP'),
              r('allocation',  fmtAlloc(inf?.allocated, inf?.status), 'Date the IP block was allocated by the registry and its status'),
            ])}

            \${this.card('Identity', [
              r('type',          identityTypeHtml,             'Type of identity provider (e.g. cloud, isp, business)'),
              r('provider_name', providerNameHtml,             'Name of the service provider (e.g. AWS, Azure)'),
              r('domain',        domainHtml,                   'Primary domain of the service provider'),
              r('region',        providerRegionHtml,           'Provider-specific datacenter region'),
              r('service',       providerServiceHtml,          'Specific service or product (e.g. EC2, S3)'),
            ])}

            \${this.card('Security & Indicators', [
              r('is_anonymous', sec.is_anonymous, 'Indicates if the IP belongs to an anonymizing proxy/VPN', 'warning'),
              r('is_proxy',     sec.is_proxy,     'Indicates if the IP is a known proxy server', 'warning'),
              r('is_tor',       sec.is_tor,       'Indicates if the IP is a Tor exit node', 'bad'),
              r('is_vpn',       sec.is_vpn,       'Indicates if the IP belongs to a commercial VPN provider', 'warning'),
              r('is_threat',    sec.is_threat,    'Indicates if the IP has malicious/botnet activity', 'bad'),
              srcRow,
            ])}
          </div>

          <div class="p-foot">
            <span class="p-user">guest@oct8:~$</span>
            \${this._cmdInput.length > 0
              ? html\`<span class="p-cmd"> oct8</span><span class="p-sub"> inspect </span>\`
              : html\`<span style="color: var(--overlay0)"> oct8 inspect </span>\`
            }
            <span class="p-input">\${this._cmdInput}</span><span class="p-cursor">_</span>
          </div>
        \`;
      }
    }

    customElements.define('oct8-grid', Oct8Grid);
  </script>
</body>
</html>`;
};
