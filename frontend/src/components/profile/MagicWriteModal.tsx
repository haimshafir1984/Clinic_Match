import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateBio } from "@/lib/api";

interface MagicWriteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "clinic" | "worker";
  onGenerated: (bio: string) => void;
}

export function MagicWriteModal({ open, onOpenChange, role, onGenerated }: MagicWriteModalProps) {
  const [keywords, setKeywords] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!keywords.trim()) {
      toast.error("נא להזין מילות מפתח");
      return;
    }

    setIsGenerating(true);
    try {
      const bio = await generateBio(keywords, role === "clinic" ? "CLINIC" : "STAFF");
      onGenerated(bio);
      onOpenChange(false);
      setKeywords("");
      toast.success("הביוגרפיה נוצרה בהצלחה! ✨");
    } catch (error: any) {
      toast.error("שגיאה ביצירת הטקסט", { 
        description: error.message || "נסה שוב מאוחר יותר" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            כתיבה קסומה
          </DialogTitle>
          <DialogDescription>
            {role === "clinic" 
              ? "תאר את המרפאה ב-3 מילים והבינה המלאכותית תכתוב עבורך"
              : "תאר את עצמך ב-3 מילים והבינה המלאכותית תכתוב עבורך"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">מילות מפתח</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={role === "clinic" 
                ? "למשל: מקצועית, חדשנית, משפחתית"
                : "למשל: חרוץ, מנוסה, לומד מהר"}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              הפרד בין המילים בפסיקים
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !keywords.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  צור טקסט
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
