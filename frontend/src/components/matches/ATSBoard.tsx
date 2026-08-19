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
    { id: 'screening', nameHe: 'סינון AI', tBorderColor: 'border-t-warning', glassBg: 'bg-warning/5' },
    { id: 'interview', nameHe: 'ראיון עבודה', tBorderColor: 'border-t-primary', glassBg: 'bg-primary/5' },
    { id: 'offer', nameHe: 'הצעת שכר', tBorderColor: 'border-t-accent-foreground', glassBg: 'bg-accent/40' },
    { id: 'hired', nameHe: 'גוייס בהצלחה', tBorderColor: 'border-t-success', glassBg: 'bg-success/5' }
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
    <div className="space-y-6 text-foreground" style={{ direction: 'rtl' }}>
      {/* Intro details */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>לוח ניהול גיוס ומועמדים - ATS Pipeline</span>
            <span className="text-xs bg-muted border border-border text-foreground font-mono font-bold px-2.5 py-0.5 rounded-full">
              {activeMatches.length} מועמדים
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
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
              className={`glass-panel border-border border-t-4 ${stage.tBorderColor} rounded-2xl flex flex-col h-[560px] overflow-hidden ${stage.glassBg}`}
            >
              {/* Column Title */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 flex-shrink-0">
                <span className="text-sm font-extrabold text-foreground">{stage.nameHe}</span>
                <span className="text-xs font-bold text-primary bg-muted border border-border w-6 h-6 rounded-full flex items-center justify-center font-mono">
                  {stageMatches.length}
                </span>
              </div>

              {/* Candidates in this stage scroller */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" id={`ats-scroll-${stage.id}`}>
                {stageMatches.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs text-muted-foreground/70 font-medium leading-relaxed">אין מועמדים בעמודה זו כרגע</p>
                  </div>
                ) : (
                  stageMatches.map(m => (
                    <motion.div
                      key={m.id}
                      id={`ats-card-${m.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border hover:bg-muted/40 rounded-xl p-3 shadow-lg group relative space-y-3 transition-all text-foreground"
                    >
                      {/* Avatar Detail Line */}
                      <div className="flex items-start gap-2.5">
                        <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                          <AvatarImage src={m.otherProfile.imageUrl || undefined} />
                          <AvatarFallback className="bg-accent text-primary font-bold rounded-lg text-xs">
                            {m.otherProfile.name ? m.otherProfile.name.substring(0, 2) : 'MM'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-right flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-foreground line-clamp-1">{m.otherProfile.name}</h4>
                          <p className="text-[10px] text-primary font-extrabold line-clamp-1 truncate mt-0.5">
                            {m.otherProfile.position || 'משרה מתאימה'}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1 font-semibold">
                            <Briefcase className="h-2.5 w-2.5 text-muted-foreground/70" />
                            <span>{m.otherProfile.experienceYears || 0} שנות ניסיון</span>
                          </p>
                        </div>
                      </div>

                      {/* AI evaluation Summary indication under Screening column */}
                      {stage.id === 'screening' && m.pipeline?.summary && (
                        <div className="bg-warning/10 border border-warning/20 p-2 rounded-lg">
                          <span className="text-[9px] font-black text-warning flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5 animate-pulse text-warning fill-current" />
                            מענה לסינון AI הושלם
                          </span>
                          <span className="text-[9px] text-muted-foreground font-medium line-clamp-2 mt-0.5 leading-normal">
                            {m.pipeline.summary}
                          </span>
                        </div>
                      )}

                      {/* Scheduled Interview details */}
                      {m.pipeline?.nextStep && m.pipeline.stage === 'interview' && (
                        <div className="flex items-center gap-1.5 bg-muted border border-border p-1.5 rounded-md text-[9px] text-muted-foreground font-semibold font-mono">
                          <Calendar className="h-3 w-3 text-primary" />
                          <span>ראיון: {m.pipeline.nextStep}</span>
                        </div>
                      )}

                      {/* Promote and rejection controls */}
                      <div className="border-t border-border pt-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                        <button
                          onClick={() => onOpenChat(m.id)}
                          className="text-[10px] text-primary font-bold hover:bg-muted border border-primary/30 bg-primary/5 px-2 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>פתח צ׳אט</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Reject trigger */}
                          <button
                            onClick={() => handleReject(m.id)}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded-md border border-destructive/20 transition-all cursor-pointer"
                            title="ארכב מועמד"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>

                          {/* Schedule Interview button */}
                          {stage.id === 'screening' && (
                            <button
                              onClick={() => setSchedulingMatchId(m.id)}
                              className="px-2 py-1 bg-primary/10 border border-primary/30 text-primary text-[10px] font-extrabold rounded-md hover:bg-primary/20 cursor-pointer"
                            >
                              קבע ראיון 📅
                            </button>
                          )}

                          {/* Core stage promotion trigger */}
                          {stage.id !== 'hired' && stage.id !== 'screening' && (
                            <button
                              onClick={() => handlePromote(m.id, m.pipeline?.stage || 'matched')}
                              className="px-2.5 py-1 bg-success hover:bg-success/90 text-success-foreground text-[10px] font-bold rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
                            >
                              <span>קדם</span>
                              <ChevronRight className="h-3 w-3 transform rotate-180" />
                            </button>
                          )}

                          {stage.id === 'screening' && !m.pipeline?.nextStep && (
                            <button
                              onClick={() => handlePromote(m.id, m.pipeline?.stage || 'matched')}
                              className="px-2 py-1 bg-success hover:bg-success/90 text-success-foreground text-[10px] font-bold rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
                            >
                              <span>קדם</span>
                              <ChevronRight className="h-3 w-3 transform rotate-180" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Small inline date scheduling dialog */}
                      {schedulingMatchId === m.id && (
                        <div className="absolute inset-0 bg-card border border-border shadow-xl rounded-xl p-3.5 z-10 flex flex-col justify-between">
                          <p className="text-[10px] font-bold text-foreground">הזן תאריך ושעת ראיון:</p>
                          <input
                            type="text"
                            placeholder="למשל: 25/08 בשעה 10:00"
                            value={interviewDate}
                            onChange={(e) => setInterviewDate(e.target.value)}
                            className="bg-muted/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-right font-semibold text-foreground placeholder-muted-foreground"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setSchedulingMatchId(null)}
                              className="px-2 py-1 bg-muted rounded-md text-[9px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              ביטול
                            </button>
                            <button
                              onClick={() => submitInterview(m.id)}
                              className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-[9px] font-bold cursor-pointer transition-all"
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
