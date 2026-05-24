/* eslint-disable */
// Shared chrome — sidebar, header, kicker, surfaces

const NAV = [
  { id: '01', label: 'STOCK SETUP',       key: 'setup' },
  { id: '02', label: 'STOCK DASHBOARD',   key: 'dashboard' },
  { id: '03', label: 'BILL CAPTURE',      key: 'bill' },
  { id: '04', label: 'PURCHASE REGISTER', key: 'register' },
  { id: '05', label: 'STOCK LEDGER',      key: 'ledger' },
  { id: '06', label: 'ALERTS',            key: 'alerts' },
];

function Sidebar({ active, role = 'STAFF' }) {
  return (
    <aside className="sidebar" style={{ width: 260, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Wordmark */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 14, height: 14, background: 'var(--accent)', borderRadius: '50%' }} />
          <div style={{ fontSize: 11, letterSpacing: '0.22em', color: '#fff', fontWeight: 600 }}>
            STOCK<span style={{ color: 'var(--accent)' }}>//</span>CTRL
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 9, letterSpacing: '0.2em', color: 'var(--sidebar-muted)' }}>
          BACK-OFFICE · REV.04
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 0', flex: 1 }}>
        {NAV.map((n) => (
          <div key={n.key} className={`nav-item ${active === n.key ? 'active' : ''}`}>
            <span className="nav-num">{n.id}</span>
            <span>{n.label}</span>
            {active === n.key && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)' }}>●</span>
            )}
          </div>
        ))}
      </nav>

      {/* Foot */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid #1a1a1a', fontSize: 10, letterSpacing: '0.14em', color: 'var(--sidebar-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>SYS</span>
          <span style={{ color: '#7ec98a' }}>● ONLINE</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>SYNC</span>
          <span style={{ color: '#e8e8e6' }}>14:22 IST</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>ROLE</span>
          <span style={{ color: '#fff' }}>{role}</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ phase, title, role = 'STAFF', email = 'manthankabra441@gmail.com' }) {
  return (
    <div style={{ borderBottom: '1px solid var(--hair)', background: '#fff' }}>
      {/* phase strip */}
      <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="phase-strip">
          <span>PHASE</span>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{phase}/07</span>
          <span style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className={`seg ${i < phase ? 'on' : ''}`} />
            ))}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{email}</span>
          <span className={`tag ${role === 'OWNER' ? 'tag-accent' : ''}`}>
            <span className="dot" style={{ width: 6, height: 6, background: role === 'OWNER' ? 'var(--accent)' : 'var(--ink)' }} />
            {role}
          </span>
          <button className="btn btn-ghost">LOG OUT</button>
        </div>
      </div>
      {/* title bar */}
      <div style={{ padding: '20px 32px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="kicker" style={{ marginBottom: 8 }}>► CURRENT VIEW</div>
          <h1 style={{ fontSize: 28, lineHeight: 1 }}>{title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="kicker">{new Date().toISOString().slice(0,10)} · {new Date().toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false})}</span>
          <span style={{ width: 1, height: 14, background: 'var(--hair)' }} />
          <span className="kicker">REC #{Math.floor(Math.random()*900+100)}</span>
        </div>
      </div>
    </div>
  );
}

// A bordered surface card with optional kicker
function Card({ kicker, title, right, children, padded = true, dotgrid = false, style }) {
  return (
    <div className={`surface ${dotgrid ? 'dotgrid-fine' : ''}`} style={{ padding: padded ? 20 : 0, position: 'relative', ...style }}>
      {(kicker || title || right) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            {kicker && <div className="kicker" style={{ marginBottom: 6 }}>{kicker}</div>}
            {title && <h3 style={{ fontSize: 16, letterSpacing: '-0.01em' }}>{title}</h3>}
          </div>
          {right && <div>{right}</div>}
        </div>
      )}
      {children}
      {/* corner markers */}
      <span style={{ position: 'absolute', top: -3, left: -3, width: 6, height: 6, borderTop: '1px solid var(--ink)', borderLeft: '1px solid var(--ink)' }} />
      <span style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, borderTop: '1px solid var(--ink)', borderRight: '1px solid var(--ink)' }} />
      <span style={{ position: 'absolute', bottom: -3, left: -3, width: 6, height: 6, borderBottom: '1px solid var(--ink)', borderLeft: '1px solid var(--ink)' }} />
      <span style={{ position: 'absolute', bottom: -3, right: -3, width: 6, height: 6, borderBottom: '1px solid var(--ink)', borderRight: '1px solid var(--ink)' }} />
    </div>
  );
}

// Stat block (big number)
function Stat({ kicker, value, sub, accent = false, denom, trend }) {
  return (
    <div className="surface" style={{ padding: 22, position: 'relative', minHeight: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="kicker">{kicker}</div>
        {trend && <div className="kicker" style={{ color: accent ? 'var(--accent)' : 'var(--muted)' }}>{trend}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
        <div className="display-num" style={{ fontSize: 48, color: accent ? 'var(--accent)' : 'var(--ink)', lineHeight: 1 }}>{value}</div>
        {denom && <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{denom}</div>}
      </div>
      <div className="matrix-line" style={{ marginTop: 14, width: '60%' }} />
      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

// Hairline frame layout: sidebar + main
function ScreenShell({ active, phase, title, role = 'STAFF', email = 'manthankabra441@gmail.com', children, mainStyle }) {
  return (
    <div className="artboard-root" style={{ display: 'flex' }}>
      <Sidebar active={active} role={role} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>
        <TopBar phase={phase} title={title} role={role} email={email} />
        <div style={{ flex: 1, padding: '24px 32px', overflow: 'hidden', ...mainStyle }}>
          {children}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar, Card, Stat, ScreenShell, NAV });
