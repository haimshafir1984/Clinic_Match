import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandMark } from "@/components/branding/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/swipe";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNetworkError(null);
    if (!email.trim()) {
      toast.error("נא להזין אימייל");
      return;
    }

    setLoading(true);
    try {
      const { error, needsRegistration } = await signIn(email.trim());
      if (error) {
        if (needsRegistration) {
          toast.info("לא מצאנו משתמש עם המייל הזה, נעביר להרשמה");
          navigate("/register", { state: { email: email.trim() } });
          return;
        }

        if (error.message.includes("לא מגיב") || error.message.includes("Request failed")) {
          setNetworkError(error.message);
        } else {
          toast.error("שגיאה בהתחברות", { description: error.message });
        }
        return;
      }

      toast.success("התחברת בהצלחה");
      navigate(from, { replace: true });
    } catch {
      setNetworkError("שגיאה בתקשורת עם השרת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/30 to-background px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandMark size={72} className="mb-4 h-20 w-20 rounded-2xl shadow-lg" />
            <h1 className="text-3xl font-bold text-foreground">ShiftMatch</h1>
            <p className="mt-2 text-sm text-muted-foreground">פלטפורמת התאמה בין עובדים ובתי עסק במגוון תחומים</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">כניסה למערכת</CardTitle>
              <CardDescription>הזינו את כתובת האימייל כדי להתחבר</CardDescription>
            </CardHeader>

            {networkError && (
              <div className="px-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{networkError}</AlertDescription>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" autoComplete="email" placeholder="name@example.com" />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "כניסה"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  עדיין אין חשבון? <Link to="/register" className="font-medium text-primary hover:underline">להרשמה</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
