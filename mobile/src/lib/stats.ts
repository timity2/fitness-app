// Подготовка данных для графиков прогресса
import type { ChartPoint } from '@/components/Charts';
import { addDays, formatShortDate, WEEKDAYS_SHORT } from '@/lib/format';

export type Period = 'week' | 'month' | 'q' | 'half' | 'year' | 'all';

export const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'q', label: '3 мес' },
  { value: 'half', label: '6 мес' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
];

const DAYS: Record<Exclude<Period, 'all'>, number> = { week: 7, month: 30, q: 91, half: 182, year: 365 };
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Начало периода (включительно) или null для «всё время» */
export function periodStart(period: Period, now = new Date()): Date | null {
  if (period === 'all') return null;
  return addDays(dayStart(now), -(DAYS[period] - 1));
}

export const inPeriod = (date: string | Date, period: Period) => {
  const start = periodStart(period);
  return !start || new Date(date).getTime() >= start.getTime();
};

interface Item {
  date: Date;
  value: number;
}

/**
 * Суммирует значения по интервалам: дни (неделя), недели (месяц, 3 месяца), месяцы (остальное).
 * Пустые интервалы остаются с нулём, чтобы ось времени была равномерной.
 */
export function bucketize(items: Item[], period: Period, now = new Date()): ChartPoint[] {
  const today = dayStart(now);

  if (period === 'week') {
    const start = addDays(today, -6);
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const next = addDays(day, 1);
      return {
        label: WEEKDAYS_SHORT[(day.getDay() + 6) % 7],
        value: items.filter((x) => x.date >= day && x.date < next).reduce((n, x) => n + x.value, 0),
      };
    });
  }

  if (period === 'month' || period === 'q') {
    const weeks = period === 'month' ? 5 : 13;
    const end = addDays(today, 1);
    return Array.from({ length: weeks }, (_, i) => {
      const from = addDays(end, -7 * (weeks - i));
      const to = addDays(from, 7);
      return {
        label: formatShortDate(from),
        value: items.filter((x) => x.date >= from && x.date < to).reduce((n, x) => n + x.value, 0),
      };
    });
  }

  let months = period === 'half' ? 6 : 12;
  if (period === 'all') {
    const first = items.reduce<Date | null>((min, x) => (!min || x.date < min ? x.date : min), null);
    months = first ? Math.min(36, Math.max(1, (today.getFullYear() - first.getFullYear()) * 12 + today.getMonth() - first.getMonth() + 1)) : 0;
  }
  return Array.from({ length: months }, (_, i) => {
    const from = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return {
      label: MONTHS_SHORT[from.getMonth()],
      value: items.filter((x) => x.date >= from && x.date < to).reduce((n, x) => n + x.value, 0),
    };
  });
}
