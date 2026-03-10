import { useState } from "react";
import { BotMessageSquare, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { generateScreeningQuestions } from "@/lib/api";
import { toast } from "sonner";

interface RecruitmentSettingsProps {
  questions: string[];
  isAutoScreenerActive: boolean;
  onQuestionsChange: (questions: string[]) => void;
  onAutoScreenerChange: (active: boolean) => void;
  position?: string | null;
  workplaceType?: string | null;
}

export function RecruitmentSettings({
  questions,
  isAutoScreenerActive,
  onQuestionsChange,
  onAutoScreenerChange,
  position,
  workplaceType,
}: RecruitmentSettingsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateScreeningQuestions(position || undefined, workplaceType || undefined);
      onQuestionsChange(generated.slice(0, 3));
      toast.success("השאלות נוצרו בהצלחה");
    } catch (error) {
      toast.error("שגיאה ביצירת שאלות", {
        description: error instanceof Error ? error.message : "נסו שוב מאוחר יותר",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addQuestion = () => {
    if (questions.length >= 3) {
      toast.error("ניתן להוסיף עד 3 שאלות");
      return;
    }
    onQuestionsChange([...questions, ""]);
  };

  return (
    <Card>
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium"><BotMessageSquare className="h-4 w-4 text-primary" />הגדרות גיוס</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
          <div>
            <Label htmlFor="auto-screener" className="text-sm font-medium">סינון אוטומטי</Label>
            <p className="text-xs text-muted-foreground">שליחת שאלות קצרות אוטומטית ברגע שנוצרת התאמה.</p>
          </div>
          <Switch id="auto-screener" checked={isAutoScreenerActive} onCheckedChange={onAutoScreenerChange} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">שאלות סינון</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleGenerateQuestions()} disabled={isGenerating} className="gap-1 text-xs">
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} צור עם AI
            </Button>
          </div>

          {questions.map((question, index) => (
            <div key={`${index}-${question}`} className="flex gap-2">
              <Input value={question} onChange={(event) => onQuestionsChange(questions.map((item, currentIndex) => currentIndex === index ? event.target.value : item))} placeholder={`שאלה ${index + 1}`} className="flex-1" />
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onQuestionsChange(questions.filter((_, currentIndex) => currentIndex !== index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {questions.length < 3 && (
            <Button type="button" variant="outline" className="w-full gap-2 border-dashed" onClick={addQuestion}>
              <Plus className="h-4 w-4" />הוסף שאלה
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
