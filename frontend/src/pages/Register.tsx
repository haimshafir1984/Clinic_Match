import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Loader2, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CityMultiCombobox } from "@/components/ui/city-combobox";
import { DomainSelector } from "@/components/registration/DomainSelector";
import { RoleMultiSelector } from "@/components/registration/RoleMultiSelector";
import { BrandMark } from "@/components/branding/BrandMark";
import { WorkplaceDomain, Industry } from "@/constants/domains";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UserRole = "CLINIC" | "STAFF";
type RegistrationStep = "email" | "otp" | "role" | "domain" | "positions" | "details";

const stepOrder: RegistrationStep[] = ["email", "otp", "role", "domain", "positions", "details"];

// Marketing surfaces link in with ?role=worker / ?role=business so a visitor
// who already declared which side they're on doesn't get asked again.
export function readRoleFromQuery(search: string): UserRole | null {
  const value = new URLSearchParams(search).get("role");
  if (value === "worker" || value === "staff") return "STAFF";
  if (value === "business" || value === "clinic") return "CLINIC";
  return null;
}

export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  const { requestOtp, verifyRegisterOtp, signUp } = useAuth();
  const initialEmail = (location.state as { email?: string } | null)?.email || "";
  const presetRole = readRoleFromQuery(location.search);

  const [step, setStep] = useState<RegistrationStep>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [emailToken, setEmailToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [workplaceDomain, setWorkplaceDomain] = useState<WorkplaceDomain | null>(null);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [role, setRole] = useState<UserRole | null>(presetRole);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const currentStepIndex = stepOrder.indexOf(step);
  const canGoBack = currentStepIndex > 0 && step !== "otp";
  const isLastStep = step === "details";

  const goToNextStep = () => {
    const nextStep = stepOrder[currentStepIndex + 1];
    if (nextStep) setStep(nextStep);
  };

  const goToPreviousStep = () => {
    const previousStep = stepOrder[currentStepIndex - 1];
    if (previousStep) setStep(previousStep);
  };

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNetworkError(null);
    if (!email.trim()) {
      toast.error("נא להזין אימייל");
      return;
    }

    setLoading(true);
    try {
      const { error } = await requestOtp(email.trim(), "register");
      if (error) {
        if (error.message.includes("Request failed") || error.message.includes("לא מגיב")) {
          setNetworkError(error.message);
        } else {
          toast.error("שגיאה בשליחת הקוד", { description: error.message });
        }
        return;
      }
      toast.success("שלחנו קוד למייל שלך");
      setStep("otp");
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
      const { emailToken: token, error } = await verifyRegisterOtp(email.trim(), code.trim());
      if (error || !token) {
        toast.error("שגיאה באימות הקוד", { description: error?.message });
        return;
      }
      setEmailToken(token);
      // With the side already chosen on the way in, jump past the role step.
      setStep(presetRole ? "domain" : "role");
    } catch {
      setNetworkError("שגיאה בתקשורת עם השרת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await requestOtp(email.trim(), "register");
      if (error) {
        toast.error("שליחת הקוד נכשלה", { description: error.message });
        return;
      }
      toast.success("קוד חדש נשלח למייל שלך");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNetworkError(null);

    if (!name.trim() || cities.length === 0 || !role || !workplaceDomain || positions.length === 0 || !emailToken) {
      toast.error("נא להשלים את כל השדות הנדרשים");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp({
        email: email.trim(),
        role,
        name: name.trim(),
        positions,
        required_position: role === "CLINIC" ? positions[0] : undefined,
        workplace_types: [workplaceDomain],
        industry: industry || undefined,
        locations: cities,
      }, emailToken);

      if (error) {
        if (error.message.includes("Request failed") || error.message.includes("לא מגיב")) {
          setNetworkError(error.message);
        } else {
          toast.error("שגיאה בהרשמה", { description: error.message });
        }
        return;
      }

      toast.success("נרשמת בהצלחה");
      navigate("/profile", { state: { isNew: true } });
    } catch {
      setNetworkError("שגיאה בתקשורת עם השרת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/30 to-background px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={64} className="mb-3 h-16 w-16 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold">ShiftMatch</h1>
          <p className="mt-2 text-sm text-muted-foreground">הרשמה קצרה ויוצאים להתחיל התאמות</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">הרשמה</CardTitle>
            <CardDescription>
              {step === "email" && "נתחיל עם כתובת האימייל שלך"}
              {step === "otp" && `הזינו את הקוד שנשלח ל-${email.trim()}`}
              {step !== "email" && step !== "otp" && "כמה שלבים קצרים לפתיחת פרופיל"}
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
                  <Input id="email" type="email" value={email} dir="ltr" onChange={(event) => setEmail(event.target.value)} autoFocus />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "שלח קוד אימות"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  כבר יש חשבון? <Link to="/login" className="font-medium text-primary hover:underline">להתחברות</Link>
                </p>
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "אימות והמשך"}
                </Button>
                <div className="flex w-full justify-between text-sm">
                  <button type="button" className="text-muted-foreground hover:underline" onClick={() => { setStep("email"); setCode(""); }}>
                    שינוי אימייל
                  </button>
                  <button type="button" className="font-medium text-primary hover:underline disabled:opacity-50" onClick={handleResend} disabled={resending}>
                    {resending ? "שולח..." : "שלח קוד חדש"}
                  </button>
                </div>
              </CardFooter>
            </form>
          )}

          {step !== "email" && step !== "otp" && (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="mb-2 flex justify-center gap-2">
                  {stepOrder.slice(2).map((item, index) => (
                    <div key={item} className={cn("h-2 w-2 rounded-full", index <= currentStepIndex - 2 ? "bg-primary" : "bg-muted")} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {step === "role" && (
                    <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-3">
                      <Button type="button" variant={role === "CLINIC" ? "default" : "outline"} className="h-auto flex-col gap-2 py-6" onClick={() => { setRole("CLINIC"); goToNextStep(); }}>
                        <Building2 className="h-8 w-8" />
                        בית עסק
                      </Button>
                      <Button type="button" variant={role === "STAFF" ? "default" : "outline"} className="h-auto flex-col gap-2 py-6" onClick={() => { setRole("STAFF"); goToNextStep(); }}>
                        <UserRound className="h-8 w-8" />
                        עובד/ת
                      </Button>
                    </motion.div>
                  )}

                  {step === "domain" && (
                    <motion.div key="domain" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <DomainSelector value={workplaceDomain} onChange={(domain, nextIndustry) => { setWorkplaceDomain(domain); setIndustry(nextIndustry); setPositions([]); goToNextStep(); }} />
                    </motion.div>
                  )}

                  {step === "positions" && workplaceDomain && (
                    <motion.div key="positions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <RoleMultiSelector domain={workplaceDomain} selectedRoles={positions} onChange={setPositions} />
                      <Button type="button" className="w-full" disabled={positions.length === 0} onClick={goToNextStep}>
                        המשך
                        <ArrowLeft className="mr-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}

                  {step === "details" && (
                    <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div className="flex flex-wrap justify-center gap-2">
                        {positions.map((position) => <span key={position} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{position}</span>)}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">שם מלא / שם בית העסק</Label>
                        <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>עיר / אזור</Label>
                        <p className="text-xs text-muted-foreground">אפשר לבחור כמה אזורים שנוחים לך</p>
                        <CityMultiCombobox value={cities} onChange={setCities} placeholder="הוסף עיר" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <div className="flex w-full gap-2">
                  {canGoBack && (
                    <Button type="button" variant="outline" onClick={goToPreviousStep} className="flex-1">
                      <ArrowRight className="ml-2 h-4 w-4" />
                      חזרה
                    </Button>
                  )}
                  {isLastStep && (
                    <Button type="submit" className={cn("flex-1", !canGoBack && "w-full")} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "סיום"}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
