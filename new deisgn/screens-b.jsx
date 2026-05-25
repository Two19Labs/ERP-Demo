/* eslint-disable */
// Clean screens — Bill Capture + Purchase Register

// ─── BILL CAPTURE ───────────────────────────────────────────────────
function BillCaptureScreen() {
  const billActions = (
    <>
      <span className="pill"><span className="dot" style={{ background: 'var(--ok)' }} />AI extraction on</span>
      <button className="btn btn-sm">Settings</button>
    </>
  );

  return (
    <ScreenShell active="bill" title="Bill capture" subtitle="Paste a supplier message — we'll turn it into a clean bill." topActions={billActions}>
      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'Paste from WhatsApp', active: true },
          { label: 'Upload a photo' },
          { label: 'Speak it' },
        ].map((t, i) => (
          <div key={t.label} style={{
            padding: '12px 16px',
            borderBottom: t.active ? '2px solid var(--ink)' : '2px solid transparent',
            marginBottom: -1,
            fontSize: 14,
            fontWeight: t.active ? 600 : 500,
            color: t.active ? 'var(--ink)' : 'var(--muted)',
            cursor: 'pointer',
          }}>{t.label}</div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
          7 bills waiting in your queue
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Paste */}
        <Card title="Paste the supplier message" subtitle="Copy from WhatsApp, SMS, or anywhere else.">
          <textarea
            className="fld"
            style={{ height: 220, resize: 'none', fontFamily: 'inherit', lineHeight: 1.6, fontSize: 14 }}
            defaultValue={`Fresh Market Supplier — 21 May, 2:12 pm\n\nI bought tomato for 10 rupees per kilo and bought 100 kilos. Also basmati rice 25 kg @ 60 rs and cooking oil 10 litres for 110 per ltr.\n\nTotal approx 4350`}
          />

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
              Read bill {Icon.arrow}
            </button>
            <button className="btn">Clear</button>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
            <span>Auto-detect language · English / हिंदी</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="dot" style={{ background: 'var(--ok)' }} />
              <span style={{ color: 'var(--ok)', fontWeight: 500 }}>94% confidence</span>
            </span>
          </div>
        </Card>

        {/* Preview */}
        <Card
          title="Extracted bill"
          subtitle="Check the details and submit for owner approval."
          right={<span className="pill pill-warn"><span className="dot" />Needs review</span>}
        >
          <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, fontSize: 14, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
            <span style={{ color: 'var(--muted)' }}>Vendor</span>
            <span style={{ fontWeight: 500 }}>Fresh Market Supplier</span>
            <span style={{ color: 'var(--muted)' }}>Bill date</span>
            <span>21 May 2026</span>
            <span style={{ color: 'var(--muted)' }}>Bill no.</span>
            <span style={{ color: 'var(--muted)' }}>F-2317 (auto)</span>
            <span style={{ color: 'var(--muted)' }}>Total</span>
            <span style={{ fontWeight: 600 }}>₹4,350.00</span>
          </div>

          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Tomato',       '100 kg', '₹10',  '₹1,000'],
                ['Basmati rice', '25 kg',  '₹60',  '₹1,500'],
                ['Cooking oil',  '10 L',   '₹110', '₹1,100'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r[0]}</td>
                  <td className="t-num" style={{ textAlign: 'right' }}>{r[1]}</td>
                  <td className="t-num" style={{ textAlign: 'right' }}>{r[2]}</td>
                  <td className="t-num" style={{ textAlign: 'right', fontWeight: 600 }}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 14, padding: 14, background: 'var(--accent-soft)', borderRadius: 10, border: '1px solid rgba(230,51,42,0.18)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Total doesn't match</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>
              Line items add up to ₹3,600 but the message says ₹4,350. Please reconcile before approving.
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Submit for review</button>
            <button className="btn">Edit</button>
          </div>
        </Card>
      </div>
    </ScreenShell>
  );
}

