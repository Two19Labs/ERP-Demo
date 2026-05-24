/* eslint-disable */
// Bill Capture + Purchase Register

// ─── BILL CAPTURE ───────────────────────────────────────────────────
function BillCaptureScreen() {
  return (
    <ScreenShell active="bill" phase={5} title="Bill capture / digitize" role="STAFF">
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Card kicker="► PASTED INVOICE DIGITIZATION" title="Paste bills for review" right={
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="tag"><span className="dot dot-accent" style={{ width: 5, height: 5 }} />AI · ON</span>
            <span className="tag tag-ghost">SETTINGS</span>
          </div>
        }>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            Digitize and submit supplier bills for owner review. Staff entries are saved as drafts in pending status.
          </p>
        </Card>
        <Stat kicker="QUEUE · TODAY" value="07" denom="bills" sub="Captured · awaiting owner review." trend="● 02 NEW" />
      </div>

      {/* tabs */}
      <div style={{ marginTop: 20, display: 'flex', gap: 0, borderBottom: '1px solid var(--hair)' }}>
        {['WHATSAPP PASTE', 'UPLOAD BILL · OCR', 'VOICE INPUT'].map((t, i) => (
          <div key={t} style={{ padding: '12px 18px', borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid transparent', fontSize: 11, letterSpacing: '0.14em', color: i === 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: i === 0 ? 600 : 400 }}>
            [{String(i + 1).padStart(2, '0')}] {t}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Paste */}
        <Card kicker="► DATA ENTRY" title="Digitize supplier invoice" right={<span className="tag"><span className="dot" style={{ background: 'var(--accent)', width: 5, height: 5 }} />MIC</span>}>
          <label className="fld-label">WHATSAPP CHAT COPY / RAW INVOICE TEXT</label>
          <div style={{ position: 'relative', background: '#0a0a0a', color: '#e8e8e6', padding: 16, fontSize: 12, lineHeight: 1.7, height: 290, overflow: 'hidden', fontFamily: 'JetBrains Mono, monospace' }}>
            <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 9, color: '#5a5a5a', letterSpacing: '0.18em' }}>RAW · 248 CHARS</div>
            <div style={{ color: '#7a7a76' }}>{`> 21 may · 14:12`}</div>
            <div style={{ marginTop: 8 }}>Fresh Market Supplier</div>
            <div style={{ marginTop: 4 }}>
              I bought <span style={{ background: 'rgba(230,51,42,0.25)', color: '#fff', padding: '0 2px' }}>tomato</span> for <span style={{ background: 'rgba(230,51,42,0.25)', color: '#fff', padding: '0 2px' }}>10 rupees</span> per kilo and bought <span style={{ background: 'rgba(230,51,42,0.25)', color: '#fff', padding: '0 2px' }}>100 kilos</span>
            </div>
            <div style={{ marginTop: 4 }}>
              also basmati rice <span style={{ background: 'rgba(230,51,42,0.25)', color: '#fff', padding: '0 2px' }}>25 kg @ 60 rs</span> and cooking oil <span style={{ background: 'rgba(230,51,42,0.25)', color: '#fff', padding: '0 2px' }}>10 litres for 110 per ltr</span>
            </div>
            <div style={{ marginTop: 8, color: '#7a7a76' }}>total approx 4350</div>
            <div style={{ position: 'absolute', left: 16, bottom: 12, fontSize: 9, letterSpacing: '0.18em', color: '#7a7a76' }}>
              ████ ●●● PARSING ▶ 03 LINE ITEMS DETECTED
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-accent" style={{ flex: 1, justifyContent: 'space-between', padding: '14px 16px', fontSize: 12 }}>
              <span>► RUN EXTRACTION</span><span>↵</span>
            </button>
            <button className="btn btn-ghost" style={{ padding: '14px 16px', fontSize: 12 }}>CLEAR</button>
          </div>
          <div style={{ marginTop: 12, padding: 10, border: '1px dashed var(--hair)', fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>► MODEL: house-extract · v04</span>
            <span>CONF. <span style={{ color: 'var(--ok)' }}>● 94%</span></span>
          </div>
        </Card>

        {/* Preview */}
        <Card kicker="► DRAFT VERIFICATION" title="Extracted bill preview" right={<span className="tag tag-warn">UNVERIFIED</span>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, fontSize: 11, padding: 12, background: '#fafafa', border: '1px solid var(--hair)' }}>
            <span className="kicker">VENDOR</span><span style={{ fontWeight: 600 }}>Fresh Market Supplier</span>
            <span className="kicker">BILL DATE</span><span>21 May 2026</span>
            <span className="kicker">BILL NO.</span><span style={{ color: 'var(--muted)' }}>auto · F-{Math.floor(Math.random()*9000)}</span>
            <span className="kicker">TOTAL</span><span style={{ fontWeight: 600 }}>₹ 4,350.00</span>
          </div>

          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>ITEM</th>
                <th style={{ textAlign: 'right' }}>QTY</th>
                <th style={{ textAlign: 'right' }}>RATE</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Tomato',       '100.000 kg',  '₹10.00',  '₹1,000.00'],
                ['Basmati rice', '25.000 kg',   '₹60.00',  '₹1,500.00'],
                ['Cooking oil',  '10.000 ltr',  '₹110.00', '₹1,100.00'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r[1]}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r[2]}</td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--accent)', background: 'rgba(230,51,42,0.05)', fontSize: 11, lineHeight: 1.6 }}>
            <div className="kicker kicker-accent" style={{ marginBottom: 4 }}>► AI FLAG</div>
            <span>Total mismatch: lines sum to ₹3,600 — chat says ₹4,350. Reconcile before approving.</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '12px', fontSize: 11 }}>► SUBMIT FOR REVIEW</button>
            <button className="btn btn-ghost" style={{ padding: '12px', fontSize: 11 }}>EDIT</button>
          </div>
        </Card>
      </div>
    </ScreenShell>
  );
}

