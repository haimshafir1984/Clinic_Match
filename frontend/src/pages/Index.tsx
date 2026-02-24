import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Heart, X, MapPin, Briefcase, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// הגדרת טיפוס למשתמש (כדי שנדע איזה שדות יש)
interface Profile {
  id: string;
  name: string;
  position: string;
  location: string;
  salary_info: number | string;
  availability: any;
  created_at?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // מצבים (States)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 1. בדיקת התחברות בטעינת הדף
  useEffect(() => {
    // מנסים לשלוף את המשתמש מה-LocalStorage
    const storedUser = localStorage.getItem("user");
    
    if (!storedUser) {
      // אם אין משתמש - מעיפים אותו לדף התחברות
      navigate("/auth");
    } else {
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
      fetchFeed(parsedUser.id);
    }
  }, [navigate]);

  // 2. פונקציה לשליפת הפיד מהשרת שלך
  const fetchFeed = async (userId: string) => {
    try {
      // שים לב: זה הנתיב לשרת שלך ב-Render. וודא שזה ה-URL הנכון!
      // אם אתה עובד לוקאלית לפעמים זה http://localhost:10000
      const response = await fetch(`https://clinicmatch.onrender.com/api/feed/${userId}`);
      
      if (!response.ok) throw new Error("Failed to fetch feed");
      
      const data = await response.json();
      setProfiles(data);
    } catch (error) {
      console.error("Feed Error:", error);
      toast({
        title: "שגיאה בטעינת פרופילים",
        description: "לא הצלחנו לטעון את המועמדים. נסה לרענן.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. לוגיקת ה-Swipe (לייק או דלג)
  const handleSwipe = async (direction: "LIKE" | "PASS") => {
    if (profiles.length === 0 || !currentUser) return;

    const currentProfile = profiles[0]; // לוקחים את הכרטיס העליון
    
    // מעדכנים את המסך מיד (אופטימי)
    const newProfiles = profiles.slice(1);
    setProfiles(newProfiles);

    try {
      const response = await fetch(`https://clinicmatch.onrender.com/api/swipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swiper_id: currentUser.id,
          swiped_id: currentProfile.id,
          type: direction,
        }),
      });

      const data = await response.json();

      // בדיקת התאמה (Match)
      if (data.isMatch) {
        // כאן נקפיץ את המודל המקצועי שביקשת
        toast({
          title: "🎉 יש התאמה!",
          description: `יש לך התאמה חדשה עם ${currentProfile.name}.`,
          action: <Button onClick={() => navigate("/matches")}>לצ'אט</Button>,
        });
      }

    } catch (error) {
      console.error("Swipe Error:", error);
    }
  };

  // 4. התנתקות (Logout)
  const handleLogout = () => {
    localStorage.removeItem("user"); // מחיקת המשתמש מהזיכרון
    navigate("/auth"); // מעבר לדף התחברות
  };

  // בדיקה אם פרופיל הוא "חדש" (פחות מ-3 ימים)
  const isNewProfile = (createdAt?: string) => {
    if (!createdAt) return false;
    const date = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 3;
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">טוען פרופילים...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">ClinicMatch</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/matches")}>
            ההתאמות שלי
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="התנתק">
            <LogOut className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {profiles.length > 0 ? (
          <div className="w-full max-w-sm relative">
            {/* הכרטיס הראשי */}
            <Card className="h-[500px] w-full shadow-xl relative overflow-hidden flex flex-col">
              {/* תמונת רקע / אזור עליון */}
              <div className="h-1/3 bg-gradient-to-b from-blue-100 to-white flex items-center justify-center">
                <div className="text-6xl">🧑‍⚕️</div>
              </div>
              
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{profiles[0].name}</CardTitle>
                    <CardDescription className="text-lg text-blue-600 font-medium">
                      {profiles[0].position}
                    </CardDescription>
                  </div>
                  {isNewProfile(profiles[0].created_at) && (
                    <Badge className="bg-blue-500">חדש ✨</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{profiles[0].location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>{profiles[0].salary_info} ₪ לשעה/חודש</span>
                </div>
                
                {/* הצגת זמינות (טיפול באובייקט JSON) */}
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <Briefcase className="h-4 w-4" />
                    <span>זמינות:</span>
                  </div>
                  <p>
                    {typeof profiles[0].availability === 'string' 
                      ? profiles[0].availability 
                      : JSON.stringify(profiles[0].availability).slice(0, 50) + "..."}
                  </p>
                </div>
              </CardContent>

              {/* כפתורי פעולה */}
              <div className="p-6 flex justify-center gap-6 mt-auto">
                <Button 
                  size="lg" 
                  className="rounded-full h-14 w-14 bg-white border-2 border-red-500 hover:bg-red-50"
                  onClick={() => handleSwipe("PASS")}
                >
                  <X className="h-8 w-8 text-red-500" />
                </Button>
                
                <Button 
                  size="lg" 
                  className="rounded-full h-14 w-14 bg-gradient-to-r from-green-400 to-green-600 hover:opacity-90 shadow-lg"
                  onClick={() => handleSwipe("LIKE")}
                >
                  <Heart className="h-8 w-8 text-white fill-current" />
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* מצב ריק - אין פרופילים */
          <div className="text-center space-y-4">
            <div className="text-6xl animate-bounce">🌍</div>
            <h2 className="text-2xl font-bold text-gray-700">אין פרופילים נוספים כרגע</h2>
            <p className="text-gray-500">בדקנו בכל {currentUser?.location || "האזור"}, נסה שוב מאוחר יותר.</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              רענן חיפוש
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
