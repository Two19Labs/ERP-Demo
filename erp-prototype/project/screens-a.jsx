/* eslint-disable */
// Main app screens — Dashboard, Setup, Bill Capture, Register, Ledger, Alerts

// ─── DASHBOARD ──────────────────────────────────────────────────────
function DashboardScreen() {
  return (
    <ScreenShell active="dashboard" phase={4} title="Stock control / dashboard" role="STAFF">
      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Stat kicker="STOCK VALUE · ESTIMATE" value="9,800" denom="₹" sub="Total valuation based on last purchased item prices." trend="▲ 2.4%" />
        <Stat kicker="LOW STOCK ALERTS" value="03" accent sub="Active items at or below low-stock threshold." trend="▲ 1" />
        <Stat kicker="BILLS · REVIEW QUEUE" value="00" sub="Unapproved bills in draft or pending review." trend="― 0" />
        <Stat kicker="USAGE · LAST 24H" value="12" denom="entries" sub="Auto + manual stock movements logged today." trend="● LIVE" />
      </div>

      {/* Mid section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginTop: 24 }}>
        <Card kicker="► ATTENTION REQUIRED" title="Low stock alerts" right={<span className="tag tag-accent">03 ITEMS</span>}>
          <table className="tbl">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>CATEGORY</th>
                <th style={{ textAlign: 'right' }}>CURRENT</th>
                <th style={{ textAlign: 'right' }}>MIN</th>
                <th style={{ textAlign: 'right' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Dal',          'Spices',    '0.000',  '10.000', 'kg',    'OUT', 'bad'],
                ['Sugar packets','Dry goods', '0.000',  '2.000',  'piece', 'OUT', 'bad'],
                ['Tomatoes',     'Vegetables','10.000', '10.000', 'kg',    'LOW', 'warn'],
                ['Cooking oil',  'Liquids',   '14.500', '20.000', 'ltr',   'LOW', 'warn'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td>
                  <td style={{ color: 'var(--muted)' }}>{r[1]}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r[2]}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--muted)' }}>{r[3]} {r[4]}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`tag ${r[6] === 'bad' ? 'tag-accent' : 'tag-warn'}`}>
                      <span className={`dot dot-${r[6]}`} style={{ width: 5, height: 5 }} /> {r[5]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card kicker="► PURCHASE REGISTERS" title="Recent purchases" right={<span className="kicker">LAST 7D</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              ['21 MAY', 'Ramesh',      '₹10,000.00', 'APPROVED', 'ok'],
              ['20 MAY', 'GreenGrocer', '₹4,250.00',  'APPROVED', 'ok'],
              ['18 MAY', 'Patel Oils',  '₹8,800.00',  'DRAFT',    'warn'],
              ['16 MAY', 'Spice Co.',   '₹2,140.00',  'FLAGGED',  'bad'],
            ].map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto auto', alignItems: 'center', padding: '14px 0', borderBottom: '1px dashed var(--hair)', fontSize: 12 }}>
                <span className="kicker" style={{ color: 'var(--ink)' }}>{r[0]}</span>
                <span style={{ fontWeight: 600 }}>{r[1]}</span>
                <span className="num" style={{ marginRight: 12 }}>{r[2]}</span>
                <span className={`tag ${r[4] === 'bad' ? 'tag-accent' : r[4] === 'warn' ? 'tag-warn' : 'tag-ok'}`}>{r[3]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom strip */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card kicker="► AUDIT TRAIL · LAST 12 EVENTS" title="Recent stock movements">
          <table className="tbl">
            <thead>
              <tr>
                <th>TIME</th>
                <th>ITEM</th>
                <th>TYPE</th>
                <th style={{ textAlign: 'right' }}>QTY</th>
                <th>NOTE</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['15:16', 'Potato',   'USAGE',    '−2.000 kg',  'used in lunch service', 'warn'],
                ['14:42', 'Potato',   'PURCHASE', '+100.000 kg','auto · bill #1234', 'ok'],
                ['14:38', 'Tomato',   'PURCHASE', '+10.000 kg', 'auto · bill #a0227', 'ok'],
                ['13:10', 'Oil',      'USAGE',    '−1.500 ltr', 'fryer top-up', 'warn'],
                ['11:00', 'Tomato',   'WASTAGE',  '−0.700 kg',  'spoilage · owner', 'bad'],
              ].map((r, i) => (
                <tr key={i}>
                  <td className="num kicker" style={{ color: 'var(--ink)' }}>{r[0]}</td>
                  <td style={{ fontWeight: 600 }}>{r[1]}</td>
                  <td>
                    <span className={`tag ${r[5] === 'bad' ? 'tag-accent' : r[5] === 'warn' ? 'tag-warn' : 'tag-ok'}`}>{r[2]}</span>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{r[3]}</td>
                  <td style={{ color: 'var(--muted)' }}>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card kicker="► CURRENT GOAL" title="Monitor & flag" dotgrid>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 4 }}>
            Watch stock levels through the day. Review entries logged by staff. Flag anything suspicious before it becomes a loss.
          </p>
          <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--hair)', background: '#fff' }}>
            <div className="kicker" style={{ marginBottom: 8 }}>NEXT ACTION</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Approve bill #1234 from Ramesh</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Pending 23 minutes</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 10 }}>► OPEN</button>
              <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 10 }}>SNOOZE</button>
            </div>
          </div>
        </Card>
      </div>
    </ScreenShell>
  );
}

