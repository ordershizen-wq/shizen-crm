import { describe, it, expect } from 'vitest';
import {
  totalScore,
  suggestGrade,
  suggestGradeFromAnswers,
  EMPTY_CHECKLIST,
  type ChecklistAnswers,
} from './grade';

describe('totalScore', () => {
  it('คะแนนรวม = 0 เมื่อทุกข้อ = 0', () => {
    expect(totalScore(EMPTY_CHECKLIST)).toBe(0);
  });

  it('คะแนนรวม = 12 (max) เมื่อทุกข้อ = 2', () => {
    const full: ChecklistAnswers = {
      exercise: 2, diet: 2, sleep: 2, water: 2, motivation: 2, consistency: 2,
    };
    expect(totalScore(full)).toBe(12);
  });

  it('คะแนนรวมแบบผสม', () => {
    const mixed: ChecklistAnswers = {
      exercise: 2, diet: 1, sleep: 0, water: 2, motivation: 1, consistency: 1,
    };
    expect(totalScore(mixed)).toBe(7);
  });
});

describe('suggestGrade', () => {
  it('คะแนน 9-12 → A', () => {
    expect(suggestGrade(9)).toBe('A');
    expect(suggestGrade(10)).toBe('A');
    expect(suggestGrade(12)).toBe('A');
  });

  it('คะแนน 5-8 → B', () => {
    expect(suggestGrade(5)).toBe('B');
    expect(suggestGrade(7)).toBe('B');
    expect(suggestGrade(8)).toBe('B');
  });

  it('คะแนน 0-4 → C', () => {
    expect(suggestGrade(0)).toBe('C');
    expect(suggestGrade(2)).toBe('C');
    expect(suggestGrade(4)).toBe('C');
  });

  it('boundary 8/9 — ที่ 8 ยังเป็น B, ที่ 9 ขึ้นเป็น A', () => {
    expect(suggestGrade(8)).toBe('B');
    expect(suggestGrade(9)).toBe('A');
  });

  it('boundary 4/5 — ที่ 4 ยังเป็น C, ที่ 5 ขึ้นเป็น B', () => {
    expect(suggestGrade(4)).toBe('C');
    expect(suggestGrade(5)).toBe('B');
  });
});

describe('suggestGradeFromAnswers (e2e)', () => {
  it('ลูกค้ารักสุขภาพ ตอบ 2 ทุกข้อ → A', () => {
    expect(suggestGradeFromAnswers({
      exercise: 2, diet: 2, sleep: 2, water: 2, motivation: 2, consistency: 2,
    })).toBe('A');
  });

  it('ลูกค้าทั่วไป ตอบ 1 เกือบทุกข้อ + 2 บางข้อ (รวม 7) → B', () => {
    expect(suggestGradeFromAnswers({
      exercise: 1, diet: 1, sleep: 1, water: 1, motivation: 2, consistency: 1,
    })).toBe('B');
  });

  it('ลูกค้าไม่ดูแล ตอบ 0 ทุกข้อ → C', () => {
    expect(suggestGradeFromAnswers(EMPTY_CHECKLIST)).toBe('C');
  });
});
