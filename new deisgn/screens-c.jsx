/* eslint-disable */
// Clean screens — Stock Ledger + Alerts

// ─── STOCK LEDGER ───────────────────────────────────────────────────
function LedgerScreen() {
  const ledgerActions = (
    <>
      <button className="btn btn-sm">Export CSV</button>
      <button className="btn btn-primary btn-sm">{Icon.plus}<span>Log adjustment</span></button>
    </>
  );

  return (
    <ScreenShell active="ledger" title="Stock ledger" subtitle="Every change to your stock — recorded and signed." topActions={ledgerActions}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Stat label="Movements this week" value="146" sub="purchases, usage, wastage" trend={{ dir: 'up', label: '12.3%' }} />
        <Stat label="Wastage this month" value="₹2,140" tone="bad" sub="manual losses logged" trend={{ dir: 'up', label: '+₹420' }} />
        <Stat label="Adjustments by owner" value="3" sub="this week" trend={{ dir: 'flat', label: 'No change' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Filters" subtitle="Narrow down what you want to see.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="fld-label">Stock item</label>
              <div className="fld" style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>All items</span><span style={{ color: 'var(--muted)' }}>{Icon.chevron}</span>
              </div>
            </div>
            <div>
              <label className="fld-label">Movement</label>
              <div className="fld" style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>All types</span><span style={{ color: 'var(--muted)' }}>{Icon.chevron}</span>
              </div>
            </div>
            <div>
              <label className="fld-label">From</label>
              <input className="fld" defaultValue="1 May 2026" />
            </div>
            <div>
              <label className="fld-label">To</label>
              <input className="fld" defaultValue="24 May 2026" />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Showing 18 of 146</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">Reset</button>
              <button className="btn btn-primary btn-sm">Apply</button>
            </div>
          </div>
        </Card>

        <Card title="Log an adjustment" subtitle="Owner-only. Used for wastage, breakage, or corrections." right={<span className="pill pill-accent"><span className="dot" />Owner only</span>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.6fr 0.9fr', gap: 8 }}>
            <div>
              <label className="fld-label">Item</label>
              <div className="fld">Tomato</div>
            </div>
            <div>
              <label className="fld-label">Qty</label>
              <input className="fld t-num" defaultValue="-0.700" />
            </div>
            <div>
              <label className="fld-label">Unit</label>
              <div className="fld">kg</div>
            </div>
            <div>
              <label className="fld-label">Type</label>
              <div className="fld" style={{ color: 'var(--bad)' }}>Wastage</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="fld-label">Reason</label>
            <input className="fld" defaultValue="Spoilage in walk-in fridge overnight" />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }}>Sign & log</button>
            <button className="btn">Cancel</button>
          </div>
        </Card>
      </div>

      <Card
        title="Ledger entries"
        subtitle="Every movement, newest first."
        style={{ marginTop: 16 }}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="pill pill-ok">6 purchases</span>
            <span className="pill">9 usage</span>
            <span className="pill pill-bad">3 wastage</span>
          </div>
        }
        padded={false}
      >
        <table className="tbl">
          <thead>
            <tr>
              <th>When</th>
              <th>Item</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Note</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['24 May, 3:16 pm', 'Potato', 'USAGE',    '−2 kg',     '96 kg',   'Lunch service, station 2',  'M.K.'],
              ['24 May, 2:42 pm', 'Potato', 'PURCHASE', '+100 kg',   '98 kg',   'Bill #1234 from Ramesh',    'System'],
              ['24 May, 2:38 pm', 'Tomato', 'PURCHASE', '+10 kg',    '10 kg',   'Bill #a0227',               'System'],
              ['24 May, 1:10 pm', 'Oil',    'USAGE',    '−1.5 L',    '14.5 L',  'Fryer top-up, evening prep','M.K.'],
              ['24 May, 11:00 am','Tomato', 'WASTAGE',  '−0.7 kg',   '9.3 kg',  'Spoilage in walk-in fridge','Owner'],
              ['23 May, 10:10 pm','Salt',   'USAGE',    '−0.5 kg',   '4.5 kg',  'Dinner service',            'R.P.'],
              ['23 May, 6:42 pm', 'Dal',    'USAGE',    '−10 kg',    '0 kg',    'Depleted to zero',          'M.K.'],
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--muted)' }}>{r[0]}</td>
                <td style={{ fontWeight: 500 }}>{r[1]}</td>
                <td><StatusPill status={r[2]} /></td>
                <td className="t-num" style={{ textAlign: 'right' }}>{r[3]}</td>
                <td className="t-num" style={{ textAlign: 'right', color: 'var(--muted)' }}>{r[4]}</td>
                <td style={{ color: 'var(--muted)' }}>{r[5]}</td>
                <td><span className="pill" style={{ fontSize: 11, padding: '2px 8px' }}>{r[6]}</span></td>
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
  const alertActions = (
    <>
      <button className="btn btn-sm">Mute settings</button>
      <button className="btn btn-primary btn-sm">Resolve all</button>
    </>
  );

  return (
    <ScreenShell active="alerts" title="Alerts" subtitle="Things we noticed that might need a second look." topActions={alertActions}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Stat label="Active alerts"   value="4"  tone="bad" sub="need your attention" trend={{ dir: 'up',   label: '+2 today' }} />
        <Stat label="Critical"        value="2"  sub="could mean lost money"          trend={{ dir: 'up',   label: '+1' }} />
        <Stat label="Warnings"        value="2"  sub="unit or quantity issues"        trend={{ dir: 'flat', label: 'No change' }} />
        <Stat label="Resolved this week" value="11" sub="avg. 2.4h to close"          trend={{ dir: 'down', label: '−18%' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Filter alerts">
          <div>
            <label className="fld-label">Severity</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'All',      active: false },
                { label: 'Critical', active: true },
                { label: 'Warning',  active: false },
              ].map((t) => (
                <span key={t.label} className={`pill ${t.active ? 'pill-dark' : ''}`} style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>{t.label}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="fld-label">Status</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'Active',   active: true },
                { label: 'Resolved', active: false },
                { label: 'Muted',    active: false },
              ].map((t) => (
                <span key={t.label} className={`pill ${t.active ? 'pill-dark' : ''}`} style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>{t.label}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-2)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Last 30 days</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 3 }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const v = [0,1,0,2,0,1,3,2,0,0,1,2,1,0,3,1,0,2,1,3,0,1,0,2,3,1,0,0,1,2][i] ?? 0;
                const bg = ['#f4f4f2', '#fde2df', '#f3a8a3', 'var(--accent)'][v];
                return <span key={i} style={{ height: 14, background: bg, borderRadius: 3 }} title={`${v} alerts`} />;
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
              <span>Less</span>
              <span style={{ display: 'flex', gap: 3 }}>
                {['#f4f4f2', '#fde2df', '#f3a8a3', 'var(--accent)'].map((c) => (
                  <span key={c} style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
                ))}
              </span>
              <span>More</span>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              sev: 'Critical', tone: 'bad',
              title: 'Tomato is 240% more expensive than usual',
              meta: ['Bill #1234', 'Ramesh', 'Today, 2:42 pm'],
              detail: 'Today\'s rate is ₹40/kg. Your 30-day average is ₹11.80/kg. No reason was logged for the increase.',
              actions: ['Review bill', 'Call vendor', 'Mute'],
            },
            {
              sev: 'Critical', tone: 'bad',
              title: 'Two nearly-identical bills from Ramesh',
              meta: ['Bills #1234 & #1234-A', 'One minute apart'],
              detail: 'Same line items (Potato 100kg at ₹22) on both bills. Approving both would double-count 100kg of stock.',
              actions: ['Merge', 'Keep one', 'Escalate'],
            },
            {
              sev: 'Warning', tone: 'warn',
              title: 'Unit mismatch on cooking oil',
              meta: ['Bill #F-2317', 'Fresh Market', '21 May'],
              detail: 'Bill says "ltr" but your stock uses "L". The ledger won\'t update until this is corrected.',
              actions: ['Fix unit', 'Ignore'],
            },
            {
              sev: 'Warning', tone: 'warn',
              title: 'Unusual dal usage at station 2',
              meta: ['Yesterday, 6:42 pm'],
              detail: '12 kg of dal was used in an hour — that\'s about 4× what we usually see at that time. Worth a look?',
              actions: ['View ledger', 'OK'],
            },
          ].map((a, i) => {
            const dot = a.tone === 'bad' ? 'var(--bad)' : 'var(--warn)';
            return (
              <div key={i} className="card" style={{ padding: 20, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 3,
                  background: dot,
                }} />
                <div style={{ paddingLeft: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span className={`pill ${a.tone === 'bad' ? 'pill-bad' : 'pill-warn'}`}>
                        <span className="dot" />{a.sev}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {a.meta.join(' · ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{a.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.55 }}>{a.detail}</div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                      {a.actions.map((act, k) => (
                        <button key={act} className={`btn btn-sm ${k === 0 ? 'btn-primary' : ''}`}>
                          {act}{k === 0 && a.actions.length > 1 ? <span style={{ marginLeft: 4 }}>{Icon.arrow}</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}

window.LedgerScreen = LedgerScreen;
window.AlertsScreen = AlertsScreen;
