/* eslint-disable */
// Stock Ledger + Suspicious Bill Alerts

// ─── STOCK LEDGER ───────────────────────────────────────────────────
function LedgerScreen() {
  return (
    <ScreenShell active="ledger" phase={4} title="Stock movement / ledger" role="OWNER">
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }}>
        <Card kicker="► AUDIT TRAIL" title="Stock movement history">
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: '4px 0 0' }}>
            Filter recent stock adjustments or log a manual correction. Every change is immutable and signed.
          </p>
        </Card>
        <Stat kicker="MOVEMENTS · 7D" value="146" sub="Purchases, usage, wastage and corrections." trend="▲ 12.3%" />
        <Stat kicker="WASTAGE · ₹" value="2,140" accent denom="this month" sub="Manual losses logged · spoilage, breakage, overuse." trend="▲ ₹420" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginTop: 24 }}>
        <Card kicker="► FILTERS · LEDGER" title="Refine history" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="fld-label">STOCK ITEM</label>
              <div className="fld" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>All items</span><span style={{ color: 'var(--muted)' }}>▾</span>
              </div>
            </div>
            <div>
              <label className="fld-label">MOVEMENT TYPE</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['ALL', 'PURCHASE', 'USAGE', 'WASTE'].map((t, i) => (
                  <span key={t} className={`tag ${i === 0 ? 'tag-solid' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="fld-label">START</label>
              <input className="fld" defaultValue="2026 / 05 / 01" />
            </div>
            <div>
              <label className="fld-label">END</label>
              <input className="fld" defaultValue="2026 / 05 / 24" />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px dashed var(--hair)' }}>
            <span className="kicker">SHOWING 18 OF 146</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 10 }}>RESET</button>
              <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 10 }}>► APPLY</button>
            </div>
          </div>
        </Card>

        <Card kicker="► ACCESS · OWNER" title="Log manual adjustment" right={<span className="tag tag-accent">RESTRICTED</span>} style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr 0.7fr', gap: 8 }}>
            <div>
              <label className="fld-label">ITEM</label>
              <div className="fld">Tomato</div>
            </div>
            <div>
              <label className="fld-label">QTY</label>
              <input className="fld" defaultValue="-0.700" />
            </div>
            <div>
              <label className="fld-label">UNIT</label>
              <div className="fld">kg</div>
            </div>
            <div>
              <label className="fld-label">TYPE</label>
              <div className="fld" style={{ color: 'var(--accent)' }}>WASTAGE</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="fld-label">REASON · REQUIRED</label>
            <input className="fld" defaultValue="Spoilage in walk-in fridge overnight" />
          </div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <button className="btn btn-accent" style={{ padding: '12px', fontSize: 11 }}>► SIGN & LOG ADJUSTMENT</button>
            <button className="btn btn-ghost" style={{ padding: '12px 14px', fontSize: 11 }}>CANCEL</button>
          </div>
        </Card>
      </div>

      <Card kicker="► HISTORY · CHRONOLOGICAL" title="Stock ledger entries" right={
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="tag tag-ok">● PURCHASE 06</span>
          <span className="tag tag-warn">● USAGE 09</span>
          <span className="tag tag-accent">● WASTAGE 03</span>
        </div>
      } style={{ marginTop: 16 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>STOCK ITEM</th>
              <th>TYPE</th>
              <th style={{ textAlign: 'right' }}>QTY</th>
              <th style={{ textAlign: 'right' }}>BAL · AFTER</th>
              <th>NOTE / REF</th>
              <th style={{ textAlign: 'right' }}>BY</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['24 MAY · 15:16', 'Potato',  'USAGE',    '−2.000 kg',   '96.000 kg',  'lunch service · station-2',  'M.K.',     'warn'],
              ['24 MAY · 14:42', 'Potato',  'PURCHASE', '+100.000 kg', '98.000 kg',  'auto · bill #1234 / Ramesh',  'system',   'ok'],
              ['24 MAY · 14:38', 'Tomato',  'PURCHASE', '+10.000 kg',  '10.000 kg',  'auto · bill #a0227',          'system',   'ok'],
              ['24 MAY · 13:10', 'Oil',     'USAGE',    '−1.500 ltr',  '14.500 ltr', 'fryer top-up · evening prep', 'M.K.',     'warn'],
              ['24 MAY · 11:00', 'Tomato',  'WASTAGE',  '−0.700 kg',   '9.300 kg',   'spoilage · walk-in fridge',   'owner',    'bad'],
              ['23 MAY · 22:10', 'Salt',    'USAGE',    '−0.500 kg',   '4.500 kg',   'dinner service',              'R.P.',     'warn'],
              ['23 MAY · 18:42', 'Dal',     'USAGE',    '−10.000 kg',  '0.000 kg',   'depleted to zero',            'M.K.',     'warn'],
            ].map((r, i) => (
              <tr key={i}>
                <td className="num kicker" style={{ color: 'var(--ink)' }}>{r[0]}</td>
                <td style={{ fontWeight: 600 }}>{r[1]}</td>
                <td><span className={`tag ${r[7] === 'bad' ? 'tag-accent' : r[7] === 'warn' ? 'tag-warn' : 'tag-ok'}`}>{r[2]}</span></td>
                <td className="num" style={{ textAlign: 'right' }}>{r[3]}</td>
                <td className="num" style={{ textAlign: 'right', color: 'var(--muted)' }}>{r[4]}</td>
                <td style={{ color: 'var(--muted)' }}>{r[5]}</td>
                <td style={{ textAlign: 'right' }}><span className="tag tag-ghost" style={{ fontSize: 9 }}>{r[6]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </ScreenShell>
  );
}

// ─── ALERTS ─────────────────────────────────────────────────────────
function AlertsScreen() {
  return (
    <ScreenShell active="alerts" phase={7} title="Suspicious bill alerts" role="OWNER">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Stat kicker="ACTIVE ALERTS"  value="04" accent sub="Total unresolved flags requiring attention now." trend="▲ 2 TODAY" />
        <Stat kicker="CRITICAL · ₹"   value="02" sub="Could lead to financial loss or duplication." trend="▲ 1" />
        <Stat kicker="WARNINGS"       value="02" sub="Item / unit mismatches & unusual thresholds." trend="― 0" />
        <Stat kicker="RESOLVED · 7D"  value="11" sub="Closed by owner this week. Mean 2.4h." trend="▼ 18%" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 16, marginTop: 24 }}>
        <Card kicker="► AUDIT CONSOLE" title="Filter alerts" right={<span className="tag tag-accent">OWNER</span>}>
          <div>
            <label className="fld-label">SEVERITY</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'CRIT', 'WARN', 'INFO'].map((t, i) => (
                <span key={t} className={`tag ${i === 1 ? 'tag-accent' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="fld-label">STATUS</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ACTIVE', 'RESOLVED', 'MUTED'].map((t, i) => (
                <span key={t} className={`tag ${i === 0 ? 'tag-solid' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="fld-label">ALERT TYPE</label>
            <div className="fld" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>All types</span><span style={{ color: 'var(--muted)' }}>▾</span>
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--hair)' }}>
            <div className="kicker" style={{ marginBottom: 10 }}>► HEAT · LAST 30 DAYS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 3 }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const v = [0, 1, 2, 3][[0,1,0,2,0,1,3,2,0,0,1,2,1,0,3,1,0,2,1,3,0,1,0,2,3,1,0,0,1,2][i] ?? 0];
                const bg = ['#ececea', '#f4c8c6', '#ec7a73', 'var(--accent)'][v];
                return <span key={i} style={{ height: 14, background: bg }} title={`day ${i+1}: ${v} alerts`} />;
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.16em' }}>
              <span>LESS</span>
              <span style={{ display: 'flex', gap: 3 }}>
                {['#ececea', '#f4c8c6', '#ec7a73', 'var(--accent)'].map((c) => (
                  <span key={c} style={{ width: 10, height: 10, background: c }} />
                ))}
              </span>
              <span>MORE</span>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              sev: 'CRIT', tone: 'bad', kicker: '► PRICE HIKE · UNUSUAL',
              title: 'Tomato rate up 240% vs 30-day avg',
              meta: ['Bill #1234', 'Ramesh', '24 MAY 14:42'],
              detail: 'Captured rate ₹40.00/kg — running average ₹11.80/kg. No vendor change reason on file.',
              actions: ['REVIEW BILL', 'CONTACT VENDOR', 'MUTE'],
            },
            {
              sev: 'CRIT', tone: 'bad', kicker: '► DUPLICATE ENTRY · POSSIBLE',
              title: 'Two bills, same vendor, ±1 minute apart',
              meta: ['Bill #1234 + #1234-A', 'Ramesh', '24 MAY 14:42 / 14:43'],
              detail: 'Identical line items: Potato 100kg @ ₹22. Approving both would double stock by 100kg.',
              actions: ['MERGE', 'KEEP ONE', 'ESCALATE'],
            },
            {
              sev: 'WARN', tone: 'warn', kicker: '► UNIT MISMATCH',
              title: 'Cooking oil captured in "ltr", item canonical "L"',
              meta: ['Bill #F-2317', 'Fresh Market', '21 MAY 14:12'],
              detail: 'AI extractor used "ltr" — stock master expects "L". Will skip ledger update until corrected.',
              actions: ['CORRECT UNIT', 'IGNORE'],
            },
            {
              sev: 'WARN', tone: 'warn', kicker: '► QUANTITY THRESHOLD',
              title: 'Dal usage 12kg in 1h — exceeds station-typical',
              meta: ['Auto · ledger probe', 'Station-2', '23 MAY 18:42'],
              detail: 'Station-2 dal usage spike. Compared to last 30 days at same hour, this is 4.1× higher.',
              actions: ['INSPECT LEDGER', 'OK'],
            },
          ].map((a, i) => (
            <div key={i} className="surface" style={{ padding: 18, position: 'relative', borderLeft: `3px solid ${a.tone === 'bad' ? 'var(--accent)' : '#c87a00'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={`kicker ${a.tone === 'bad' ? 'kicker-accent' : ''}`}>{a.kicker}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`tag ${a.tone === 'bad' ? 'tag-accent' : 'tag-warn'}`}>
                    <span className={`dot dot-${a.tone}`} style={{ width: 5, height: 5 }} />{a.sev}
                  </span>
                  <span className="tag tag-ghost">ID #A-{1200 + i}</span>
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 14 }}>
                {a.meta.map((m, j) => (
                  <span key={j} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {j > 0 && <span style={{ color: 'var(--muted-2)' }}>·</span>}
                    {m}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>{a.detail}</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                {a.actions.map((act, k) => (
                  <button key={act} className={`btn ${k === 0 ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '8px 12px', fontSize: 10 }}>
                    {k === 0 ? '► ' : ''}{act}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

window.LedgerScreen = LedgerScreen;
window.AlertsScreen = AlertsScreen;
