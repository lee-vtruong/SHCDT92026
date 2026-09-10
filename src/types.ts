export type RoundPhase = 'prepare' | 'present' | 'rebuttal' | 'idle';

export interface RubricScores {
  topicUnderstanding: number;    // Hiểu đề & bám sát vấn đề (max 24)
  argumentation: number;         // Lập luận & tư duy phản biện (max 30) - TIÊU CHÍ PHỤ ƯU TIÊN
  feasibility: number;           // Tính khả thi/giá trị giải pháp (max 24)
  creativity: number;            // Tính sáng tạo (max 18)
  presentationSkills: number;    // Kỹ năng trình bày & quản lý thời gian (max 24)
}

export interface JudgeInfo {
  id: number;
  name: string;
  code: string;
  isBackup?: boolean;
}

export interface JudgeScoreRecord {
  judgeId: number;
  judgeName: string;
  scores: RubricScores;
  notes?: string;
  submittedAt: number;
}

export type RebuttalLevel = 'none' | 'valid' | 'sharp' | 'excellent';

export interface RebuttalRecord {
  id: string;
  roundTeamId: number;           // Đội nào đang trình bày lúc phản biện xảy ra
  rebuttalTeamId: number;        // Đội thực hiện phản biện
  level: RebuttalLevel;          // Mức 1 (+0.5), Mức 2 (+1.0), Mức 3 (+1.5), Không điểm (0)
  score: number;                 // 0, 0.5, 1.0, 1.5
  note?: string;                 // Ghi chú ngắn của BGK/MC
  timestamp: number;
}

export interface Team {
  id: number;
  name: string;
  topicId: number | null;
  presentationScores: RubricScores;
  judgeScores?: Record<number, JudgeScoreRecord>; // Chấm điểm độc lập theo từng BGK (1..5)
  hasPresented: boolean;
  presentationCompletedAt?: number;
  presentationNotes?: string;
}

export interface Topic {
  id: number;
  title: string;
  category: string;
  description: string;
  guidingQuestions: string[];
}

export interface GameSettings {
  prepareDuration: number;   // 60s
  presentDuration: number;   // 120s
  rebuttalDuration: number;  // 60s
  soundEnabled: boolean;
}

export interface JudgeProfile {
  id: number;
  name: string;
  role: string;
  subTitle: string;
  avatarUrl: string;
  fallbackColor: string;
  achievements: string[];
  bioQuote?: string;
}

export interface BuzzerRecord {
  teamId: number;
  teamName: string;
  buzzedAt?: number;
  timestamp: number;
  diffMs?: number;
}

export interface TeamAccount {
  id: number;
  name: string;
  code: string;
}

