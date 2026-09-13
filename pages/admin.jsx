import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const RACES = ['cyborg', 'fishman', 'mink', 'skypiean', 'ghoul', 'bunny'];

const RACE_COLOR = {
  cyborg: '#4FC3F7', fishman: '#29B6F6', mink: '#FFD54F',
  skypiean: '#CE93D8', ghoul: '#EF5350', bunny: '#F48FB1', Unknown: '#444',
};

const STAGE_S = {
  V1: { bg: '#111',    color: '#444',    border: '#1e1e1e' },
  V2: { bg: '#0d1f0d', color: '#66BB6A', border: '#1a3a1a' },
  V3: { bg: '#1f1500', color: '#FFA726', border: '#3a2800' },
  V4: { bg: '#1f0808', color: '#EF5350', border: '#3a1010' },
};

const STATUS_COL = {
  idle: '#383838', running: '#66BB6A', done: '#4FC3F7',
  error: '#EF5350', paused: '#FFA726',
};

const FILTERS = ['all', 'running', 'idle', 'done', 'error', 'paused'];

function ago(ts) {
  if (!ts) return '—';
  const d = Date.now() - new Date(ts).getTime();
  if (d < 15000)  return 'now';
  if (d < 60000)  return `${Math.floor(d / 1000)}s`;
  if (d < 3600e3) return `${Math.floor(d / 60000)}m`;
  return `${Math.floor(d / 3600e3)}h`;
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 30000;
}

function copyText(text, showToast) {
  navigator.clipboard.writeText(text).then(() => showToast('Đã copy!'));
}

