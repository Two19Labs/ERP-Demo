/* eslint-disable */
// Clean auth — friendly sign-in

function AuthScreen() {
  return (
    <div className="artboard-root" style={{ background: 'var(--bg)', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Left: sign-in */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 56px' }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--ink)', color: '#fff',
            display: 'grid', placeItems: 'center',
            fontSize: 14, fontWeight: 700,
          }}>R</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Restaurant</div>
        </div>

        {/* Form */}
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            Sign in to manage your kitchen stock.
          </p>

          <div style={{ marginTop: 32 }}>
            <label className="fld-label">Email</label>
            <input className="fld" defaultValue="manthankabra441@gmail.com" />
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="fld-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>Password</span>
              <span style={{ color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input className="fld" type="password" defaultValue="••••••••••••" />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontWeight: 500 }}>Show</span>
            </div>
          </div>

          <label style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--ink)' }} />
            Remember me on this device
          </label>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, padding: '14px', justifyContent: 'center', fontSize: 15 }}>
            Sign in
            <span>{Icon.arrow}</span>
          </button>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            New here? <span style={{ color: 'var(--ink)', fontWeight: 500, cursor: 'pointer' }}>Contact your owner</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>© Restaurant 2026</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <span style={{ cursor: 'pointer' }}>Help</span>
            <span style={{ cursor: 'pointer' }}>Privacy</span>
          </span>
        </div>
      </div>

      {/* Right: soft visual */}
      <div style={{
        background: 'linear-gradient(160deg, #fdecea 0%, #f7f7f5 60%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}>
        <div style={{ maxWidth: 420, position: 'relative', zIndex: 1 }}>
          <div className="pill pill-accent" style={{ marginBottom: 18 }}>
            <span className="dot" />Less guesswork, more sleep
          </div>
          <h2 style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Know exactly what's in your kitchen — every bill, every kilo, every day.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6 }}>
            Paste a bill from WhatsApp. We'll do the rest. Approve in one tap, catch mistakes before they cost you.
          </p>

          {/* Decorative card preview */}
          <div style={{ marginTop: 32, padding: 20, background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 30px -16px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Today's stock</div>
              <span className="pill pill-ok"><span className="dot" />4 of 4 items</span>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Tomatoes',  '10 kg',    'Low',     'pill-warn'],
                ['Potato',    '98 kg',    'In stock','pill-ok'],
                ['Dal',       '0 kg',     'Out',     'pill-bad'],
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                  <span style={{ fontWeight: 500 }}>{r[0]}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="t-num" style={{ color: 'var(--muted)' }}>{r[1]}</span>
                    <span className={`pill ${r[3]}`} style={{ fontSize: 11 }}>{r[2]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Soft circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(230,51,42,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -120, width: 360, height: 360, borderRadius: '50%', background: 'rgba(230,51,42,0.04)' }} />
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
