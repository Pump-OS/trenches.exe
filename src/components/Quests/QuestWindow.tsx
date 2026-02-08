// ============================================================
// Quest Window — side quests / achievements display
// ============================================================

import { useMemo } from 'react';
import { useQuestStore } from '../../store/questStore';

export const QuestWindow = () => {
  const quests = useQuestStore(s => s.quests);
  const completedCount = useQuestStore(s => s.completedCount);

  const activeQuests = useMemo(() => quests.filter(q => !q.completed), [quests]);
  const completedQuests = useMemo(() => quests.filter(q => q.completed), [quests]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '8px 12px', borderBottom: '2px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>⚔️ Side Quests</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Complete quests to earn bonus SOL</div>
        </div>
        <div style={{
          padding: '4px 12px', background: 'var(--bg-input)',
          border: '2px inset #505060', fontWeight: 'bold', fontSize: 12,
        }}>
          {completedCount}/{quests.length}
        </div>
      </div>

      <div className="scroll-content" style={{ flex: 1 }}>
        {activeQuests.length > 0 && (
          <>
            <div style={{
              padding: '6px 8px', fontSize: 10, color: 'var(--text-muted)',
              fontWeight: 'bold', background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid var(--border)',
            }}>
              ACTIVE ({activeQuests.length})
            </div>
            {activeQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </>
        )}
        {completedQuests.length > 0 && (
          <>
            <div style={{
              padding: '6px 8px', fontSize: 10, color: 'var(--text-muted)',
              fontWeight: 'bold', background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid var(--border)',
            }}>
              COMPLETED ({completedQuests.length})
            </div>
            {completedQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

function QuestCard({ quest }: {
  quest: {
    id: string; title: string; description: string; icon: string;
    reward: number; completed: boolean; progress: number;
    current: number; target: number;
  };
}) {
  return (
    <div className={`quest-card ${quest.completed ? 'completed' : ''}`}>
      <div className="quest-icon">{quest.icon}</div>
      <div className="quest-info">
        <div className="quest-title">
          {quest.title} {quest.completed && ' ✅'}
        </div>
        <div className="quest-desc">{quest.description}</div>
        <div className="quest-progress">
          <div
            className="quest-progress-fill"
            style={{
              width: `${quest.progress * 100}%`,
              background: quest.completed ? 'var(--green)' : 'var(--blue)',
            }}
          />
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
          {quest.current}/{quest.target}
        </div>
      </div>
      <div className="quest-reward">
        {quest.reward > 0 ? `+${quest.reward} SOL` : '🏆'}
      </div>
    </div>
  );
}
