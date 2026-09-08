import { Team, RebuttalRecord, RubricScores, JudgeInfo, JudgeScoreRecord, TeamAccount } from '../types';

export const JUDGE_ACCOUNTS: JudgeInfo[] = [
  { id: 1, name: 'Giám khảo 1', code: 'SHCDT91', isBackup: false },
  { id: 2, name: 'Giám khảo 2', code: 'SHCDT92', isBackup: false },
  { id: 3, name: 'Giám khảo 3', code: 'SHCDT93', isBackup: false },
  { id: 4, name: 'Giám khảo 4', code: 'SHCDT94', isBackup: true },
  { id: 5, name: 'Giám khảo 5', code: 'SHCDT95', isBackup: true },
];

export function authenticateJudge(inputCode: string): JudgeInfo | null {
  if (!inputCode) return null;
  const clean = inputCode.trim();
  const upper = clean.toUpperCase();
  return JUDGE_ACCOUNTS.find((j) => j.code.toUpperCase() === upper) || null;
}

export const ADMIN_RESET_PASSWORD = 'admin123';

export function verifyAdminPassword(inputCode: string): boolean {
  if (!inputCode) return false;
  return inputCode.trim() === ADMIN_RESET_PASSWORD;
}

export const TEAM_ACCOUNTS: TeamAccount[] = [
  { id: 1, name: 'Đội 1', code: 'doi1' },
  { id: 2, name: 'Đội 2', code: 'doi2' },
  { id: 3, name: 'Đội 3', code: 'doi3' },
  { id: 4, name: 'Đội 4', code: 'doi4' },
  { id: 5, name: 'Đội 5', code: 'doi5' },
  { id: 6, name: 'Đội 6', code: 'doi6' },
  { id: 7, name: 'Đội 7', code: 'doi7' },
  { id: 8, name: 'Đội 8', code: 'doi8' },
  { id: 9, name: 'Đội 9', code: 'doi9' },
  { id: 10, name: 'Đội 10', code: 'doi10' },
];

export function authenticateTeam(inputCode: string): TeamAccount | null {
  if (!inputCode) return null;
  const normalized = inputCode.trim().toLowerCase().replace(/\s+/g, '');
  return (
    TEAM_ACCOUNTS.find(
      (t) =>
        t.code === normalized ||
        `team${t.id}` === normalized ||
        `doi0${t.id}` === normalized ||
        `nhom${t.id}` === normalized
    ) || null
  );
}

export const RUBRIC_CRITERIA_META = [
  {
    key: 'topicUnderstanding' as keyof RubricScores,
    title: 'Hiểu đề & bám sát vấn đề',
    desc: 'Xác định đúng trọng tâm, trả lời đúng yêu cầu của đề.',
    max: 4,
    step: 0.25,
  },
  {
    key: 'argumentation' as keyof RubricScores,
    title: 'Lập luận & tư duy phản biện',
    desc: 'Luận điểm rõ, logic, có lý lẽ thuyết phục; nhìn nhận nhiều chiều. (Tiêu chí phụ ưu tiên khi hòa điểm)',
    max: 5,
    step: 0.25,
    isTieBreaker: true,
  },
  {
    key: 'feasibility' as keyof RubricScores,
    title: 'Tính khả thi / giá trị giải pháp',
    desc: 'Giải pháp hợp lý, có khả năng áp dụng hoặc tạo tác động thực tế.',
    max: 4,
    step: 0.25,
  },
  {
    key: 'creativity' as keyof RubricScores,
    title: 'Tính sáng tạo',
    desc: 'Có góc nhìn mới, cách tiếp cận khác biệt hoặc ý tưởng đáng chú ý.',
    max: 3,
    step: 0.25,
  },
  {
    key: 'presentationSkills' as keyof RubricScores,
    title: 'Kỹ năng trình bày & quản lý thời gian',
    desc: 'Diễn đạt rõ ràng, mạch lạc, thuyết phục và hoàn thành trong thời gian quy định.',
    max: 4,
    step: 0.25,
  },
];

export function calculatePresentationTotal(scores: RubricScores): number {
  return Number(
    (
      (scores.topicUnderstanding || 0) +
      (scores.argumentation || 0) +
      (scores.feasibility || 0) +
      (scores.creativity || 0) +
      (scores.presentationSkills || 0)
    ).toFixed(2)
  );
}

/**
 * Calculates effective presentation scores across all judges who have scored.
 * If individual judge scores exist, returns their average.
 * Otherwise returns team's base presentationScores.
 */
