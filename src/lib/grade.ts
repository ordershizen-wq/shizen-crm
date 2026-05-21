/**
 * Grade scoring — pure function logic
 * แยกออกจาก GradePanel.tsx เพื่อ test ได้ + reuse ได้
 */

export type ChecklistKey = 'exercise' | 'diet' | 'sleep' | 'water' | 'motivation' | 'consistency';
export type ChecklistScore = 0 | 1 | 2;
export type ChecklistAnswers = Record<ChecklistKey, ChecklistScore>;
export type Grade = 'A' | 'B' | 'C';

export const GRADE_THRESHOLDS = {
  A: 9, // 9-12 = A
  B: 5, // 5-8  = B
  // 0-4  = C
} as const;

export const MAX_SCORE = 12;

export function totalScore(answers: ChecklistAnswers): number {
  return (
    answers.exercise +
    answers.diet +
    answers.sleep +
    answers.water +
    answers.motivation +
    answers.consistency
  );
}

export function suggestGrade(score: number): Grade {
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  return 'C';
}

export function suggestGradeFromAnswers(answers: ChecklistAnswers): Grade {
  return suggestGrade(totalScore(answers));
}

export const EMPTY_CHECKLIST: ChecklistAnswers = {
  exercise: 0, diet: 0, sleep: 0, water: 0, motivation: 0, consistency: 0,
};
