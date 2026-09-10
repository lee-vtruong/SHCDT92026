import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header';
import { StageTimerView } from './components/StageTimerView';
import { ScoringView } from './components/ScoringView';
import { LeaderboardView } from './components/LeaderboardView';
import { TopicsView } from './components/TopicsView';
import { RulesView } from './components/RulesView';
import { JudgesIntroView } from './components/JudgesIntroView';
import { RandomTopicView } from './components/RandomTopicView';
import { JudgeAuthModal } from './components/JudgeAuthModal';
import { AdminResetModal } from './components/AdminResetModal';
import { TeamBuzzerModal } from './components/TeamBuzzerModal';
import { Team, Topic, RebuttalRecord, RubricScores, JudgeInfo, JudgeScoreRecord, TeamAccount, BuzzerRecord, StageTimerState } from './types';
import { DEFAULT_TOPICS, INITIAL_TEAMS, generateRandomTeamTopicAssignment } from './data/defaultTopics';
import { soundManager } from './utils/audio';
import { authenticateJudge, canTeamRebut } from './utils/scoring';
import { teamAuthService } from './utils/teamAuthService';
import { syncService } from './utils/syncService';

const STORAGE_KEYS = {
  TEAMS: 'chuyende_teams_v2',
  TOPICS: 'chuyende_topics_v2',
  REBUTTALS: 'chuyende_rebuttals_v2',
  SOUND: 'chuyende_sound_v1',
  CURRENT_JUDGE: 'chuyende_judge_v1',
  IS_ADMIN: 'chuyende_is_admin_v2',
  TEAM_AUTH: 'chuyende_team_auth_v1',
  BUZZER_QUEUE: 'chuyende_buzzer_queue_v1',
  STAGE_TIMER_STATE: 'chuyende_stage_timer_state_v2',
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

  // 1. Teams State with LocalStorage (with auto-migration to 150 scale)
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 10) {
          // Check if migration to 150 scale is needed
          const migrated = parsed.map((team: Team) => {
            const s = team.presentationScores;
            const needsMigration = s && (s.topicUnderstanding <= 4 && s.argumentation <= 5 && (s.topicUnderstanding + s.argumentation + s.feasibility + s.creativity + s.presentationSkills) > 0);
            if (needsMigration) {
              const updatedScores = {
                topicUnderstanding: Number((s.topicUnderstanding * 6).toFixed(1)),
                argumentation: Number((s.argumentation * 6).toFixed(1)),
                feasibility: Number((s.feasibility * 6).toFixed(1)),
                creativity: Number((s.creativity * 6).toFixed(1)),
                presentationSkills: Number((s.presentationSkills * 6).toFixed(1)),
              };

              let updatedJudgeScores = team.judgeScores;
              if (updatedJudgeScores) {
                const newJudgeMap: Record<string, any> = {};
                Object.entries(updatedJudgeScores).forEach(([jId, record]: [string, any]) => {
                  const js = record.scores;
                  if (js && js.argumentation <= 5 && (js.topicUnderstanding + js.argumentation + js.feasibility + js.creativity + js.presentationSkills) > 0) {
                    newJudgeMap[jId] = {
                      ...record,
                      scores: {
                        topicUnderstanding: Number((js.topicUnderstanding * 6).toFixed(1)),
                        argumentation: Number((js.argumentation * 6).toFixed(1)),
                        feasibility: Number((js.feasibility * 6).toFixed(1)),
                        creativity: Number((js.creativity * 6).toFixed(1)),
                        presentationSkills: Number((js.presentationSkills * 6).toFixed(1)),
                      }
                    };
                  } else {
                    newJudgeMap[jId] = record;
                  }
                });
                updatedJudgeScores = newJudgeMap;
              }

              return {
                ...team,
                presentationScores: updatedScores,
                judgeScores: updatedJudgeScores,
              };
            }
            return team;
          });

          // Check if all teams had pre-assigned topics from legacy initial state
          // If so and no team has presented yet, reset topicId to null so teams draw fresh
          const hasScoresOrPresented = migrated.some(
            (t: Team) =>
              t.hasPresented ||
              (t.presentationScores &&
                (t.presentationScores.topicUnderstanding +
                  t.presentationScores.argumentation +
                  t.presentationScores.feasibility +
                  t.presentationScores.creativity +
                  t.presentationScores.presentationSkills) > 0)
          );
          const legacyInitKey = 'v2_topics_undrawn_cleared';
          if (!localStorage.getItem(legacyInitKey) && !hasScoresOrPresented) {
            localStorage.setItem(legacyInitKey, 'true');
            return migrated.map((t: Team) => ({ ...t, topicId: null }));
          }

          return migrated;
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

  // 3. Rebuttal records (with auto-migration to 150 scale: 3, 7, 10)
  const [rebuttals, setRebuttals] = useState<RebuttalRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REBUTTALS);
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          return list.map((r: RebuttalRecord) => {
            if (r.score > 0 && r.score <= 1.5) {
              const newScore = r.level === 'valid' ? 3 : r.level === 'sharp' ? 7 : r.level === 'excellent' ? 10 : 0;
              return { ...r, score: newScore };
            }
            return r;
          });
        }
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

  // 5. Team Auth & Buzzer states
  const [isTeamBuzzerModalOpen, setIsTeamBuzzerModalOpen] = useState<boolean>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (
        searchParams.get('buzzer') === 'true' ||
        searchParams.get('tab') === 'buzzer' ||
        window.location.hash === '#buzzer' ||
        window.location.pathname.includes('/buzzer')
      ) {
        return true;
      }
    } catch {}
    return false;
  });

  // Listen for hash / URL changes to toggle buzzer
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#buzzer') {
        setIsTeamBuzzerModalOpen(true);
      }
    };
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);
  const [currentTeamAuth, setCurrentTeamAuth] = useState<TeamAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAM_AUTH);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUZZER_QUEUE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Stage timer & phase state synchronized across tabs
  const [stageTimerState, setStageTimerState] = useState<StageTimerState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAGE_TIMER_STATE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      phase: 'prepare',
      timeLeft: 60,
      totalDuration: 60,
      isRunning: false,
      currentTeamId: 1,
      updatedAt: Date.now(),
    };
  });

  const handleTimerStateChange = useCallback((newState: StageTimerState) => {
    setStageTimerState(newState);
    try {
      localStorage.setItem(STORAGE_KEYS.STAGE_TIMER_STATE, JSON.stringify(newState));
    } catch {}
    syncService.pushTimerState(newState);
  }, []);

  // Active teams being viewed
  const [currentTeamId, setCurrentTeamId] = useState<number>(1);
  const [selectedScoringTeamId, setSelectedScoringTeamId] = useState<number>(1);

  // Sync buzzer, timer state, and team across tabs & devices
  useEffect(() => {
    // 1. StorageEvent for same-browser storage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.BUZZER_QUEUE) {
        try {
          if (e.newValue) {
            const nextQueue: BuzzerRecord[] = JSON.parse(e.newValue);
            setBuzzerQueue(nextQueue);
            if (nextQueue.length > 0) {
              soundManager.playBuzzer();
            }
          } else {
            setBuzzerQueue([]);
          }
        } catch {}
      } else if (e.key === STORAGE_KEYS.STAGE_TIMER_STATE) {
        try {
          if (e.newValue) {
            setStageTimerState(JSON.parse(e.newValue));
          }
        } catch {}
      } else if (e.key === STORAGE_KEYS.TEAM_AUTH) {
        try {
          setCurrentTeamAuth(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);

    // 2. Real-time syncService (BroadcastChannel + server HTTP)
    const unsubTimer = syncService.subscribeTimer((newTimer) => {
      setStageTimerState(newTimer);
    });

    const unsubBuzzer = syncService.subscribeBuzzer((newQueue) => {
      setBuzzerQueue((prev) => {
        if (newQueue.length > prev.length) {
          soundManager.playBuzzer();
        }
        return newQueue;
      });
    });

    // Initial server fetch
    syncService.fetchTimerState().then((serverTimer) => {
      if (serverTimer) {
        setStageTimerState(serverTimer);
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubTimer();
      unsubBuzzer();
    };
  }, []);

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

  // Periodic heartbeat & single-device ownership verification for logged in team
  useEffect(() => {
    if (!currentTeamAuth) return;

    let isMounted = true;

    // Check immediately upon load
    teamAuthService.sendHeartbeat(currentTeamAuth.id).then((isValid) => {
      if (!isMounted) return;
      if (!isValid) {
        setCurrentTeamAuth(null);
        try {
          localStorage.removeItem(STORAGE_KEYS.TEAM_AUTH);
        } catch {}
      }
    });

    // Check periodically every 10 seconds
    const interval = setInterval(async () => {
      const isValid = await teamAuthService.sendHeartbeat(currentTeamAuth.id);
      if (!isMounted) return;
      if (!isValid) {
        setCurrentTeamAuth(null);
        try {
          localStorage.removeItem(STORAGE_KEYS.TEAM_AUTH);
        } catch {}
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentTeamAuth]);

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

  // Handlers for Team Account & Buzzer
  const handleLoginTeam = (acc: TeamAccount) => {
    setCurrentTeamAuth(acc);
    try {
      localStorage.setItem(STORAGE_KEYS.TEAM_AUTH, JSON.stringify(acc));
    } catch {}
  };

  const handleLogoutTeam = () => {
    if (currentTeamAuth) {
      teamAuthService.logout(currentTeamAuth.id);
    }
    setCurrentTeamAuth(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.TEAM_AUTH);
    } catch {}
  };

  const handleBuzz = async (teamId: number, teamName: string) => {
    // Check 1: Stage timer must be actively counting down during Rebuttal phase
    if (!(stageTimerState.phase === 'rebuttal' && stageTimerState.isRunning && stageTimerState.timeLeft > 0)) {
      soundManager.playError();
      return;
    }

    // Check 2: Team must be eligible according to tournament rules (max 3 rebuttals, max 1 per round, not presenting team)
    const effectivePresentingTeamId = stageTimerState.currentTeamId ?? currentTeamId;
    const rebuttalCheck = canTeamRebut(teamId, effectivePresentingTeamId, rebuttals);
    if (!rebuttalCheck.canRebut) {
      soundManager.playError();
      return;
    }

    soundManager.playBuzzer();
    await syncService.buzz(teamId, teamName);
  };

  const handleResetBuzzer = async () => {
    setBuzzerQueue([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.BUZZER_QUEUE);
    } catch {}
    await syncService.resetBuzzerQueue();
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

  const handleAssignTopic = (
    teamId: number,
    topicId: number | null,
    onlyCurrentTeam: boolean = true
  ) => {
    setTeams((prev) => {
      if (onlyCurrentTeam) {
        // Đội hiện tại có đề, các đội còn lại sẽ chưa có đề (topicId: null)
        return prev.map((t) => ({
          ...t,
          topicId: t.id === teamId ? topicId : null,
        }));
      }

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

  // Clear topics of all other teams (only keep current team)
  const handleClearOtherTopics = (keepTeamId: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === keepTeamId ? t : { ...t, topicId: null }))
    );
  };

  // Clear topics of all 10 teams (reset for drawing from scratch)
  const handleClearAllTopics = () => {
    setTeams((prev) =>
      prev.map((t) => ({ ...t, topicId: null }))
    );
  };

  // Navigation shortcut from Stage to Scoring
  const handleGoToScoring = (teamId: number) => {
    setSelectedScoringTeamId(teamId);
    setActiveTab('scoring');
  };

  // Reset scores to 0 (Protected by admin password admin123)
  const handleAdminResetScores = (resetTopicsAlso: boolean = false) => {
    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        topicId: resetTopicsAlso ? null : team.topicId,
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
        onOpenTeamBuzzer={() => setIsTeamBuzzerModalOpen(true)}
        currentTeamAuth={currentTeamAuth}
        buzzerQueueCount={buzzerQueue.length}
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
            buzzerQueue={buzzerQueue}
            onResetBuzzer={handleResetBuzzer}
            onOpenTeamBuzzer={() => setIsTeamBuzzerModalOpen(true)}
            currentTeamAuth={currentTeamAuth}
            onTimerStateChange={handleTimerStateChange}
            onGoToRandomTopic={(teamId) => {
              setCurrentTeamId(teamId);
              setActiveTab('random-topic');
            }}
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

        {activeTab === 'random-topic' && (
          <RandomTopicView
            teams={teams}
            topics={topics}
            currentTeamId={currentTeamId}
            onSelectTeam={(teamId) => setCurrentTeamId(teamId)}
            onAssignTopic={handleAssignTopic}
            onClearOtherTopics={handleClearOtherTopics}
            onClearAllTopics={handleClearAllTopics}
            onGoToStage={(teamId) => {
              setCurrentTeamId(teamId);
              setActiveTab('stage');
            }}
          />
        )}

        {activeTab === 'judges' && (
          <JudgesIntroView onGoToStage={() => setActiveTab('stage')} />
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

      {/* Footer (Clean & Tidy) */}
      <footer className="border-t border-slate-200/80 bg-white/85 backdrop-blur py-3 px-4 text-xs text-slate-500 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-700">Sinh Hoạt Chuyên Đề: Trình Bày & Phản Biện (10 Đội)</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Thang điểm 120đ + 30đ thưởng (Tổng 150đ)</span>
            <span className="text-slate-300">•</span>
            <div className="inline-flex items-center gap-1.5 text-slate-500">
              <span>Web by</span>
              <a 
                href="https://www.facebook.com/leev.truong/" 
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-700 hover:text-cyan-700 transition-colors"
              >
                leev.truong
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

      {/* 10 Teams Buzzer Modal */}
      <TeamBuzzerModal
        isOpen={isTeamBuzzerModalOpen}
        onClose={() => setIsTeamBuzzerModalOpen(false)}
        teams={teams}
        rebuttals={rebuttals}
        currentTeamAuth={currentTeamAuth}
        onLoginTeam={handleLoginTeam}
        onLogoutTeam={handleLogoutTeam}
        buzzerQueue={buzzerQueue}
        onBuzz={handleBuzz}
        onResetBuzzer={handleResetBuzzer}
        presentingTeamId={currentTeamId}
        stageTimerState={stageTimerState}
      />
    </div>
  );
}
