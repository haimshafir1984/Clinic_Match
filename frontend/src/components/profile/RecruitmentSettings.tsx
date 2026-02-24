import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Plus, Trash2, BotMessageSquare } from "lucide-react";
import { toast } from "sonner";
import { generateScreeningQuestions } from "@/lib/api";

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

  const handleAddQuestion = () => {
    if (questions.length >= 3) {
      toast.error("ניתן להוסיף עד 3 שאלות");
      return;
    }
    onQuestionsChange([...questions, ""]);
  };

  const handleRemoveQuestion = (index: number) => {
    onQuestionsChange(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    onQuestionsChange(updated);
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateScreeningQuestions(position || undefined, workplaceType || undefined);
      onQuestionsChange(generated.slice(0, 3));
      toast.success("השאלות נוצרו בהצלחה! ✨");
    } catch (error: any) {
      toast.error("שגיאה ביצירת שאלות", { 
        description: error.message || "נסה שוב מאוחר יותר" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BotMessageSquare className="w-4 h-4 text-primary" />
          הגדרות גיוס
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Auto-Screener Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="auto-screener" className="text-sm font-medium">
              סינון אוטומטי
            </Label>
            <p className="text-xs text-muted-foreground">
              שלח שאלות סינון אוטומטיות כאשר נוצר Match
            </p>
          </div>
          <Switch
            id="auto-screener"
            checked={isAutoScreenerActive}
            onCheckedChange={onAutoScreenerChange}
          />
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">שאלות סינון (עד 3)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateQuestions}
              disabled={isGenerating}
              className="gap-1 text-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  צור עם AI
                </>
              )}
            </Button>
          </div>

          {questions.map((question, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                placeholder={`שאלה ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveQuestion(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {questions.length < 3 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddQuestion}
              className="w-full gap-2 border-dashed"
            >
              <Plus className="w-4 h-4" />
              הוסף שאלה
            </Button>
          )}

          {questions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              לחץ על "צור עם AI" כדי ליצור שאלות סינון מותאמות
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
