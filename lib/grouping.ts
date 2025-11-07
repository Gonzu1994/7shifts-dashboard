// lib/grouping.ts
export type GroupKey = 'plaza32a' | 'wydma33' | 'toalety' | 'toalety_restauracja' | 'restauracja';

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectGroup(listName: string): GroupKey {
  const n = normalize(listName);

  const hasToalety = n.includes('toalety');
  const hasRestauracja = n.includes('restauracja');
  if (hasToalety && hasRestauracja) return 'toalety_restauracja';
  if (hasToalety) return 'toalety';

  if (n.includes('plaza 32a') || n.includes('plaża 32a') || n.includes('plaza32a') || n.includes('plaża32a')) {
    return 'plaza32a';
  }
  if (n.includes('wydma 33') || n.includes('wydma33')) {
    return 'wydma33';
  }
  return 'restauracja';
}

export const GROUP_META: Record<GroupKey, { label: string; color: string }> = {
  plaza32a: { label: 'Plaża32A', color: 'from-amber-400 to-orange-500' },
  wydma33: { label: 'Wydma 33', color: 'from-indigo-400 to-violet-500' },
  toalety: { label: 'Toalety', color: 'from-teal-400 to-cyan-500' },
  toalety_restauracja: { label: 'Toalety Restauracja', color: 'from-emerald-400 to-lime-500' },
  restauracja: { label: 'Restauracja', color: 'from-fuchsia-400 to-pink-500' },
};