export function calculateEffectivePresentationScores(team: Team): {
  scores: RubricScores;
  total: number;
  judgeCount: number;
  judgeBreakdown: JudgeScoreRecord[];
} {
  const records = team.judgeScores ? Object.values(team.judgeScores) : [];

  if (records.length === 0) {
    const total = calculatePresentationTotal(team.presentationScores);
    return {
      scores: team.presentationScores,
      total,
      judgeCount: 0,
      judgeBreakdown: [],
    };
  }

  const count = records.length;
  const avgScores: RubricScores = {
    topicUnderstanding: Number(
      (records.reduce((sum, r) => sum + (r.scores.topicUnderstanding || 0), 0) / count).toFixed(2)
    ),
    argumentation: Number(
      (records.reduce((sum, r) => sum + (r.scores.argumentation || 0), 0) / count).toFixed(2)
    ),
    feasibility: Number(
      (records.reduce((sum, r) => sum + (r.scores.feasibility || 0), 0) / count).toFixed(2)
    ),
    creativity: Number(
      (records.reduce((sum, r) => sum + (r.scores.creativity || 0), 0) / count).toFixed(2)
    ),
    presentationSkills: Number(
      (records.reduce((sum, r) => sum + (r.scores.presentationSkills || 0), 0) / count).toFixed(2)
    ),
  };

  const total = calculatePresentationTotal(avgScores);

  return {
    scores: avgScores,
    total,
    judgeCount: count,
    judgeBreakdown: records,
  };
}

export function getTeamRebuttals(teamId: number, rebuttals: RebuttalRecord[]): RebuttalRecord[] {
  return rebuttals.filter((r) => r.rebuttalTeamId === teamId);
}

export function calculateRebuttalBonus(teamId: number, rebuttals: RebuttalRecord[]): number {
  const teamRebuttals = getTeamRebuttals(teamId, rebuttals);
  const total = teamRebuttals.reduce((sum, r) => sum + (r.score || 0), 0);
  return Number(total.toFixed(2));
}

export function calculateOverallTotal(team: Team, rebuttals: RebuttalRecord[]): number {
  const { total: pres } = calculateEffectivePresentationScores(team);
  const reb = calculateRebuttalBonus(team.id, rebuttals);
  return Number((pres + reb).toFixed(2));
}

export interface RankedTeam {
  team: Team;
  presentationTotal: number;
  argumentationScore: number;
  rebuttalBonus: number;
  overallTotal: number;
  rebuttalsUsed: number;
  judgeCount: number;
  effectiveScores: RubricScores;
  rank: number;
}

export function rankTeams(teams: Team[], rebuttals: RebuttalRecord[]): RankedTeam[] {
  const analyzed: RankedTeam[] = teams.map((team) => {
    const { scores: effectiveScores, total: presentationTotal, judgeCount } =
      calculateEffectivePresentationScores(team);
    const argumentationScore = effectiveScores.argumentation || 0;
    const rebuttalBonus = calculateRebuttalBonus(team.id, rebuttals);
    const overallTotal = Number((presentationTotal + rebuttalBonus).toFixed(2));
    const rebuttalsUsed = getTeamRebuttals(team.id, rebuttals).length;

    return {
      team,
      presentationTotal,
      argumentationScore,
      rebuttalBonus,
      overallTotal,
      rebuttalsUsed,
      judgeCount,
      effectiveScores,
      rank: 1,
    };
  });

  // Sort strictly following official rules:
  // 1. Overall total DESC
  // 2. Presentation total DESC
  // 3. Argumentation score DESC
  // 4. Team ID ASC
  analyzed.sort((a, b) => {
    if (b.overallTotal !== a.overallTotal) {
      return b.overallTotal - a.overallTotal;
    }
    if (b.presentationTotal !== a.presentationTotal) {
      return b.presentationTotal - a.presentationTotal;
    }
    if (b.argumentationScore !== a.argumentationScore) {
      return b.argumentationScore - a.argumentationScore;
    }
    return a.team.id - b.team.id;
  });

  // Assign ranks (with tied handling)
  let currentRank = 1;
  for (let i = 0; i < analyzed.length; i++) {
    if (i > 0) {
      const prev = analyzed[i - 1];
      const curr = analyzed[i];
      const isExactTie =
        prev.overallTotal === curr.overallTotal &&
        prev.presentationTotal === curr.presentationTotal &&
        prev.argumentationScore === curr.argumentationScore;

      if (!isExactTie) {
        currentRank = i + 1;
      }
    }
    analyzed[i].rank = currentRank;
  }

  return analyzed;
}

export function canTeamRebut(
  teamId: number,
  currentPresentingTeamId: number,
  rebuttals: RebuttalRecord[]
): { canRebut: boolean; reason?: string; usedCount: number } {
  if (teamId === currentPresentingTeamId) {
    return { canRebut: false, reason: 'Không thể phản biện chính lượt thi của đội mình', usedCount: 0 };
  }

  const teamRebuttals = getTeamRebuttals(teamId, rebuttals);
  const usedCount = teamRebuttals.length;

  if (usedCount >= 3) {
    return { canRebut: false, reason: 'Đã sử dụng hết 3 lượt phản biện', usedCount };
  }

  const alreadyInThisRound = teamRebuttals.some((r) => r.roundTeamId === currentPresentingTeamId);
  if (alreadyInThisRound) {
    return { canRebut: false, reason: 'Đã phản biện trong lượt này rồi (tối đa 1 lần/lượt)', usedCount };
  }

  return { canRebut: true, usedCount };
}
