import { RecruitmentSettings } from "@/components/profile/RecruitmentSettings";
import { BoostProfileSection } from "@/components/profile/BoostProfileSection";

interface RecruitmentAutomationTabProps {
  screeningQuestions: string[];
  isAutoScreenerActive: boolean;
  isUrgent: boolean;
  position?: string | null;
  workplaceType?: string | null;
  onQuestionsChange: (questions: string[]) => void;
  onAutoScreenerChange: (active: boolean) => void;
  onUrgentChange: (urgent: boolean) => void;
}

export function RecruitmentAutomationTab({
  screeningQuestions,
  isAutoScreenerActive,
  isUrgent,
  position,
  workplaceType,
  onQuestionsChange,
  onAutoScreenerChange,
  onUrgentChange,
}: RecruitmentAutomationTabProps) {
  return (
    <div className="space-y-4">
      {/* AI Screener Settings */}
      <RecruitmentSettings
        questions={screeningQuestions}
        isAutoScreenerActive={isAutoScreenerActive}
        onQuestionsChange={onQuestionsChange}
        onAutoScreenerChange={onAutoScreenerChange}
        position={position}
        workplaceType={workplaceType}
      />

      {/* Boost Profile / Urgent Hiring */}
      <BoostProfileSection
        isUrgent={isUrgent}
        onUrgentChange={onUrgentChange}
      />
    </div>
  );
}
