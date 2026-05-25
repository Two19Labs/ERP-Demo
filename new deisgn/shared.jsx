/* eslint-disable */
// Clean shared chrome — sidebar, topbar, card, stat, shell

const Icon = {
  dashboard: <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  setup:     <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>,
  bill:      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>,
  register:  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  ledger:    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  alerts:    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  search:    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevron:   <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  arrow:     <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  up:        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  down:      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  flat:      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

const NAV = [
  { key: 'dashboard', label: 'Dashboard',     icon: Icon.dashboard },
  { key: 'setup',     label: 'Stock setup',   icon: Icon.setup },
  { key: 'bill',      label: 'Bill capture',  icon: Icon.bill },
  { key: 'register',  label: 'Purchases',     icon: Icon.register },
  { key: 'ledger',    label: 'Stock ledger',  icon: Icon.ledger },
  { key: 'alerts',    label: 'Alerts',        icon: Icon.alerts, badge: 4 },
];

function Sidebar({ active }) {
  return (
    <aside className="sidebar" style={{ width: 240, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Wordmark */}
      <div style={{ padding: '22px 22px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--ink)', color: '#fff',
            display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em',
          }}>R</div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Restaurant
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '6px 0', flex: 1 }}>
        <div style={{ padding: '0 24px 8px', fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Workspace
        </div>
        {NAV.map((n) => (
          <div key={n.key} className={`nav-item ${active === n.key ? 'active' : ''}`}>
            {n.icon}
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                background: active === n.key ? 'rgba(255,255,255,0.15)' : 'var(--accent-soft)',
                color: active === n.key ? '#fff' : 'var(--accent)',
                padding: '1px 7px', borderRadius: 999,
              }}>{n.badge}</span>
            )}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--sidebar-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#e8e8e6', color: 'var(--ink)',
            display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 600,
          }}>MK</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Manthan K.
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Staff</div>
          </div>
          <span style={{ color: 'var(--muted-2)' }}>{Icon.chevron}</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ title, subtitle, actions }) {
  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '20px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 22, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
      </div>
    </div>
  );
}

function SearchInput({ placeholder = 'Search…', width = 260 }) {
  return (
    <div style={{ position: 'relative', width }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>{Icon.search}</span>
      <input className="fld" placeholder={placeholder} style={{ paddingLeft: 36, fontSize: 13 }} />
      <span className="kbd" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>⌘K</span>
    </div>
  );
}

// Generic card
function Card({ title, subtitle, right, children, style, bodyStyle, padded = true }) {
  return (
    <div className="card" style={{ padding: padded ? 24 : 0, ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: subtitle ? 4 : 16, padding: padded ? 0 : '20px 24px 0' }}>
          <div>
            {title && <h3 style={{ fontSize: 16 }}>{title}</h3>}
            {subtitle && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</div>}
          </div>
          {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{right}</div>}
        </div>
      )}
      {subtitle && padded && <div style={{ height: 16 }} />}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

// Stat — friendly: small label, big number, tiny delta line
function Stat({ label, value, suffix, sub, trend, tone = 'neutral' }) {
  const trendColor =
    trend && trend.dir === 'up'   ? 'var(--ok)'  :
    trend && trend.dir === 'down' ? 'var(--bad)' :
    'var(--muted)';
  const trendIcon =
    trend && trend.dir === 'up'   ? Icon.up   :
    trend && trend.dir === 'down' ? Icon.down :
    Icon.flat;
  const valueColor = tone === 'bad' ? 'var(--bad)' : 'var(--ink)';

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="t-label" style={{ fontSize: 13 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
        <div className="t-num" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: valueColor }}>{value}</div>
        {suffix && <div style={{ fontSize: 14, color: 'var(--muted)' }}>{suffix}</div>}
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
        {trend && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: trendColor, fontWeight: 500 }}>
            {trendIcon}{trend.label}
          </span>
        )}
        {sub && <span style={{ color: 'var(--muted)' }}>{sub}</span>}
      </div>
    </div>
  );
}

// Status pill helper
function StatusPill({ status }) {
  const map = {
    OK:        { cls: 'pill-ok',     label: 'In stock' },
    LOW:       { cls: 'pill-warn',   label: 'Low' },
    OUT:       { cls: 'pill-bad',    label: 'Out' },
    APPROVED:  { cls: 'pill-ok',     label: 'Approved' },
    DRAFT:     { cls: 'pill-warn',   label: 'Draft' },
    FLAGGED:   { cls: 'pill-bad',    label: 'Flagged' },
    PURCHASE:  { cls: 'pill-ok',     label: 'Purchase' },
    USAGE:     { cls: 'pill',        label: 'Usage' },
    WASTAGE:   { cls: 'pill-bad',    label: 'Wastage' },
  };
  const m = map[status] || { cls: 'pill', label: status };
  return <span className={`pill ${m.cls}`}><span className="dot" />{m.label}</span>;
}

// Shell
function ScreenShell({ active, title, subtitle, topActions, children, mainStyle }) {
  return (
    <div className="artboard-root" style={{ display: 'flex' }}>
      <Sidebar active={active} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>
        <TopBar title={title} subtitle={subtitle} actions={topActions} />
        <div style={{ flex: 1, padding: '24px 32px', overflow: 'hidden', ...mainStyle }}>
          {children}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { Icon, Sidebar, TopBar, SearchInput, Card, Stat, StatusPill, ScreenShell, NAV });
