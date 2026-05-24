/* eslint-disable */
// Single auth screen — same for owner & manager. Email + password only.

function AuthScreen() {
  return (
    <div className="artboard-root" style={{ background: '#f4f4f2', position: 'relative' }}>
      {/* faint dotgrid */}
      <div className="dotgrid" style={{ position: 'absolute', inset: 0, opacity: 0.45 }} />

      {/* top utility */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ width: 12, height: 12, background: 'var(--accent)', borderRadius: '50%' }} />
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>STOCK<span style={{ color: 'var(--accent)' }}>//</span>CTRL</span>
          <span>v.04.2026</span>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <span>EN</span><span>·</span><span>हिं</span><span>·</span><span>SUPPORT</span>
        </div>
      </div>

      {/* corner ticks */}
      {[
        { top: 64,    left: 64,    bt: 1, bl: 1 },
        { top: 64,    right: 64,   bt: 1, br: 1 },
        { bottom: 64, left: 64,    bb: 1, bl: 1 },
        { bottom: 64, right: 64,   bb: 1, br: 1 },
      ].map((p, i) => (
        <span key={i} style={{ position: 'absolute', width: 14, height: 14, ...p,
          borderTop:    p.bt ? '1px solid var(--ink)' : 'none',
          borderBottom: p.bb ? '1px solid var(--ink)' : 'none',
          borderLeft:   p.bl ? '1px solid var(--ink)' : 'none',
          borderRight:  p.br ? '1px solid var(--ink)' : 'none',
        }} />
      ))}

      {/* centered card */}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 460, background: '#fff', border: '1px solid var(--ink)', padding: 40, position: 'relative' }}>
          {/* corner brackets on the card */}
          <span style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
          <span style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
          <span style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
          <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />

          <div className="kicker">► SIGN IN</div>

          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 14, lineHeight: 1 }}>
            Welcome back<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
            Use your account email and password to continue.
          </p>

          <div style={{ marginTop: 28 }}>
            <label className="fld-label">EMAIL</label>
            <input className="fld" defaultValue="manthankabra441@gmail.com" />
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="fld-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>PASSWORD</span>
              <span style={{ color: 'var(--accent)' }}>FORGOT?</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input className="fld" type="password" defaultValue="••••••••••••" />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em' }}>SHOW</span>
            </div>
          </div>

          <button className="btn btn-accent" style={{ width: '100%', marginTop: 28, padding: '16px', justifyContent: 'space-between', fontSize: 13 }}>
            <span>► CONTINUE</span>
            <span>→</span>
          </button>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--hair)', display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '0.16em', color: 'var(--muted)' }}>
            <span>● READY</span>
            <span>ENC · AES-256</span>
          </div>
        </div>
      </div>

      {/* bottom util */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 32px', display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '0.18em', color: 'var(--muted)' }}>
        <span>© RESTAURANT STOCK CONTROL · ALL TRANSACTIONS LOGGED</span>
        <span>NODE-IN-01 · RAJKOT</span>
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