export default function Admin() {
  const router = useRouter();

  const [accounts, setAccounts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [syncTime, setSyncTime]     = useState('—');
  const [selected, setSelected]     = useState(new Set());
  const [filter, setFilter]         = useState('all');
  const [raceFilter, setRaceFilter] = useState('all');
  const [toast, setToast]           = useState(null);

  const [gJobId,   setGJobId]   = useState('');
  const [gPlaceId, setGPlaceId] = useState('');

  const [active, setActive]       = useState(null);
  const [sbRace, setSbRace]       = useState('ghoul');
  const [sbJobId, setSbJobId]     = useState('');
  const [sbPlaceId, setSbPlaceId] = useState('');
  const [queue, setQueue]         = useState([]);
  const [qLoading, setQLoading]   = useState(false);

  const activeRef  = useRef(active);
  const timerRef   = useRef(null);
  activeRef.current = active;

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.status === 401) { router.replace('/login'); return; }
      const data = await res.json();
      const accs = data.accounts || [];
      setAccounts(accs);
      setSyncTime(new Date().toLocaleTimeString('vi-VN'));
      if (activeRef.current) {
        const updated = accs.find(a => a.id === activeRef.current.id);
        if (updated) setActive(updated);
      }
    } catch { } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    fetchAccounts();
    const iv = setInterval(fetchAccounts, 5000);
    return () => clearInterval(iv);
  }, [fetchAccounts]);

  const fetchQueue = useCallback(async (id) => {
    setQLoading(true);
    try {
      const res  = await fetch(`/api/queue/${id}`);
      const data = await res.json();
      setQueue(data.queue || []);
    } catch { setQueue([]); } finally { setQLoading(false); }
  }, []);

  useEffect(() => {
    if (active) { fetchQueue(active.id); setSbRace(active.race || 'ghoul'); }
    else setQueue([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const toggle    = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel    = accounts.length > 0 && selected.size === accounts.length;
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(accounts.map(a => a.id)));
  const targetIds = selected.size > 0 ? [...selected] : accounts.map(a => a.id);

  const pushCmd = async (id, payload) => {
    const res = await fetch(`/api/command/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) router.replace('/login');
  };

  const broadcast = async (action, extra = {}) => {
    await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accIds: targetIds, action, ...extra }),
    });
    showToast(`[${action}] → ${targetIds.length} acc`);
  };

  const handleGroup = async () => {
    if (!gJobId.trim() || !gPlaceId.trim()) { showToast('Nhập JobId và PlaceId', 'err'); return; }
    await fetch('/api/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accIds: targetIds, jobId: gJobId, placeId: gPlaceId }),
    });
    showToast(`join_server → ${targetIds.length} acc`);
  };

  const sbStart = async () => {
    await pushCmd(active.id, { action: 'start_race', race: sbRace });
    showToast(`start_race [${sbRace}] → ${active.id}`);
  };

  const sbSendJoin = async () => {
    if (!sbJobId.trim() || !sbPlaceId.trim()) { showToast('Nhập JobId + PlaceId', 'err'); return; }
    await pushCmd(active.id, { action: 'join_server', jobId: sbJobId, placeId: sbPlaceId });
    showToast(`join_server → ${active.id}`);
  };

  const sbClearQueue = async () => {
    await fetch(`/api/queue/${active.id}`, { method: 'DELETE' });
    setQueue([]);
    showToast(`Queue cleared — ${active.id}`);
  };

  const handleDelete = async (id) => {
    if (!confirm(`Xoá acc "${id}" khỏi hệ thống?`)) return;
    await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    if (active?.id === id) setActive(null);
    setSelected(p => { const n = new Set(p); n.delete(id); return n; });
    await fetchAccounts();
    showToast(`Đã xoá ${id}`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  let filtered = accounts;
  if (filter !== 'all')     filtered = filtered.filter(a => a.status === filter);
  if (raceFilter !== 'all') filtered = filtered.filter(a => a.race === raceFilter);

  const stats = {
    total:   accounts.length,
    online:  accounts.filter(a => isOnline(a.lastSeen)).length,
    running: accounts.filter(a => a.status === 'running').length,
    done:    accounts.filter(a => a.status === 'done').length,
    v4:      accounts.filter(a => a.stage === 'V4').length,
  };

  const F = {
    row:   { display: 'flex', alignItems: 'center' },
    btn:   (bg, color, border) => ({ background: bg, border: `1px solid ${border}`, color, padding: '5px 12px', borderRadius: 4, fontSize: 10, letterSpacing: 0.8, cursor: 'pointer' }),
    input: { background: '#0e0e0e', border: '1px solid #1f1f1f', color: '#bbb', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'inherit' },
    th:    { padding: '8px 10px', textAlign: 'left', color: '#2a2a2a', fontWeight: 400, letterSpacing: 1.2, fontSize: 9, borderBottom: '1px solid #111', whiteSpace: 'nowrap' },
    td:    { padding: '8px 10px', borderBottom: '1px solid #0f0f0f', verticalAlign: 'middle', whiteSpace: 'nowrap' },
    label: { fontSize: 9, color: '#333', letterSpacing: 1.5, marginBottom: 5 },
  };

  return (
    <>
      <Head><title>ThlongPremium — Admin</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#080808', color: '#ccc', fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace", fontSize: 12 }}>

        {/* HEADER */}
        <div style={{ borderBottom: '1px solid #141414', padding: '12px 20px', ...F.row, justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ ...F.row, gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF5350', boxShadow: '0 0 8px #EF535066' }} />
            <span style={{ color: '#fff', fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>THLONGPREMIUM</span>
            <span style={{ background: '#1f0808', border: '1px solid #3a1010', color: '#EF5350', padding: '2px 8px', borderRadius: 3, fontSize: 9, letterSpacing: 1.5 }}>ADMIN</span>
          </div>
          <div style={{ ...F.row, gap: 16 }}>
            <span style={{ color: '#1e1e1e', fontSize: 10 }}>sync {syncTime}</span>
            <span style={{ color: '#2a2a2a', fontSize: 10 }}>{stats.online}/{stats.total} online</span>
            <button onClick={handleLogout} style={F.btn('#111', '#444', '#1a1a1a')}>LOGOUT</button>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #111', flexShrink: 0 }}>
          {[
            { label: 'TOTAL',   val: stats.total,   col: '#555' },
            { label: 'ONLINE',  val: stats.online,  col: '#66BB6A' },
            { label: 'RUNNING', val: stats.running, col: '#FFA726' },
            { label: 'DONE',    val: stats.done,    col: '#4FC3F7' },
            { label: 'V4 ✓',   val: stats.v4,      col: '#EF5350' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRight: '1px solid #111' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.col, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: '#222', letterSpacing: 1.5, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #111', ...F.row, gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ ...F.row, gap: 3 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={F.btn(filter === f ? '#161616' : 'transparent', filter === f ? '#bbb' : '#2a2a2a', filter === f ? '#252525' : '#111')}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <select value={raceFilter} onChange={e => setRaceFilter(e.target.value)} style={{ ...F.input, fontSize: 10, padding: '4px 8px' }}>
            <option value="all">ALL RACE</option>
            {RACES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
          </select>

          <div style={{ flex: 1 }} />

          <div style={{ ...F.row, gap: 6, background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 5, padding: '6px 10px' }}>
            <span style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: 1.5, marginRight: 4 }}>GROUP JOIN</span>
            <input placeholder="Job ID"   value={gJobId}   onChange={e => setGJobId(e.target.value)}   style={{ ...F.input, width: 200, padding: '4px 8px' }} />
            <input placeholder="Place ID" value={gPlaceId} onChange={e => setGPlaceId(e.target.value)} style={{ ...F.input, width: 100, padding: '4px 8px' }} />
            <button onClick={handleGroup} style={F.btn('#0d1f0d', '#66BB6A', '#1a3a1a')}>
              SEND {selected.size > 0 ? `(${selected.size})` : '(ALL)'}
            </button>
          </div>

          <div style={{ ...F.row, gap: 4 }}>
            <button onClick={() => broadcast('pause')}  style={F.btn('#1f1500', '#FFA726', '#3a2800')}>PAUSE</button>
            <button onClick={() => broadcast('resume')} style={F.btn('#0a180a', '#4CAF50', '#153015')}>RESUME</button>
            <button onClick={() => broadcast('stop')}   style={F.btn('#1a0808', '#EF5350', '#3a1010')}>STOP ALL</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* TABLE */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            {selected.size > 0 && (
              <div style={{ padding: '6px 20px', background: '#0e0e0e', borderBottom: '1px solid #111', ...F.row, gap: 10 }}>
                <span style={{ color: '#FFA726', fontSize: 10 }}>● {selected.size} đang chọn</span>
                <button onClick={() => setSelected(new Set())} style={{ ...F.btn('transparent', '#555', '#1a1a1a'), padding: '2px 8px' }}>BỎ CHỌN</button>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
                <tr>
                  <th style={{ ...F.th, width: 28, paddingLeft: 20 }}>
                    <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#EF5350' }} />
                  </th>
                  {['ACC ID','RACE','STAGE','LV','JOB ID','STATUS','SEEN','QUEUE','ACTIONS'].map(h => (
                    <th key={h} style={F.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ ...F.td, textAlign: 'center', color: '#1e1e1e', padding: 60 }}>loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ ...F.td, textAlign: 'center', color: '#1e1e1e', padding: 60 }}>
                    {accounts.length === 0 ? 'chưa có acc — chờ heartbeat đầu tiên' : `không có acc [${filter}]`}
                  </td></tr>
                ) : filtered.map(acc => {
                  const on     = isOnline(acc.lastSeen);
                  const isSel  = selected.has(acc.id);
                  const isAct  = active?.id === acc.id;
                  const stCol  = on ? (STATUS_COL[acc.status] || '#444') : '#222';
                  const stSt   = STAGE_S[acc.stage] || STAGE_S.V1;
                  const jShort = acc.jobId ? acc.jobId.slice(0, 22) + (acc.jobId.length > 22 ? '…' : '') : '—';

                  return (
                    <tr key={acc.id}
                      style={{ background: isAct ? '#131313' : isSel ? '#0f0f0f' : 'transparent', borderLeft: `2px solid ${isAct ? '#EF5350' : isSel ? '#2a2a2a' : 'transparent'}`, cursor: 'pointer' }}
                      onClick={() => isAct ? setActive(null) : setActive(acc)}
                    >
                      <td style={{ ...F.td, paddingLeft: 20 }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel} onChange={() => toggle(acc.id)} style={{ cursor: 'pointer', accentColor: '#EF5350' }} />
                      </td>
                      <td style={{ ...F.td, color: '#ddd', fontWeight: 600 }}>{acc.id}</td>
                      <td style={{ ...F.td, color: RACE_COLOR[acc.race] || '#444', fontWeight: 600 }}>{acc.race || '—'}</td>
                      <td style={F.td}>
                        <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, background: stSt.bg, color: stSt.color, border: `1px solid ${stSt.border}` }}>
                          {acc.stage || 'V1'}
                        </span>
                      </td>
                      <td style={{ ...F.td, color: '#444' }}>{acc.level || '—'}</td>
                      <td style={{ ...F.td, color: '#2e2e2e', fontSize: 10 }}
                        title={acc.jobId ? 'Click autofill Group Join' : ''}
                        onClick={e => { e.stopPropagation(); if (acc.jobId) { setGJobId(acc.jobId); if (acc.placeId) setGPlaceId(String(acc.placeId)); showToast(`autofill ← ${acc.id}`); } }}
                      >{jShort}</td>
                      <td style={F.td}>
                        <div style={{ ...F.row, gap: 5 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: stCol, animation: acc.status === 'running' && on ? 'pulse 2s infinite' : 'none' }} />
                          <span style={{ color: stCol }}>{on ? (acc.status || 'idle') : 'offline'}</span>
                        </div>
                      </td>
                      <td style={{ ...F.td, color: '#222', fontSize: 10 }}>{ago(acc.lastSeen)}</td>
                      <td style={{ ...F.td, color: acc.pendingCmds > 0 ? '#FFA726' : '#1e1e1e' }}>
                        {acc.pendingCmds > 0 ? `${acc.pendingCmds}` : '—'}
                      </td>
                      <td style={F.td} onClick={e => e.stopPropagation()}>
                        <div style={{ ...F.row, gap: 4 }}>
                          <button onClick={() => { pushCmd(acc.id, { action: 'start_race', race: acc.race }); showToast(`start → ${acc.id}`); }} style={F.btn('#0a180a', '#4CAF50', '#153015')}>▶</button>
                          <button onClick={() => { pushCmd(acc.id, { action: 'pause' }); showToast(`pause → ${acc.id}`); }} style={F.btn('#1f1500', '#FFA726', '#3a2800')}>⏸</button>
                          <button onClick={() => handleDelete(acc.id)} style={F.btn('#111', '#333', '#1e1e1e')}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SIDEBAR */}
          {active && (
            <div style={{ width: 300, borderLeft: '1px solid #141414', overflowY: 'auto', flexShrink: 0, background: '#0a0a0a', animation: 'slideIn 0.15s ease', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #141414', ...F.row, justifyContent: 'space-between' }}>
                <div style={{ ...F.row, gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline(active.lastSeen) ? '#66BB6A' : '#2a2a2a' }} />
                  <span style={{ color: '#fff', fontWeight: 700 }}>{active.id}</span>
                </div>
                <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: '#333', fontSize: 16 }}>×</button>
              </div>

              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* INFO */}
                <div>
                  <p style={F.label}>THÔNG TIN</p>
                  <div style={{ background: '#0e0e0e', border: '1px solid #141414', borderRadius: 5, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { k: 'Race',   v: active.race  || '—', col: RACE_COLOR[active.race] || '#555' },
                      { k: 'Stage',  v: active.stage || 'V1', col: STAGE_S[active.stage]?.color || '#555' },
                      { k: 'Level',  v: active.level || '—', col: '#888' },
                      { k: 'Status', v: isOnline(active.lastSeen) ? (active.status || 'idle') : 'offline', col: isOnline(active.lastSeen) ? (STATUS_COL[active.status] || '#555') : '#333' },
                      { k: 'Seen',   v: ago(active.lastSeen), col: '#555' },
                    ].map(({ k, v, col }) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#2a2a2a', fontSize: 10 }}>{k}</span>
                        <span style={{ color: col, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SERVER */}
                <div>
                  <p style={F.label}>SERVER</p>
                  <div style={{ background: '#0e0e0e', border: '1px solid #141414', borderRadius: 5, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[{ k: 'Job ID', v: active.jobId || '—' }, { k: 'Place ID', v: active.placeId || '—' }].map(({ k, v }) => (
                      <div key={k}>
                        <span style={{ color: '#2a2a2a', fontSize: 9, display: 'block', marginBottom: 3 }}>{k}</span>
                        <div style={{ ...F.row, gap: 6 }}>
                          <span style={{ color: '#3a3a3a', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>{v}</span>
                          {v !== '—' && <button onClick={() => copyText(v, showToast)} style={{ ...F.btn('#111', '#444', '#1e1e1e'), padding: '2px 6px', fontSize: 9 }}>COPY</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ASSIGN RACE */}
                <div>
                  <p style={F.label}>ASSIGN RACE</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <select value={sbRace} onChange={e => setSbRace(e.target.value)} style={{ ...F.input, width: '100%' }}>
                      {RACES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                    <button onClick={sbStart} style={{ ...F.btn('#0d1f0d', '#66BB6A', '#1a3a1a'), padding: '7px 0', textAlign: 'center' }}>
                      ▶ START RACE [{sbRace}]
                    </button>
                  </div>
                </div>

                {/* TELEPORT */}
                <div>
                  <p style={F.label}>TELEPORT ĐẾN SERVER</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input placeholder="Job ID"   value={sbJobId}   onChange={e => setSbJobId(e.target.value)}   style={{ ...F.input, width: '100%' }} />
                    <input placeholder="Place ID" value={sbPlaceId} onChange={e => setSbPlaceId(e.target.value)} style={{ ...F.input, width: '100%' }} />
                    <button onClick={sbSendJoin} style={{ ...F.btn('#0d1a1f', '#4FC3F7', '#1a2e3a'), padding: '7px 0' }}>SEND JOIN</button>
                  </div>
                </div>

                {/* QUICK CONTROLS */}
                <div>
                  <p style={F.label}>ĐIỀU KHIỂN NHANH</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'PAUSE',  action: 'pause',  s: F.btn('#1f1500', '#FFA726', '#3a2800') },
                      { label: 'RESUME', action: 'resume', s: F.btn('#0a180a', '#4CAF50', '#153015') },
                      { label: 'STOP',   action: 'stop',   s: F.btn('#1a0808', '#EF5350', '#3a1010') },
                      { label: 'REJOIN', action: 'rejoin', s: F.btn('#0d1015', '#CE93D8', '#2a1a3a') },
                    ].map(({ label, action, s }) => (
                      <button key={action} onClick={() => { pushCmd(active.id, { action }); showToast(`${action} → ${active.id}`); }} style={{ ...s, padding: '7px 0', textAlign: 'center' }}>{label}</button>
                    ))}
                  </div>
                </div>

                {/* QUEUE */}
                <div>
                  <div style={{ ...F.row, justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ ...F.label, marginBottom: 0 }}>COMMAND QUEUE ({queue.length})</p>
                    {queue.length > 0 && <button onClick={sbClearQueue} style={{ ...F.btn('#1a0808', '#EF5350', '#3a1010'), padding: '2px 7px', fontSize: 9 }}>CLEAR</button>}
                  </div>
                  <div style={{ background: '#0e0e0e', border: '1px solid #141414', borderRadius: 5, minHeight: 50, maxHeight: 140, overflowY: 'auto', padding: 8 }}>
                    {qLoading ? (
                      <p style={{ color: '#1e1e1e', fontSize: 10, textAlign: 'center', padding: 8 }}>loading...</p>
                    ) : queue.length === 0 ? (
                      <p style={{ color: '#1e1e1e', fontSize: 10, textAlign: 'center', padding: 8 }}>queue trống</p>
                    ) : queue.map((cmd, i) => (
                      <div key={i} style={{ borderBottom: i < queue.length - 1 ? '1px solid #111' : 'none', padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#66BB6A', fontSize: 10 }}>{cmd?.action || String(cmd)}</span>
                        <span style={{ color: '#1e1e1e', fontSize: 9 }}>#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => fetchQueue(active.id)} style={{ ...F.btn('transparent', '#2a2a2a', '#141414'), width: '100%', padding: '4px 0', marginTop: 4, fontSize: 9 }}>REFRESH</button>
                </div>

                {/* DANGER */}
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #111' }}>
                  <button onClick={() => handleDelete(active.id)} style={{ ...F.btn('#1a0808', '#EF5350', '#3a1010'), width: '100%', padding: '7px 0' }}>
                    ✕ XOÁ ACC NÀY
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '8px 20px', borderTop: '1px solid #0f0f0f', display: 'flex', justifyContent: 'space-between', color: '#1a1a1a', fontSize: 9, letterSpacing: 1, flexShrink: 0 }}>
          <span>{selected.size > 0 ? `${selected.size} selected` : 'click row → detail'}</span>
          <span>THLONGPREMIUM · ADMIN ONLY · SYNC 5S</span>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, padding: '9px 16px', background: toast.type === 'err' ? '#1f0808' : '#0d1a0d', border: `1px solid ${toast.type === 'err' ? '#3a1010' : '#1a3a1a'}`, color: toast.type === 'err' ? '#EF5350' : '#66BB6A', borderRadius: 5, fontSize: 11, fontFamily: 'inherit', boxShadow: '0 4px 24px #00000099', zIndex: 9999, animation: 'fadeUp 0.15s ease' }}>
          {toast.msg}
        </div>
      )}
    </>
  );
    }
