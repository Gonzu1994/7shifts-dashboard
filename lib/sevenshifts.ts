// lib/sevenshifts.ts
const BASE = 'https://api.7shifts.com/v2'

function env(name: string, req = true): string {
  const v = process.env[name]
  if (req && !v) throw new Error(`Missing env ${name}`)
  return v || ''
}

const ACCESS_TOKEN = env('SEVENSHIFTS_ACCESS_TOKEN')
const COMPANY_ID   = env('SEVENSHIFTS_COMPANY_ID')

async function ssGet(pathWithQuery: string) {
  const res = await fetch(`${BASE}${pathWithQuery}`, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'accept': 'application/json',
    },
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`7shifts HTTP ${res.status} — ${text}`)
  try { return JSON.parse(text) } catch { return text }
}

function extractTaskLists(data: any): any[] {
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.task_lists)) return data.task_lists
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data)) return data
  return []
}

function boolOf(x: any): boolean {
  if (x === true) return true
  if (x === false) return false
  if (x == null) return false
  if (typeof x === 'string') {
    const s = x.toLowerCase()
    if (s === 'true' || s === 'yes' || s === 'completed' || s === 'done') return true
    return false
  }
  if (typeof x === 'number') return x !== 0
  return false
}

// „Assigned to” – etykieta (według tego, co 7shifts zwróci)
function pickAssigneeLabel(source: any): string {
  return (
    source?.assigned_to_name ??
    source?.assigned_to_label ??
    source?.assignee_label ??
    source?.department_name ??
    source?.role_name ??
    source?.assignee ??
    'Unassigned'
  )
}

// „Terminy” – czas docelowy z nazwy (np. „do 7:30”) albo z pola
function pickDueTime(list: any): string | null {
  const direct = list?.due_time || list?.due_at || list?.due || null
  if (direct) return String(direct)
  const name: string = String(list?.name || '')
  const m = name.match(/\bdo\s+(\d{1,2}:\d{2})\b/i) || name.match(/\b(\d{1,2}:\d{2})\b/)
  return m ? m[1] : null
}

function normalizeTaskLists(arr: any[]) {
  return (arr || []).map((l: any) => {
    const tasks = l.tasks || l.task_items || l.items || []
    return {
      id: l.id,
      name: l.name || l.title || l.list_name || `List ${l.id ?? ''}`,
      date: l.active_on_date || l.date || l.naive_date || l.scheduled_for || '',
      location_id: l.location_id || l.location || l.locationId || null,
      assigned_to_label: pickAssigneeLabel(l),
      due_time_hint: pickDueTime(l),
      // zadania – szeroka heurystyka kompletności
      tasks: (Array.isArray(tasks) ? tasks : []).map((t: any) => {
        const completed =
          boolOf(t.completed) ||
          boolOf(t.is_completed) ||
          boolOf(t.isComplete) ||
          String(t.status || '').toLowerCase() === 'completed' ||
          String(t.state  || '').toLowerCase() === 'completed' ||
          !!t.completed_at

        return {
          id: t.id,
          name: t.name || t.title || t.task_name || `Task ${t.id ?? ''}`,
          completed,
          completed_at: t.completed_at || t.completedAt || null,
          assignee_id: t.assignee_id || t.assigneeId || null,
          due_at: t.due_at || t.dueAt || null,
        }
      }),
    }
  })
}

function enumerateDays(start: string, end: string): string[] {
  const out: string[] = []
  const d0 = new Date(start + 'T00:00:00Z')
  const d1 = new Date(end   + 'T00:00:00Z')
  for (let d = new Date(d0); d <= d1; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export async function getTaskLists(args: {
  start: string,            // YYYY-MM-DD
  end: string,              // YYYY-MM-DD
  locationIds: string[],
  userId?: string | number,
  debug?: boolean,
}) {
  const { start, end, locationIds, userId, debug } = args
  const location_id = (locationIds && locationIds[0]) || undefined

  const days = enumerateDays(start, end)
  const warnings: string[] = []
  const raw: any[] = []
  const merged: any[] = []

  for (const day of days) {
    try {
      const p = new URLSearchParams()
      if (location_id) p.set('location_id', String(location_id))
      p.set('active_on_date', day)         // klucz wg supportu
      p.set('include_tasks', 'true')       // żeby mieć statusy zadań
      p.set('company_id', COMPANY_ID)      // bywa wymagane
      if (userId) p.set('user_id', String(userId))

      const path = `/company/${COMPANY_ID}/task_lists?${p.toString()}`
      const data = await ssGet(path)
      raw.push({ day, path })
      const arr = extractTaskLists(data)
      if (arr.length > 0) merged.push(...arr)
      else warnings.push(`Day ${day}: empty result`)
    } catch (e: any) {
      warnings.push(`Day ${day}: ${String(e?.message || e)}`)
    }
  }

  const lists = normalizeTaskLists(merged)
  if (debug) return { lists, warnings, raw }
  return { lists, warnings }
}
