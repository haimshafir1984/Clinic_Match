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

type LoginStep = "email" | "password" | "otp";

export default function Login() {
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const { startLogin, loginWithPassword, verifyLoginOtp, requestOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/swipe";

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNetworkError(null);
    if (!email.trim()) {
      toast.error("נא להזין אימייל");
      return;
    }

    setLoading(true);
    try {
      const { mode, error } = await startLogin(email.trim());
      if (error || !mode) {
        setNetworkError(error?.message || "שגיאה בתקשורת עם השרת. נסה שוב.");
        return;
      }

      if (mode === "register") {
        toast.info("לא מצאנו משתמש עם המייל הזה, נעביר להרשמה");
        navigate("/register", { state: { email: email.trim() } });
        return;
      }

      if (mode === "otp") {
        toast.success("שלחנו קוד למייל שלך");
      }
      setStep(mode);
    } catch {
      setNetworkError("שגיאה בתקשורת עם השרת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNetworkError(null);
    if (!password) {
      toast.error("נא להזין סיסמה");
      return;
    }

    setLoading(true);
    try {
      const { error } = await loginWithPassword(email.trim(), password);
      if (error) {
        toast.error("שגיאה בהתחברות", { description: error.message });
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

  const handleOtpSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNetworkError(null);
    if (code.trim().length !== 6) {
      toast.error("נא להזין קוד בן 6 ספרות");
      return;
    }

    setLoading(true);
    try {
      const { error } = await verifyLoginOtp(email.trim(), code.trim());
      if (error) {
        toast.error("שגיאה באימות הקוד", { description: error.message });
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

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await requestOtp(email.trim(), "login");
      if (error) {
        toast.error("שליחת הקוד נכשלה", { description: error.message });
        return;
      }
      toast.success("קוד חדש נשלח למייל שלך");
    } finally {
      setResending(false);
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
              <CardDescription>
                {step === "email" && "הזינו את כתובת האימייל כדי להתחבר"}
                {step === "password" && "הזינו את הסיסמה שלכם"}
                {step === "otp" && `הזינו את הקוד שנשלח ל-${email.trim()}`}
              </CardDescription>
            </CardHeader>

            {networkError && (
              <div className="px-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{networkError}</AlertDescription>
                </Alert>
              </div>
            )}

            {step === "email" && (
              <form onSubmit={handleEmailSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל</Label>
                    <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" autoComplete="email" placeholder="name@example.com" autoFocus />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "המשך"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    עדיין אין חשבון? <Link to="/register" className="font-medium text-primary hover:underline">להרשמה</Link>
                  </p>
                </CardFooter>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handlePasswordSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">סיסמה</Label>
                    <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "כניסה"}
                  </Button>
                  <button type="button" className="text-center text-sm text-muted-foreground hover:underline" onClick={() => { setStep("email"); setPassword(""); }}>
                    חזרה
                  </button>
                </CardFooter>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleOtpSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">קוד בן 6 ספרות</Label>
                    <Input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} dir="ltr" className="text-center text-lg tracking-[0.5em]" autoFocus />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "כניסה"}
                  </Button>
                  <div className="flex w-full justify-between text-sm">
                    <button type="button" className="text-muted-foreground hover:underline" onClick={() => { setStep("email"); setCode(""); }}>
                      חזרה
                    </button>
                    <button type="button" className="font-medium text-primary hover:underline disabled:opacity-50" onClick={handleResend} disabled={resending}>
                      {resending ? "שולח..." : "שלח קוד חדש"}
                    </button>
                  </div>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
