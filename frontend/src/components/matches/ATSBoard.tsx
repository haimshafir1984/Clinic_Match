import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  ChevronRight, 
  Trash2, 
  Briefcase, 
  Sparkles,
  MessageSquare,
  CalendarClock
} from 'lucide-react';
import { Match, RecruitmentStage } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface ATSBoardProps {
  matches: Match[];
  onUpdateStage: (matchId: string, stage: RecruitmentStage, interviewDate?: string) => Promise<void>;
  onOpenChat: (matchId: string) => void;
}

export default function ATSBoard({ matches, onUpdateStage, onOpenChat }: ATSBoardProps) {
  const [schedulingMatchId, setSchedulingMatchId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const stages = [
    { id: 'screening', nameHe: 'סינון AI', tBorderColor: 'border-t-orange-400', glassBg: 'bg-orange-500/5' },
    { id: 'interview', nameHe: 'ראיון עבודה', tBorderColor: 'border-t-cyan-400', glassBg: 'bg-cyan-500/5' },
    { id: 'offer', nameHe: 'הצעת שכר', tBorderColor: 'border-t-fuchsia-400', glassBg: 'bg-fuchsia-500/5' },
    { id: 'hired', nameHe: 'גוייס בהצלחה', tBorderColor: 'border-t-emerald-400', glassBg: 'bg-emerald-500/5' }
  ];

  // Filter out matches that are closed or in archived stage
  const activeMatches = matches.filter(
    (m) => !m.isClosed && m.pipeline?.stage !== 'archived'
  );

  const handlePromote = async (matchId: string, currentStatus: string) => {
    let nextStatus: RecruitmentStage = 'interview';
    if (currentStatus === 'matched' || currentStatus === 'screening') nextStatus = 'interview';
    else if (currentStatus === 'interview') nextStatus = 'offer';
    else if (currentStatus === 'offer') nextStatus = 'hired';

    setIsLoading(true);
    try {
      await onUpdateStage(matchId, nextStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (matchId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך להעביר את המועמד לארכיון?')) {
      setIsLoading(true);
      try {
        await onUpdateStage(matchId, 'archived');
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const submitInterview = async (matchId: string) => {
    if (!interviewDate.trim()) return;
    setIsLoading(true);
    try {
      await onUpdateStage(matchId, 'interview', interviewDate);
      setSchedulingMatchId(null);
      setInterviewDate('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if match fits screening column
  const getStageMatches = (stageId: string) => {
    return activeMatches.filter((m) => {
      const matchStage = m.pipeline?.stage || 'matched';
      if (stageId === 'screening') {
        return matchStage === 'matched' || matchStage === 'screening';
      }
      return matchStage === stageId;
    });
  };

  return (
    <div className="space-y-6 text-white" style={{ direction: 'rtl' }}>
      {/* Intro details */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <span>לוח ניהול גיוס ומועמדים - ATS Pipeline</span>
            <span className="text-xs bg-white/10 border border-white/10 text-white font-mono font-bold px-2.5 py-0.5 rounded-full">
              {activeMatches.length} מועמדים
            </span>
          </h3>
          <p className="text-xs text-white/60 mt-1">
            נהל/י את שלבי הגיוס של המועמדים, קבע/י ראיונות בצורה מרוכזת וקדם/י מועמדים בסולם הגיוס.
          </p>
        </div>
      </div>

      {/* Kanban Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map(stage => {
          const stageMatches = getStageMatches(stage.id);

          return (
            <div 
              key={stage.id} 
              id={`ats-col-${stage.id}`}
              className={`glass-panel border-white/10 border-t-4 ${stage.tBorderColor} rounded-2xl flex flex-col h-[560px] overflow-hidden ${stage.glassBg}`}
            >
              {/* Column Title */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
                <span className="text-sm font-extrabold text-white/95">{stage.nameHe}</span>
                <span className="text-xs font-bold text-cyan-300 bg-white/10 border border-white/10 w-6 h-6 rounded-full flex items-center justify-center font-mono">
                  {stageMatches.length}
                </span>
              </div>

              {/* Candidates in this stage scroller */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" id={`ats-scroll-${stage.id}`}>
                {stageMatches.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs text-white/40 font-medium leading-relaxed">אין מועמדים בעמודה זו כרגע</p>
                  </div>
                ) : (
                  stageMatches.map(m => (
                    <motion.div 
                      key={m.id}
                      id={`ats-card-${m.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl p-3 shadow-lg group relative space-y-3 transition-all text-white"
                    >
                      {/* Avatar Detail Line */}
                      <div className="flex items-start gap-2.5">
                        <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                          <AvatarImage src={m.otherProfile.imageUrl || undefined} />
                          <AvatarFallback className="bg-white/10 text-cyan-400 font-bold rounded-lg text-xs">
                            {m.otherProfile.name ? m.otherProfile.name.substring(0, 2) : 'MM'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-right flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{m.otherProfile.name}</h4>
                          <p className="text-[10px] text-cyan-300 font-extrabold line-clamp-1 truncate mt-0.5">
                            {m.otherProfile.position || 'משרה מתאימה'}
                          </p>
                          <p className="text-[9px] text-white/60 mt-1 flex items-center gap-1 font-semibold">
                            <Briefcase className="h-2.5 w-2.5 text-white/40" />
                            <span>{m.otherProfile.experienceYears || 0} שנות ניסיון</span>
                          </p>
                        </div>
                      </div>

                      {/* AI evaluation Summary indication under Screening column */}
                      {stage.id === 'screening' && m.pipeline?.summary && (
                        <div className="bg-orange-500/15 border border-orange-400/20 p-2 rounded-lg">
                          <span className="text-[9px] font-black text-orange-300 flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5 animate-pulse text-orange-400 fill-current" />
                            מענה לסינון AI הושלם
                          </span>
                          <span className="text-[9px] text-white/70 font-medium line-clamp-2 mt-0.5 leading-normal">
                            {m.pipeline.summary}
                          </span>
                        </div>
                      )}

                      {/* Scheduled Interview details */}
                      {m.pipeline?.nextStep && m.pipeline.stage === 'interview' && (
                        <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 p-1.5 rounded-md text-[9px] text-white/80 font-semibold font-mono">
                          <Calendar className="h-3 w-3 text-cyan-400" />
                          <span>ראיון: {m.pipeline.nextStep}</span>
                        </div>
                      )}

                      {/* Promote and rejection controls */}
                      <div className="border-t border-white/10 pt-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                        <button
                          onClick={() => onOpenChat(m.id)}
                          className="text-[10px] text-cyan-300 font-bold hover:bg-white/10 border border-cyan-400/30 bg-cyan-400/5 px-2 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>פתח צ׳אט</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Reject trigger */}
                          <button
                            onClick={() => handleReject(m.id)}
                            className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-md border border-rose-500/20 transition-all cursor-pointer"
                            title="ארכב מועמד"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>

                          {/* Schedule Interview button */}
                          {stage.id === 'screening' && (
                            <button
                              onClick={() => setSchedulingMatchId(m.id)}
                              className="px-2 py-1 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-extrabold rounded-md hover:bg-cyan-500/30 cursor-pointer"
                            >
                              קבע ראיון 📅
                            </button>
                          )}

                          {/* Core stage promotion trigger */}
                          {stage.id !== 'hired' && stage.id !== 'screening' && (
                            <button
                              onClick={() => handlePromote(m.id, m.pipeline?.stage || 'matched')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
                            >
                              <span>קדם</span>
                              <ChevronRight className="h-3 w-3 transform rotate-180" />
                            </button>
                          )}

                          {stage.id === 'screening' && !m.pipeline?.nextStep && (
                            <button
                              onClick={() => handlePromote(m.id, m.pipeline?.stage || 'matched')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
                            >
                              <span>קדם</span>
                              <ChevronRight className="h-3 w-3 transform rotate-180" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Small inline date scheduling dialog */}
                      {schedulingMatchId === m.id && (
                        <div className="absolute inset-0 bg-slate-950/95 border border-white/15 rounded-xl p-3.5 z-10 flex flex-col justify-between">
                          <p className="text-[10px] font-bold text-white/90">הזן תאריך ושעת ראיון:</p>
                          <input
                            type="text"
                            placeholder="למשל: 25/08 בשעה 10:00"
                            value={interviewDate}
                            onChange={(e) => setInterviewDate(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-right font-semibold text-white placeholder-white/40"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setSchedulingMatchId(null)}
                              className="px-2 py-1 bg-white/10 rounded-md text-[9px] font-semibold text-white/80 hover:text-white cursor-pointer"
                            >
                              ביטול
                            </button>
                            <button
                              onClick={() => submitInterview(m.id)}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-[9px] font-bold cursor-pointer transition-all"
                            >
                              שמור 🚀
                            </button>
                          </div>
                        </div>
                      )}

                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
