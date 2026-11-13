// Рекомендации программ. Это прозрачные правила, а не «искусственный интеллект»:
// учитываются цель, уровень подготовки, желаемая длительность и история тренировок.
import { GOAL_LABELS } from '@/lib/format';
import type { FitnessLevel, UserGoal, WorkoutProgram, WorkoutSession } from '@/types/db';

const LEVEL_RANK: Record<FitnessLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const DAY = 86400000;

export interface Recommendation {
  program: WorkoutProgram;
  reason: string;
}

export function recommendPrograms(input: {
  programs: WorkoutProgram[];
  goal: UserGoal | null | undefined;
  level: FitnessLevel | null | undefined;
  sessions: WorkoutSession[];
  limit?: number;
}): Recommendation[] {
  const { programs, goal, level, sessions } = input;
  if (!goal && !level) return [];
  const now = Date.now();

  const scored = programs.map((program) => {
    let score = 0;
    const reasons: string[] = [];

    if (goal && program.goal_type === goal.goal_type) {
      score += 3;
      reasons.push(`Подходит для цели «${GOAL_LABELS[goal.goal_type].toLowerCase()}»`);
    }
    if (level) {
      const diff = LEVEL_RANK[program.difficulty] - LEVEL_RANK[level];
      if (diff === 0) {
        score += 2;
        reasons.push('Соответствует вашему уровню');
      } else if (diff === -1) score += 1;
      else if (diff > 0) score -= 3; // сложнее текущего уровня — не предлагаем в первую очередь
    }
    if (goal && program.duration_min <= goal.session_minutes + 10) score += 1;

    const done = sessions.filter((s) => s.program_id === program.id);
    const recent = done.filter((s) => now - new Date(s.finished_at).getTime() < 14 * DAY).length;
    score -= recent; // разнообразие: недавно выполненные опускаются ниже
    if (done.length === 0) reasons.push('Вы ещё не пробовали эту тренировку');
    else if (recent === 0) reasons.push('Давно не выполняли');

    return { program, score, reason: reasons[0] ?? 'Подобрано по вашей анкете' };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.program.name.localeCompare(b.program.name))
    .slice(0, input.limit ?? 3)
    .map(({ program, reason }) => ({ program, reason }));
}

/** Статистика текущей недели по фактическим тренировкам */
export function weekStats(sessions: WorkoutSession[], weekStart: Date, planned: number) {
  const start = weekStart.getTime();
  const end = start + 7 * DAY;
  const inWeek = sessions.filter((s) => {
    const t = new Date(s.finished_at).getTime();
    return t >= start && t < end;
  });
  const doneDays = new Set(inWeek.map((s) => ((new Date(s.finished_at).getDay() + 6) % 7) + 1)); // 1 = Пн
  return {
    done: inWeek.length,
    doneDays,
    planned,
    percent: planned > 0 ? Math.min(100, Math.round((inWeek.length / planned) * 100)) : 0,
    minutes: Math.round(inWeek.reduce((n, s) => n + s.duration_sec, 0) / 60),
  };
}
