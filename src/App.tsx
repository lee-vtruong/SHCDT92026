import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { StageTimerView } from './components/StageTimerView';
import { ScoringView } from './components/ScoringView';
import { LeaderboardView } from './components/LeaderboardView';
import { TopicsView } from './components/TopicsView';
import { RulesView } from './components/RulesView';
import { JudgeAuthModal } from './components/JudgeAuthModal';
import { AdminResetModal } from './components/AdminResetModal';
import { Team, Topic, RebuttalRecord, RubricScores, JudgeInfo, JudgeScoreRecord } from './types';
import { DEFAULT_TOPICS, INITIAL_TEAMS, generateRandomTeamTopicAssignment } from './data/defaultTopics';
import { soundManager } from './utils/audio';
import { authenticateJudge } from './utils/scoring';

const STORAGE_KEYS = {
  TEAMS: 'chuyende_teams_v2',
  TOPICS: 'chuyende_topics_v2',
  REBUTTALS: 'chuyende_rebuttals_v2',
  SOUND: 'chuyende_sound_v1',
  CURRENT_JUDGE: 'chuyende_judge_v1',
  IS_ADMIN: 'chuyende_is_admin_v2',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stage');

  // Judge state & modal
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState<boolean>(false);
  const [isAdminResetModalOpen, setIsAdminResetModalOpen] = useState<boolean>(false);
  const [currentJudge, setCurrentJudge] = useState<JudgeInfo | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_JUDGE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
    } catch {
      return false;
    }
  });

  // 1. Teams State with LocalStorage
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 10) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_TEAMS;
  });

  // 2. Topics State with LocalStorage
  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TOPICS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 16) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_TOPICS;
  });

  // 3. Rebuttal records
  const [rebuttals, setRebuttals] = useState<RebuttalRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REBUTTALS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  // 4. Sound preference
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {}
    return true;
  });

  // Active teams being viewed
  const [currentTeamId, setCurrentTeamId] = useState<number>(1);
  const [selectedScoringTeamId, setSelectedScoringTeamId] = useState<number>(1);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REBUTTALS, JSON.stringify(rebuttals));
  }, [rebuttals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOUND, JSON.stringify(soundEnabled));
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (currentJudge) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_JUDGE, JSON.stringify(currentJudge));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_JUDGE);
    }
  }, [currentJudge]);

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem(STORAGE_KEYS.IS_ADMIN, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.IS_ADMIN);
    }
  }, [isAdmin]);

  // Handlers for Judge Authentication
  const handleSelectJudge = (judge: JudgeInfo) => {
    setCurrentJudge(judge);
  };

  const handleLogoutJudge = () => {
    setCurrentJudge(null);
  };

  const handleLoginAdmin = () => {
    setIsAdmin(true);
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
  };

  const handleLoginWithCode = (code: string): boolean => {
    const judge = authenticateJudge(code);
    if (judge) {
      setCurrentJudge(judge);
      return true;
    }
    return false;
  };

  // Handlers for Rebuttals
  const handleAddRebuttal = (record: Omit<RebuttalRecord, 'id' | 'timestamp'>) => {
    const newRecord: RebuttalRecord = {
      ...record,
      id: 'reb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
    };
    setRebuttals((prev) => [...prev, newRecord]);
  };

  const handleRemoveRebuttal = (id: string) => {
    setRebuttals((prev) => prev.filter((r) => r.id !== id));
  };

  // Handlers for Multi-Judge Scoring
  const handleUpdateJudgeScores = (
    teamId: number,
    judge: JudgeInfo,
    scores: RubricScores,
    notes?: string,
    completed: boolean = true
  ) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id === teamId) {
          const updatedJudgeScores = {
            ...(team.judgeScores || {}),
            [judge.id]: {
              judgeId: judge.id,
              judgeName: judge.name,
              scores,
              notes,
              submittedAt: Date.now(),
            },
          };

          // Recompute team's presentationScores as average of all judges who graded
          const records = Object.values(updatedJudgeScores) as JudgeScoreRecord[];
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

          return {
            ...team,
            judgeScores: updatedJudgeScores,
            presentationScores: avgScores,
            presentationNotes: notes ?? team.presentationNotes,
            hasPresented: completed,
            presentationCompletedAt: completed ? Date.now() : team.presentationCompletedAt,
          };
        }
        return team;
      })
    );
  };

  // Delete a specific judge's score for a team (Admin feature)
  const handleDeleteJudgeScore = (teamId: number, judgeId: number) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id === teamId) {
          const updatedJudgeScores = { ...(team.judgeScores || {}) };
          delete updatedJudgeScores[judgeId];

          const records = Object.values(updatedJudgeScores) as JudgeScoreRecord[];
          const count = records.length;
          let avgScores: RubricScores;
          if (count === 0) {
            avgScores = {
              topicUnderstanding: 0,
              argumentation: 0,
              feasibility: 0,
              creativity: 0,
              presentationSkills: 0,
            };
          } else {
            avgScores = {
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
          }

          return {
            ...team,
            judgeScores: updatedJudgeScores,
            presentationScores: avgScores,
            hasPresented: count > 0,
          };
        }
        return team;
      })
    );
  };

  // Legacy single presentation score update fallback
  const handleUpdatePresentationScores = (
    teamId: number,
    scores: RubricScores,
    notes?: string,
    completed: boolean = true
  ) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            presentationScores: scores,
            presentationNotes: notes ?? team.presentationNotes,
            hasPresented: completed,
            presentationCompletedAt: completed ? Date.now() : team.presentationCompletedAt,
          };
        }
        return team;
      })
    );
  };

  // Handlers for Topics
  const handleUpdateTopic = (updated: Topic) => {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // Shuffle topics among teams
  const handleShuffleTopics = () => {
    const topicIds = topics.map((t) => t.id);
    // Fisher-Yates shuffle
    for (let i = topicIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topicIds[i], topicIds[j]] = [topicIds[j], topicIds[i]];
    }

    setTeams((prev) =>
      prev.map((team, index) => ({
        ...team,
        topicId: topicIds[index],
      }))
    );
  };

  const handleAssignTopic = (teamId: number, topicId: number) => {
    setTeams((prev) => {
      const previousTeamWithTopic = prev.find((t) => t.topicId === topicId && t.id !== teamId);
      const currentTeam = prev.find((t) => t.id === teamId);
      const currentTopic = currentTeam?.topicId ?? null;

      return prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, topicId };
        }
        if (previousTeamWithTopic && t.id === previousTeamWithTopic.id) {
          return { ...t, topicId: currentTopic };
        }
        return t;
      });
    });
  };

  // Navigation shortcut from Stage to Scoring
  const handleGoToScoring = (teamId: number) => {
    setSelectedScoringTeamId(teamId);
    setActiveTab('scoring');
  };

  // Reset scores to 0 (Protected by admin password admin123)
  const handleAdminResetScores = (resetTopicsAlso: boolean = false) => {
    const newTopicIds = resetTopicsAlso ? generateRandomTeamTopicAssignment() : null;

    setTeams((prev) =>
      prev.map((team, index) => ({
        ...team,
        topicId: newTopicIds ? newTopicIds[index] : team.topicId,
        judgeScores: {},
        presentationScores: {
          topicUnderstanding: 0,
          argumentation: 0,
          feasibility: 0,
          creativity: 0,
          presentationSkills: 0,
        },
        presentationNotes: '',
        hasPresented: false,
        presentationCompletedAt: undefined,
      }))
    );

    if (resetTopicsAlso) {
      setTopics(DEFAULT_TOPICS);
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(DEFAULT_TOPICS));
    }

    setRebuttals([]);
    setCurrentTeamId(1);
    setSelectedScoringTeamId(1);
    localStorage.removeItem(STORAGE_KEYS.REBUTTALS);
    soundManager.playDing();
  };

  // Export JSON backup
  const handleExportData = () => {
    const exportPayload = {
      timestamp: new Date().toISOString(),
      teams,
      topics,
      rebuttals,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Sao_Luu_Chuyen_De_10_Doi_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && Array.isArray(parsed.teams) && Array.isArray(parsed.topics)) {
          setTeams(parsed.teams);
          setTopics(parsed.topics);
          if (Array.isArray(parsed.rebuttals)) {
            setRebuttals(parsed.rebuttals);
          }
          alert('Nạp dữ liệu thành công!');
        } else {
          alert('Tệp dữ liệu không hợp lệ!');
        }
      } catch {
        alert('Lỗi khi đọc tệp dữ liệu!');
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <div className="min-h-screen tech-grid-bg text-slate-800 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenAdminReset={() => setIsAdminResetModalOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        currentJudge={currentJudge}
        onOpenJudgeAuth={() => setIsJudgeModalOpen(true)}
        isAdmin={isAdmin}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'stage' && (
          <StageTimerView
            teams={teams}
            topics={topics}
            currentTeamId={currentTeamId}
            setCurrentTeamId={setCurrentTeamId}
            rebuttals={rebuttals}
            onAddRebuttal={handleAddRebuttal}
            onRemoveRebuttal={handleRemoveRebuttal}
            onGoToScoring={handleGoToScoring}
            currentJudge={currentJudge}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'scoring' && (
          <ScoringView
            teams={teams}
            topics={topics}
            selectedTeamId={selectedScoringTeamId}
            setSelectedTeamId={setSelectedScoringTeamId}
            onUpdatePresentationScores={handleUpdatePresentationScores}
            onUpdateJudgeScores={handleUpdateJudgeScores}
            onDeleteJudgeScore={handleDeleteJudgeScore}
            rebuttals={rebuttals}
            currentJudge={currentJudge}
            onOpenJudgeAuth={() => setIsJudgeModalOpen(true)}
            onLoginWithCode={handleLoginWithCode}
            onLogoutJudge={handleLogoutJudge}
            onOpenAdminReset={() => setIsAdminResetModalOpen(true)}
            isAdmin={isAdmin}
            onLoginAdmin={handleLoginAdmin}
            onLogoutAdmin={handleLogoutAdmin}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            teams={teams}
            topics={topics}
            rebuttals={rebuttals}
            onSelectTeamForScoring={handleGoToScoring}
            onOpenAdminReset={() => setIsAdminResetModalOpen(true)}
          />
        )}

        {activeTab === 'topics' && (
          <TopicsView
            topics={topics}
            teams={teams}
            onUpdateTopic={handleUpdateTopic}
            onShuffleTopics={handleShuffleTopics}
            onAssignTopic={handleAssignTopic}
          />
        )}

        {activeTab === 'rules' && <RulesView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/85 backdrop-blur py-4 px-4 text-xs text-slate-500 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-medium text-slate-700">SYS CORE: ONLINE</span>
            <span className="text-slate-300">|</span>
            <span>Sinh Hoạt Chuyên Đề: Trình Bày & Phản Biện (10 Đội)</span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 font-mono text-[11px] text-slate-400">
            <span>CHẾ ĐỘ ĐẾM 1-2-1 PHÚT • THANG 20đ + 4.5đ THƯỞNG</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100/80 border border-slate-200/70 px-2.5 py-1 rounded-full">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Web by</span>
              <a 
                href="https://www.facebook.com/leev.truong/" 
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-700 hover:text-cyan-700 transition-colors"
                title="Facebook: leev.truong"
              >
                leev.truong
              </a>
              <span className="text-slate-300">|</span>
              <a 
                href="https://www.facebook.com/leev.truong/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-700 hover:text-cyan-800 hover:underline font-medium transition-colors"
              >
                contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Judge Authentication Modal */}
      <JudgeAuthModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        currentJudge={currentJudge}
        onSelectJudge={handleSelectJudge}
        onLogoutJudge={handleLogoutJudge}
        isAdmin={isAdmin}
        onLoginAdmin={handleLoginAdmin}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Admin Reset Scores Modal */}
      <AdminResetModal
        isOpen={isAdminResetModalOpen}
        onClose={() => setIsAdminResetModalOpen(false)}
        onConfirmResetScores={handleAdminResetScores}
      />
    </div>
  );
}