// ─── PURCHASE REGISTER ──────────────────────────────────────────────
function RegisterScreen() {
  return (
    <ScreenShell active="register" phase={3} title="Manual purchase register" role="STAFF">
      {/* head row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16 }}>
        <Card kicker="► DATA ENTRY WORKFLOW" title="Submit purchase bills for owner review">
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: '4px 0 0' }}>
            Capture supplier bill lines clearly so the owner can approve real stock movement against ledger.
          </p>
        </Card>
        <Card kicker="► FILTER BY BILL DATE" title="2026 / 05 / 24" right={<span className="kicker">TODAY</span>}>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {['1D', '7D', '30D', 'ALL'].map((p, i) => (
              <span key={p} className={`tag ${i === 1 ? 'tag-solid' : ''}`}>{p}</span>
            ))}
          </div>
        </Card>
        <Stat kicker="DRAFTS · OPEN" value="01" sub="Bills currently being captured by staff." trend="01 SAVING" />
      </div>

      {/* main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Bill entry */}
        <Card kicker="► CAPTURE BILL ITEMS" title="Bill & line item entry" right={<span className="tag tag-warn">STAFF · DRAFT</span>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="fld-label">VENDOR</label>
              <div className="fld" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Ramesh</span><span style={{ color: 'var(--muted)' }}>▾</span>
              </div>
            </div>
            <div>
              <label className="fld-label">BILL DATE</label>
              <input className="fld" defaultValue="2026 / 05 / 24" />
            </div>
            <div>
              <label className="fld-label">BILL NO.</label>
              <input className="fld" defaultValue="1234" />
            </div>
            <div>
              <label className="fld-label">RECEIVED BY</label>
              <input className="fld" defaultValue="Manthan K." />
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--hair)' }}>
            <div className="kicker" style={{ marginBottom: 10 }}>► LINE ITEMS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.6fr 0.8fr 0.8fr 20px', gap: 8, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em', marginBottom: 6 }}>
              <span>ITEM</span><span style={{ textAlign: 'right' }}>QTY</span><span>UNIT</span><span style={{ textAlign: 'right' }}>RATE ₹</span><span style={{ textAlign: 'right' }}>TOTAL ₹</span><span />
            </div>
            {[
              ['Potato',      '100.000', 'kg',  '22.00',  '2,200.00'],
              ['Tomato',      '10.000',  'kg',  '40.00',  '400.00'],
              ['Salt',        '5.000',   'kg',  '18.00',  '90.00'],
              ['+ ADD LINE',  '',        '',    '',       ''],
            ].map((r, i) => {
              const isAdd = r[0].startsWith('+');
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.6fr 0.8fr 0.8fr 20px', gap: 8, padding: '8px 0', borderBottom: '1px dashed var(--hair)', alignItems: 'center', fontSize: 12, color: isAdd ? 'var(--accent)' : 'var(--ink)' }}>
                  <span style={{ fontWeight: isAdd ? 600 : 500 }}>{r[0]}</span>
                  <span className="num" style={{ textAlign: 'right' }}>{r[1]}</span>
                  <span style={{ color: 'var(--muted)' }}>{r[2]}</span>
                  <span className="num" style={{ textAlign: 'right' }}>{r[3]}</span>
                  <span className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{r[4]}</span>
                  <span style={{ color: 'var(--muted-2)' }}>{isAdd ? '↵' : '×'}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Preview / draft */}
        <Card kicker="► DRAFT RECEIPT" title="Purchase bill preview" right={<span className="kicker">REV.01</span>}>
          <div style={{ position: 'relative', background: '#fafafa', border: '1px dashed var(--hair)', padding: 20 }}>
            <div className="dotgrid" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--ink)', paddingBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>RAMESH</span>
                <span className="kicker">BILL · 1234</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                <span>RECV 24 MAY 2026 · 14:22</span>
                <span>BY MANTHAN K.</span>
              </div>

              <div style={{ marginTop: 18 }}>
                {[
                  ['POTATO',  '100.000 kg', '₹ 2,200.00'],
                  ['TOMATO',  '10.000 kg',  '₹   400.00'],
                  ['SALT',    '5.000 kg',   '₹    90.00'],
                ].map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', padding: '8px 0', borderBottom: '1px dashed var(--hair)', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{r[0]}</span>
                    <span className="num" style={{ color: 'var(--muted)' }}>{r[1]}</span>
                    <span className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{r[2]}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="kicker">TOTAL · INR</span>
                <span className="display-num" style={{ fontSize: 28 }}>₹ 2,690.00</span>
              </div>
              <div className="matrix-line" style={{ marginTop: 8 }} />
              <div style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.16em', color: 'var(--muted)' }}>
                ████ AWAITING OWNER SIGNATURE ████
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <button className="btn btn-accent" style={{ padding: '14px', justifyContent: 'space-between', fontSize: 12 }}>
              <span>► APPROVE & SAVE BILL</span><span>↵</span>
            </button>
            <button className="btn btn-ghost" style={{ padding: '14px 18px', fontSize: 12 }}>CLEAR</button>
          </div>
        </Card>
      </div>
    </ScreenShell>
  );
}

window.BillCaptureScreen = BillCaptureScreen;
window.RegisterScreen = RegisterScreen;
