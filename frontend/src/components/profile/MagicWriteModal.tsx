import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateBio } from "@/lib/api";
import { toast } from "sonner";

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
      toast.success("הטקסט נוצר בהצלחה");
    } catch (error) {
      toast.error("שגיאה ביצירת הטקסט", {
        description: error instanceof Error ? error.message : "נסו שוב מאוחר יותר",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />כתיבה חכמה</DialogTitle>
          <DialogDescription>
            {role === "clinic" ? "תארו את בית העסק בכמה מילים והמערכת תכתוב טקסט קצר בשבילכם." : "תארו את עצמכם בכמה מילים והמערכת תכתוב טקסט קצר בשבילכם."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">מילות מפתח</Label>
            <Input id="keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} disabled={isGenerating} placeholder={role === "clinic" ? "מקצועי, שירותי, מהיר" : "אחראי, יסודי, מנוסה"} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>ביטול</Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !keywords.trim()} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              צור טקסט
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