// ─── STOCK SETUP ────────────────────────────────────────────────────
function SetupScreen() {
  return (
    <ScreenShell active="setup" phase={2} title="Stock setup / items & vendors" role="OWNER">
      {/* tabs + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16 }}>
        <Card kicker="► REFERENCE DATA" title="Stock setup for bill capture" right={<span className="tag tag-accent">OWNER MODE</span>}>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: '4px 0 12px' }}>
            Define items the kitchen tracks and vendors approved to supply them. Both feed downstream bill capture and audits.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-accent" style={{ padding: '10px 14px', fontSize: 11 }}>+ NEW ITEM</button>
            <button className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: 11 }}>+ NEW VENDOR</button>
            <button className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: 11 }}>IMPORT CSV</button>
          </div>
        </Card>
        <Stat kicker="STOCK ITEMS" value="04" sub="Items the restaurant buys, stores, and tracks." trend="▲ 1 THIS WEEK" />
        <Stat kicker="VENDORS · APPROVED" value="03" sub="Approved suppliers used to verify incoming bills." trend="0 PENDING" />
      </div>

      {/* tabs */}
      <div style={{ marginTop: 24, display: 'flex', gap: 0, borderBottom: '1px solid var(--hair)' }}>
        {['STOCK ITEMS', 'VENDORS', 'CATEGORIES', 'UNITS'].map((t, i) => (
          <div key={t} style={{ padding: '12px 18px', borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid transparent', fontSize: 11, letterSpacing: '0.14em', color: i === 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: i === 0 ? 600 : 400 }}>
            [{String(i + 1).padStart(2, '0')}] {t}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, paddingRight: 4 }}>
          <input className="fld" placeholder="► search items..." style={{ padding: '6px 10px', fontSize: 11, width: 220 }} />
        </div>
      </div>

      <Card kicker="► WORKSPACE" title="Manage stock records" right={<span className="kicker">SHOWING 04 OF 04</span>} style={{ marginTop: 16 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>ITEM</th>
              <th>CATEGORY</th>
              <th>UNIT</th>
              <th style={{ textAlign: 'right' }}>ON HAND</th>
              <th style={{ textAlign: 'right' }}>MIN</th>
              <th style={{ textAlign: 'right' }}>LAST RATE</th>
              <th>VENDOR · DEFAULT</th>
              <th style={{ textAlign: 'right' }}>STATE</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['01', 'Tomatoes',      'Vegetables', 'kg',    '10.000', '10.000', '₹40.00', 'GreenGrocer', 'LOW',  'warn'],
              ['02', 'Potato',        'Vegetables', 'kg',    '98.000', '20.000', '₹22.00', 'GreenGrocer', 'OK',   'ok'],
              ['03', 'Dal',           'Spices',     'kg',    '0.000',  '10.000', '₹120.00','Ramesh',      'OUT',  'bad'],
              ['04', 'Sugar packets', 'Dry goods',  'piece', '0.000',  '2.000',  '₹4.00',  'Patel Oils',  'OUT',  'bad'],
            ].map((r, i) => (
              <tr key={i}>
                <td className="kicker">{r[0]}</td>
                <td style={{ fontWeight: 600 }}>{r[1]}</td>
                <td style={{ color: 'var(--muted)' }}>{r[2]}</td>
                <td style={{ color: 'var(--muted)' }}>{r[3]}</td>
                <td className="num" style={{ textAlign: 'right' }}>{r[4]}</td>
                <td className="num" style={{ textAlign: 'right', color: 'var(--muted)' }}>{r[5]}</td>
                <td className="num" style={{ textAlign: 'right' }}>{r[6]}</td>
                <td>{r[7]}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`tag ${r[9] === 'bad' ? 'tag-accent' : r[9] === 'warn' ? 'tag-warn' : 'tag-ok'}`}>{r[8]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </ScreenShell>
  );
}

window.DashboardScreen = DashboardScreen;
window.SetupScreen = SetupScreen;
