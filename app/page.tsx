'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Donut from '@/components/Donut';
import { detectGroup, GROUP_META, GroupKey } from '@/lib/grouping';
import { countList, progressPercent, Counters } from '@/lib/status';
import { StatusPerGroupChart, ActivityChart } from '@/components/Charts';

type Task = { id: number; name: string; completed: boolean; completed_at?: string | null; due_at?: string | null; assignee_id?: number | null };
type TaskList = { id: number; name: string; date: string; location_id: number; tasks: Task[] };
type ApiResponse = { date: string; lists: TaskList[]; refreshedAt: string };

const fetcher = (url: string) => fetch(url).then(async (r) => {
  if (!r.ok) throw new Error(await r.text());
  return r.json();
});

const GROUP_ORDER: GroupKey[] = ['plaza32a', 'wydma33', 'toalety', 'toalety_restauracja', 'restauracja'];

// helper: suma zadań w licznikach
const totalCounters = (c: Counters) => c.on_time + c.late + c.missed + c.in_progress;

export default function Page() {
  const [locationId, setLocationId] = useState('147255');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeGroup, setActiveGroup] = useState<GroupKey | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late' | 'missed'>('all');

  const qs = new URLSearchParams();
  qs.set('location_ids', locationId);
  qs.set('start_date', startDate);
  qs.set('end_date', endDate);

  const { data, error, isLoading } = useSWR<ApiResponse>(`/api/checklists?${qs.toString()}`, fetcher, { refreshInterval: 15000 });

  const nowISO = new Date().toISOString();

  const enriched = useMemo(() => {
    if (!data) return {
      perGroup: {} as Record<GroupKey, { lists: TaskList[]; counters: Counters; percent: number }>,
      lists: [] as TaskList[],
    };

    const base: Counters = { on_time: 0, late: 0, missed: 0, in_progress: 0 };
    const perGroup: Record<GroupKey, { lists: TaskList[]; counters: Counters; percent: number }> = {
      plaza32a: { lists: [], counters: { ...base }, percent: 0 },
      wydma33: { lists: [], counters: { ...base }, percent: 0 },
      toalety: { lists: [], counters: { ...base }, percent: 0 },
      toalety_restauracja: { lists: [], counters: { ...base }, percent: 0 },
      restauracja: { lists: [], counters: { ...base }, percent: 0 },
    };

    for (const list of data.lists) {
      const g = detectGroup(list.name);
      perGroup[g].lists.push(list);
      const cnt = countList(list as any, nowISO);
      // sumuj znane pola Counters (bez "total")
      perGroup[g].counters.on_time     += cnt.on_time;
      perGroup[g].counters.late        += cnt.late;
      perGroup[g].counters.missed      += cnt.missed;
      perGroup[g].counters.in_progress += cnt.in_progress;
    }
    for (const g of GROUP_ORDER) perGroup[g].percent = progressPercent(perGroup[g].counters);

    return { perGroup, lists: data.lists };
  }, [data, nowISO]);

  // KPI donuts
  const kpis = useMemo(() => GROUP_ORDER.map((g) => {
    const item = enriched.perGroup[g];
    const c = item?.counters;
    return {
      key: g,
      label: GROUP_META[g].label,
      percent: item?.percent ?? 0,
      lists: item?.lists?.length ?? 0,
      tasks: c ? totalCounters(c) : 0,
    };
  }), [enriched]);

  // tabela (wg filtrów)
  const tableRows = useMemo(() => {
    const lists = (data?.lists ?? []).filter((l) => activeGroup === 'all' ? true : detectGroup(l.name) === activeGroup);
    return lists.map((l) => {
      const c = countList(l as any, nowISO);
      return {
        id: l.id, name: l.name, date: l.date, group: detectGroup(l.name),
        counters: c, percent: progressPercent(c),
      };
    }).filter((row) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'on_time') return row.counters.on_time > 0 && row.counters.late === 0 && row.counters.missed === 0;
      if (statusFilter === 'late') return row.counters.late > 0;
      if (statusFilter === 'missed') return row.counters.missed > 0;
      return true;
    });
  }, [data, activeGroup, statusFilter, nowISO]);

  // KPI summary (na czas / po czasie / niewykonane)
  const summary = useMemo(() => {
    const agg = { on_time: 0, late: 0, missed: 0, total: 0 };
    for (const r of tableRows) {
      agg.on_time += r.counters.on_time;
      agg.late    += r.counters.late;
      agg.missed  += r.counters.missed;
      agg.total   += totalCounters(r.counters);
    }
    return agg;
  }, [tableRows]);

  // dane do wykresów
  const chartStatusPerGroup = useMemo(() => GROUP_ORDER.map((g) => {
    const cnt = enriched.perGroup[g]?.counters ?? { on_time: 0, late: 0, missed: 0, in_progress: 0 };
    return { group: GROUP_META[g].label, ...cnt };
  }), [enriched]);

  const chartActivity = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const l of data?.lists ?? []) {
      for (const t of l.tasks ?? []) {
        // zgodnie z mailem 7shifts — opieramy się na completed_at (flaga "completed" nie jest wiarygodna)
        if (t.completed_at) {
          const d = new Date(t.completed_at);
          if (!isNaN(d.getTime())) {
            const h = d.getHours().toString().padStart(2, '0') + ':00';
            buckets[h] = (buckets[h] ?? 0) + 1;
          }
        }
      }
    }
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');
    return hours.map((h) => ({ hour: h, done: buckets[h] ?? 0 }));
  }, [data]);

  return (
    <main style={{ minHeight: '100vh', background: '#0d0f14', color: '#e5e7eb' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* Nagłówek i filtry */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>7shifts • Dashboard prezesa</div>
          <div style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 13 }}>
            {data ? `Odświeżono: ${new Date(data.refreshedAt).toLocaleTimeString()}` : '—'}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
            <label style={{ fontSize: 13 }}>
              Od:{' '}<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{ background:'#0b0e13', border:'1px solid #2b2f37', color:'#e5e7eb', borderRadius:8, padding:'6px 8px' }}/>
            </label>
            <label style={{ fontSize: 13 }}>
              Do:{' '}<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                style={{ background:'#0b0e13', border:'1px solid #2b2f37', color:'#e5e7eb', borderRadius:8, padding:'6px 8px' }}/>
            </label>
            <label style={{ fontSize: 13 }}>
              Lokalizacja (ID):{' '}
              <input value={locationId} onChange={e=>setLocationId(e.target.value)}
                style={{ width:100, background:'#0b0e13', border:'1px solid #2b2f37', color:'#e5e7eb', borderRadius:8, padding:'6px 8px' }}/>
            </label>

            {/* filtry grup — jedna linia, tylko aktywny podświetlony */}
            <div style={{ marginLeft:'auto', overflowX:'auto', whiteSpace:'nowrap', display:'flex', gap:6, paddingRight:4 }}>
              {(['all', ...GROUP_ORDER] as const).map(g=>{
                const active = activeGroup===g;
                const label = g==='all' ? 'Wszystko' : GROUP_META[g].label;
                return (
                  <button key={g} onClick={()=>setActiveGroup(g as any)}
                    style={{
                      border:'1px solid', borderColor: active ? 'rgba(245,158,11,.6)' : 'rgba(255,255,255,.1)',
                      background: active ? 'rgba(245,158,11,.10)' : '#0b0e13',
                      color: active ? '#f8c572' : '#cbd5e1',
                      padding:'6px 10px', borderRadius:999, fontSize:13
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* DONUTY – zawsze w jednym rzędzie */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'stretch',
          }}
        >
          {kpis.map(k => (
            <div key={k.key} style={{ background:'#0b0e13', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:8 }}>
              <Donut
                value={k.percent}
                label={k.label}
                active={activeGroup === k.key}
                onClick={()=> setActiveGroup(activeGroup===k.key ? 'all' : k.key)}
                size={160}
              />
              <div style={{ marginTop:6, fontSize:12, color:'#94a3b8', textAlign:'center' }}>
                list: <span style={{ color:'#e5e7eb' }}>{k.lists}</span> • zad.: <span style={{ color:'#e5e7eb' }}>{k.tasks}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 3 KPI (zielony/żółty/czerwony) */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12, marginTop:16 }}>
          <KPI title="Na czas" value={summary.on_time} tone="emerald" />
          <KPI title="Po czasie" value={summary.late} tone="amber" />
          <KPI title="Niewykonane" value={summary.missed} tone="rose" />
        </div>

        {/* Wykresy */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:12, marginTop:16 }}>
          <div style={{ background:'#0b0e13', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:12, minHeight:340 }}>
            <div style={{ fontSize:14, color:'#cbd5e1', marginBottom:8 }}>Status wg grup</div>
            <StatusPerGroupChart data={chartStatusPerGroup} />
          </div>
          <div style={{ background:'#0b0e13', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:12, minHeight:340 }}>
            <div style={{ fontSize:14, color:'#cbd5e1', marginBottom:8 }}>Aktywność w ciągu dnia</div>
            <ActivityChart data={chartActivity} />
          </div>
        </div>

        {/* Filtr statusu */}
        <div style={{ display:'flex', gap:6, marginTop:16, overflowX:'auto', whiteSpace:'nowrap' }}>
          {(['all','on_time','late','missed'] as const).map(s=>{
            const active = statusFilter===s;
            const label = s==='all' ? 'Wszystkie' : s==='on_time' ? 'Na czas' : s==='late' ? 'Po czasie' : 'Niewykonane';
            return (
              <button key={s} onClick={()=>setStatusFilter(s)}
                style={{
                  border:'1px solid', borderColor: active ? 'rgba(245,158,11,.6)' : 'rgba(255,255,255,.1)',
                  background: active ? 'rgba(245,158,11,.10)' : '#0b0e13',
                  color: active ? '#f8c572' : '#cbd5e1',
                  padding:'6px 10px', borderRadius:999, fontSize:13
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Tabela */}
        <div style={{ marginTop:12, overflow:'hidden', border:'1px solid rgba(255,255,255,.08)', borderRadius:16 }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0, fontSize:14 }}>
            <thead>
              <tr style={{ background:'#0f131a', color:'#cbd5e1' }}>
                <th style={th}>Checklist</th>
                <th style={th}>Grupa</th>
                <th style={th}>Data</th>
                <th style={th}>% postępu</th>
                <th style={th}>Na czas</th>
                <th style={th}>Po czasie</th>
                <th style={th}>Niewykonane</th>
                <th style={th}>W toku</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} style={tdMuted}>Ładowanie…</td></tr>
              )}
              {error && (
                <tr><td colSpan={8} style={{...tdMuted, color:'#fca5a5'}}>Błąd: {String(error.message || error)}</td></tr>
              )}
              {!isLoading && !error && tableRows.length === 0 && (
                <tr><td colSpan={8} style={tdMuted}>Brak wyników dla bieżących filtrów.</td></tr>
              )}
              {tableRows.map(row=>{
                // SAFE fallback na brak chipFrom/chipTo w GROUP_META:
                const meta = GROUP_META[row.group] as unknown as { label: string; color?: string; chipFrom?: string; chipTo?: string };
                const chipFrom = meta.chipFrom ?? meta.color ?? '#ffffff';
                const chipTo   = meta.chipTo   ?? meta.color ?? '#ffffff';

                return (
                  <tr key={row.id} style={{ background:'transparent' }}>
                    <td style={td}>{row.name}</td>
                    <td style={td}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', padding:'3px 8px', borderRadius:999,
                        background:`linear-gradient(90deg, ${chipFrom}, ${chipTo})`,
                        color:'#0b0e13', fontWeight:700, fontSize:12
                      }}>
                        {GROUP_META[row.group].label}
                      </span>
                    </td>
                    <td style={tdMuted}>{row.date}</td>
                    <td style={td}>
                      <div style={{ width:160, height:8, background:'#222731', borderRadius:999, overflow:'hidden' }}>
                        <div style={{
                          height:'100%',
                          width:`${row.percent}%`,
                          background:'linear-gradient(90deg,#f59e0b,#fbbf24)'
                        }}/>
                      </div>
                      <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{row.percent}%</div>
                    </td>
                    <td style={{ ...td, color:'#34d399' }}>{row.counters.on_time}</td>
                    <td style={{ ...td, color:'#fbbf24' }}>{row.counters.late}</td>
                    <td style={{ ...td, color:'#f87171' }}>{row.counters.missed}</td>
                    <td style={{ ...td, color:'#a1a1aa' }}>{row.counters.in_progress}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function KPI({ title, value, tone }: { title: string; value: number; tone: 'emerald'|'amber'|'rose' }) {
  const palette = {
    emerald: { bg:'rgba(16,185,129,.12)', br:'rgba(16,185,129,.35)', fg:'#86efac' },
    amber:   { bg:'rgba(245,158,11,.12)',  br:'rgba(245,158,11,.35)',  fg:'#fcd34d' },
    rose:    { bg:'rgba(244,63,94,.12)',   br:'rgba(244,63,94,.35)',   fg:'#fda4af' },
  }[tone];

  return (
    <div style={{ background:'#0b0e13', border:`1px solid ${palette.br}`, borderRadius:16, padding:'12px 14px' }}>
      <div style={{ fontSize:13, color:'#cbd5e1', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:28, fontWeight:800, color:palette.fg }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding:'10px 12px', textAlign:'left', fontWeight:600, borderBottom:'1px solid rgba(255,255,255,.08)' };
const td: React.CSSProperties = { padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,.06)' };
const tdMuted: React.CSSProperties = { ...td, color:'#94a3b8' };
