// lib/status.ts
// Logika liczników zadań dla 7shifts (bez zmian w UI).
// Zgodnie z mailem od 7shifts opieramy się na `completed_at`.

export type Task = {
  id: string;
  name?: string;
  completed_at?: string | null;
  due?: string | null;
};

export type TaskList = {
  id: string;
  name: string;
  date?: string | null; // "YYYY-MM-DD" z /task_lists
  due?: string | null;  // ISO z offsetem lokalnym ("2025-11-06T10:00:00-05:00")
  tasks?: Task[];
};

export type Counters = {
  on_time: number;
  late: number;
  missed: number;
  in_progress: number;
};

export function parseDateSafe(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function endOfDay(dateStr: string): Date {
  // Fallback na koniec dnia (jeśli brak due). TZ nie jest tu krytyczny dla nowej reguły.
  return new Date(`${dateStr}T23:59:59.999Z`);
}

/** Deadline listy: preferuj `list.due`, w przeciwnym razie koniec dnia z `list.date`. */
export function resolveListDeadline(list: TaskList): Date | null {
  const due = parseDateSafe(list.due || null);
  if (due) return due;
  if (list.date) return endOfDay(list.date);
  return null;
}

/** True, gdy ŻADEN task w liście nie ma completed_at (czyli 0% postępu). */
export function isZeroProgress(list: TaskList): boolean {
  const tasks = list.tasks ?? [];
  if (tasks.length === 0) return false; // pusta lista nie jest traktowana jako "niewykonana"
  return tasks.every(t => !t.completed_at);
}

/**
 * Liczenie per-task do kafelków/wykresów.
 *
 * NOWA REGUŁA (Twoje wymaganie):
 *  - jeśli % postępu == 0 (czyli żaden task nie ma `completed_at`),
 *    to CAŁĄ listę liczymy jako "Niewykonane":
 *      missed = liczba zadań, a on_time/late/in_progress = 0
 *
 * W innym przypadku zachowujemy dotychczasowe rozróżnienie:
 *  - task z completed_at:
 *      (brak due => on_time)
 *      completed_at <= due  => on_time
 *      completed_at >  due  => late
 *  - task bez completed_at:
 *      (brak due => in_progress)
 *      now <= due => in_progress
 *      now >  due => missed
 */
export function countList(list: TaskList, nowISO?: string): Counters {
  const now = parseDateSafe(nowISO ?? new Date().toISOString())!;
  const due = resolveListDeadline(list);

  const tasks = list.tasks ?? [];
  const totalTasks = tasks.length;

  // --- nowa, twarda reguła: 0% postępu => wszystko "missed"
  if (isZeroProgress(list)) {
    return {
      on_time: 0,
      late: 0,
      missed: totalTasks,
      in_progress: 0,
    };
  }

  // --- standardowe liczenie kiedy jest już jakiś postęp
  const result: Counters = { on_time: 0, late: 0, missed: 0, in_progress: 0 };

  for (const t of tasks) {
    const doneAt = parseDateSafe(t.completed_at ?? null);
    if (doneAt) {
      if (!due) {
        result.on_time += 1;
      } else {
        if (doneAt.getTime() <= due.getTime()) result.on_time += 1;
        else result.late += 1;
      }
    } else {
      if (!due) {
        result.in_progress += 1;
      } else {
        if (now.getTime() > due.getTime()) result.missed += 1;
        else result.in_progress += 1;
      }
    }
  }

  return result;
}

export function progressPercent(c: Counters): number {
  const total = c.on_time + c.late + c.missed + c.in_progress;
  if (!total) return 0;
  const done = c.on_time + c.late;
  return Math.round((done / total) * 100);
}
