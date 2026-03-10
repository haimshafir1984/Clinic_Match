import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Flame, Crown } from "lucide-react";

interface BoostProfileSectionProps {
  isUrgent: boolean;
  onUrgentChange: (urgent: boolean) => void;
}

export function BoostProfileSection({
  isUrgent,
  onUrgentChange,
}: BoostProfileSectionProps) {
  return (
    <Card className="overflow-hidden border-amber-500/30">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          קידום פרופיל
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Urgent Hiring Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="urgent-hiring" className="text-sm font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              גיוס דחוף
            </Label>
            <p className="text-xs text-muted-foreground">
              הפרופיל שלך יופיע בולט יותר בפיד
            </p>
          </div>
          <Switch
            id="urgent-hiring"
            checked={isUrgent}
            onCheckedChange={onUrgentChange}
          />
        </div>

        {/* Premium Feature Notice */}
        {isUrgent && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Crown className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              This is a Premium feature
            </p>
            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
              Beta
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