// ─── PURCHASE REGISTER ──────────────────────────────────────────────
function RegisterScreen() {
  const regActions = (
    <>
      <button className="btn btn-sm">Save draft</button>
      <button className="btn btn-primary btn-sm">Submit bill {Icon.arrow}</button>
    </>
  );

  return (
    <ScreenShell active="register" title="New purchase" subtitle="Enter bill details manually for owner approval." topActions={regActions}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        {/* Bill entry */}
        <Card title="Bill details" subtitle="Vendor, date, and what they delivered." right={<span className="pill pill-warn"><span className="dot" />Draft</span>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="fld-label">Vendor</label>
              <div className="fld" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span>Ramesh</span><span style={{ color: 'var(--muted)' }}>{Icon.chevron}</span>
              </div>
            </div>
            <div>
              <label className="fld-label">Bill date</label>
              <input className="fld" defaultValue="24 May 2026" />
            </div>
            <div>
              <label className="fld-label">Bill no.</label>
              <input className="fld" defaultValue="1234" />
            </div>
            <div>
              <label className="fld-label">Received by</label>
              <input className="fld" defaultValue="Manthan K." />
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Line items</div>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>{Icon.plus}<span>Add line</span></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 0.6fr 0.7fr 0.8fr 24px', gap: 8, fontSize: 12, color: 'var(--muted)', padding: '6px 8px', borderBottom: '1px solid var(--border-2)' }}>
              <span>Item</span>
              <span style={{ textAlign: 'right' }}>Qty</span>
              <span>Unit</span>
              <span style={{ textAlign: 'right' }}>Rate</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span />
            </div>
            {[
              ['Potato', '100',  'kg', '22', '₹2,200'],
              ['Tomato', '10',   'kg', '40', '₹400'],
              ['Salt',   '5',    'kg', '18', '₹90'],
            ].map((r, i, arr) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 0.6fr 0.7fr 0.8fr 24px', gap: 8,
                padding: '12px 8px', alignItems: 'center', fontSize: 14,
                borderBottom: i < arr.length - 1 ? '1px solid var(--border-2)' : 'none',
              }}>
                <span style={{ fontWeight: 500 }}>{r[0]}</span>
                <span className="t-num" style={{ textAlign: 'right' }}>{r[1]}</span>
                <span style={{ color: 'var(--muted)' }}>{r[2]}</span>
                <span className="t-num" style={{ textAlign: 'right' }}>₹{r[3]}</span>
                <span className="t-num" style={{ textAlign: 'right', fontWeight: 600 }}>{r[4]}</span>
                <span style={{ color: 'var(--muted-2)', cursor: 'pointer', textAlign: 'center' }}>×</span>
              </div>
            ))}

            <div style={{ marginTop: 12, padding: '12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total</span>
              <span className="t-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>₹2,690</span>
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card title="Bill preview" subtitle="This is what your owner will see.">
          <div style={{
            background: 'var(--surface-2)',
            borderRadius: 12,
            padding: 22,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Ramesh</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Vegetables & spices</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Bill no.</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>#1234</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
              <span>Received 24 May 2026, 2:22 pm</span>
              <span>By Manthan K.</span>
            </div>

            <div style={{ marginTop: 18 }}>
              {[
                ['Potato', '100 kg', '₹2,200'],
                ['Tomato', '10 kg',  '₹400'],
                ['Salt',   '5 kg',   '₹90'],
              ].map((r, i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr',
                  padding: '12px 0', fontSize: 14,
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-2)' : 'none',
                }}>
                  <span style={{ fontWeight: 500 }}>{r[0]}</span>
                  <span className="t-num" style={{ color: 'var(--muted)' }}>{r[1]}</span>
                  <span className="t-num" style={{ textAlign: 'right', fontWeight: 500 }}>{r[2]}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total</span>
              <span className="t-num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>₹2,690</span>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8, fontSize: 13, color: 'var(--muted)', textAlign: 'center', border: '1px dashed var(--border)' }}>
              Awaiting owner approval
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            Your owner will get a notification and can approve or send back for edits.
          </div>
        </Card>
      </div>
    </ScreenShell>
  );
}

window.BillCaptureScreen = BillCaptureScreen;
window.RegisterScreen = RegisterScreen;
