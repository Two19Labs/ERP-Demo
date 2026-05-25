/* eslint-disable */
// Clean screens — Dashboard + Setup

// ─── DASHBOARD ──────────────────────────────────────────────────────
function DashboardScreen() {
  const dashActions = (
    <>
      <SearchInput placeholder="Search stock, vendors, bills…" />
      <button className="btn btn-primary btn-sm">{Icon.plus}<span>New purchase</span></button>
    </>
  );

  return (
    <ScreenShell active="dashboard" title="Good afternoon, Manthan" subtitle="Here's how your kitchen stock is doing today." topActions={dashActions}>
      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Stat label="Stock value" value="₹9,800" sub="vs last week" trend={{ dir: 'up', label: '2.4%' }} />
        <Stat label="Low stock items" value="3" tone="bad" sub="need restocking" trend={{ dir: 'up', label: '+1' }} />
        <Stat label="Bills to review" value="0" sub="all caught up" trend={{ dir: 'flat', label: 'No change' }} />
        <Stat label="Today's activity" value="12" suffix="entries" sub="last update 2m ago" trend={{ dir: 'up', label: 'Live' }} />
      </div>

      {/* Mid section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginTop: 16 }}>
        <Card
          title="Low stock"
          subtitle="Items that need to be restocked soon."
          right={<span className="pill pill-bad">3 items</span>}
        >
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Current</th>
                <th style={{ textAlign: 'right' }}>Min</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Dal',           'Spices',     '0 kg',    '10 kg',  'OUT'],
                ['Sugar packets', 'Dry goods',  '0 pcs',   '2 pcs',  'OUT'],
                ['Tomatoes',      'Vegetables', '10 kg',   '10 kg',  'LOW'],
                ['Cooking oil',   'Liquids',    '14.5 L',  '20 L',   'LOW'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r[0]}</td>
                  <td style={{ color: 'var(--muted)' }}>{r[1]}</td>
                  <td className="t-num" style={{ textAlign: 'right' }}>{r[2]}</td>
                  <td className="t-num" style={{ textAlign: 'right', color: 'var(--muted)' }}>{r[3]}</td>
                  <td style={{ textAlign: 'right' }}><StatusPill status={r[4]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Recent purchases" subtitle="From the last 7 days." right={<span style={{ fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>View all</span>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { date: '21 May', vendor: 'Ramesh',      amount: '₹10,000', status: 'APPROVED' },
              { date: '20 May', vendor: 'GreenGrocer', amount: '₹4,250',  status: 'APPROVED' },
              { date: '18 May', vendor: 'Patel Oils',  amount: '₹8,800',  status: 'DRAFT' },
              { date: '16 May', vendor: 'Spice Co.',   amount: '₹2,140',  status: 'FLAGGED' },
            ].map((r, i, arr) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr auto auto',
                alignItems: 'center', gap: 12,
                padding: '14px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border-2)' : 'none',
              }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.date}</span>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{r.vendor}</span>
                <span className="t-num" style={{ fontSize: 14 }}>{r.amount}</span>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom strip */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title="Recent activity" subtitle="What's been happening in your kitchen.">
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Item</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['3:16 pm',  'Potato', 'USAGE',    '−2 kg',    'Used in lunch service'],
                ['2:42 pm',  'Potato', 'PURCHASE', '+100 kg',  'Bill #1234 from Ramesh'],
                ['2:38 pm',  'Tomato', 'PURCHASE', '+10 kg',   'Bill #a0227'],
                ['1:10 pm',  'Oil',    'USAGE',    '−1.5 L',   'Fryer top-up'],
                ['11:00 am', 'Tomato', 'WASTAGE',  '−0.7 kg',  'Spoilage, logged by owner'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--muted)' }}>{r[0]}</td>
                  <td style={{ fontWeight: 500 }}>{r[1]}</td>
                  <td><StatusPill status={r[2]} /></td>
                  <td className="t-num" style={{ textAlign: 'right' }}>{r[3]}</td>
                  <td style={{ color: 'var(--muted)' }}>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Needs your attention" subtitle="One thing to handle right now.">
          <div style={{
            padding: 16,
            background: 'var(--accent-soft)',
            borderRadius: 10,
            border: '1px solid rgba(230,51,42,0.18)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Bill awaiting approval</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 6 }}>
              Bill #1234 from Ramesh
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              ₹2,690 · waiting 23 minutes
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button className="btn btn-accent btn-sm">Open bill {Icon.arrow}</button>
              <button className="btn btn-ghost btn-sm">Snooze</button>
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            We'll surface bills, mismatches, and low-stock items here so you don't have to dig.
          </div>
        </Card>
      </div>
    </ScreenShell>
  );
}

// ─── STOCK SETUP ────────────────────────────────────────────────────
function SetupScreen() {
  const setupActions = (
    <>
      <SearchInput placeholder="Search items…" />
      <button className="btn btn-sm">Import CSV</button>
      <button className="btn btn-primary btn-sm">{Icon.plus}<span>New item</span></button>
    </>
  );

  return (
    <ScreenShell active="setup" title="Stock setup" subtitle="Define what your kitchen tracks and who you buy from." topActions={setupActions}>
      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Stat label="Stock items" value="4" sub="things you track" trend={{ dir: 'up', label: '+1 this week' }} />
        <Stat label="Approved vendors" value="3" sub="suppliers on file" trend={{ dir: 'flat', label: 'No change' }} />
        <Stat label="Categories" value="4" sub="Vegetables, spices, liquids, dry" trend={{ dir: 'flat', label: '—' }} />
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'Stock items', count: 4, active: true },
          { label: 'Vendors',     count: 3 },
          { label: 'Categories',  count: 4 },
          { label: 'Units',       count: 5 },
        ].map((t, i) => (
          <div key={t.label} style={{
            padding: '12px 16px',
            borderBottom: t.active ? '2px solid var(--ink)' : '2px solid transparent',
            marginBottom: -1,
            fontSize: 14,
            fontWeight: t.active ? 600 : 500,
            color: t.active ? 'var(--ink)' : 'var(--muted)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{t.label}</span>
            <span style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 999,
              background: t.active ? 'var(--ink)' : 'var(--border)',
              color: t.active ? '#fff' : 'var(--muted)',
              fontWeight: 600,
            }}>{t.count}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Card padded={false}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Item</th>
                <th>Category</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>On hand</th>
                <th style={{ textAlign: 'right' }}>Min</th>
                <th style={{ textAlign: 'right' }}>Last rate</th>
                <th>Default vendor</th>
                <th style={{ textAlign: 'right' }}>Status</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Tomatoes',      'Vegetables', 'kg',    '10',  '10', '₹40',  'GreenGrocer', 'LOW'],
                ['Potato',        'Vegetables', 'kg',    '98',  '20', '₹22',  'GreenGrocer', 'OK'],
                ['Dal',           'Spices',     'kg',    '0',   '10', '₹120', 'Ramesh',      'OUT'],
                ['Sugar packets', 'Dry goods',  'piece', '0',   '2',  '₹4',   'Patel Oils',  'OUT'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--muted-2)' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--ink)' }} />
                  </td>
                  <td style={{ fontWeight: 500 }}>{r[0]}</td>
                  <td style={{ color: 'var(--muted)' }}>{r[1]}</td>
                  <td style={{ color: 'var(--muted)' }}>{r[2]}</td>
                  <td className="t-num" style={{ textAlign: 'right' }}>{r[3]}</td>
                  <td className="t-num" style={{ textAlign: 'right', color: 'var(--muted)' }}>{r[4]}</td>
                  <td className="t-num" style={{ textAlign: 'right' }}>{r[5]}</td>
                  <td>{r[6]}</td>
                  <td style={{ textAlign: 'right' }}><StatusPill status={r[7]} /></td>
                  <td style={{ color: 'var(--muted-2)' }}>···</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
          <span>Showing 4 of 4 items</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" disabled style={{ opacity: 0.5 }}>Previous</button>
            <button className="btn btn-sm" disabled style={{ opacity: 0.5 }}>Next</button>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

window.DashboardScreen = DashboardScreen;
window.SetupScreen = SetupScreen;
