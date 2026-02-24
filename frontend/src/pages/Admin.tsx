import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TopHeader } from "@/components/layout/TopHeader";
import { getAdminStats, getAdminUsers, toggleUserBlock } from "@/lib/adminApi";
import { AdminStats, AdminUser } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Building2,
  UserRound,
  Heart,
  Search,
  ShieldOff,
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Admin() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!authLoading && currentUser) {
      // Check if user has is_admin flag (you may need to add this to CurrentUser type)
      const isAdmin = (currentUser as any).is_admin === true || (currentUser as any).isAdmin === true;
      if (!isAdmin) {
        toast.error("אין לך הרשאות גישה לעמוד זה");
        navigate("/swipe");
      }
    }
  }, [currentUser, authLoading, navigate]);

  // Fetch data
  const fetchData = async () => {
    if (!currentUser?.profileId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(currentUser.profileId),
        getAdminUsers(currentUser.profileId),
      ]);
      
      setStats(statsData);
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.profileId) {
      fetchData();
    }
  }, [currentUser?.profileId]);

  // Filter users by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.position?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  // Handle block/unblock
  const handleToggleBlock = async (user: AdminUser) => {
    if (!currentUser?.profileId) return;
    
    setBlockingUserId(user.id);
    
    try {
      await toggleUserBlock({
        adminId: currentUser.profileId,
        userIdToBlock: user.id,
        blockStatus: !user.isBlocked,
      });
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isBlocked: !u.isBlocked } : u
        )
      );
      
      toast.success(
        user.isBlocked ? `${user.name} שוחרר/ה מחסימה` : `${user.name} נחסם/ה`
      );
    } catch (err) {
      toast.error("שגיאה בעדכון סטטוס המשתמש");
    } finally {
      setBlockingUserId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">טוען פאנל ניהול...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">שגיאה בטעינת הנתונים</h2>
            <p className="text-muted-foreground max-w-sm">{error}</p>
            <Button onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              נסה שוב
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />
      
      <main className="p-4 max-w-4xl mx-auto pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">פאנל ניהול</h1>
              <p className="text-sm text-muted-foreground">ניהול משתמשים וסטטיסטיקות</p>
            </div>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    סה"כ משתמשים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    מרפאות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats.totalClinics}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <UserRound className="w-4 h-4" />
                    עובדים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats.totalWorkers}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    התאמות פעילות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">{stats.activeMatches}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Management */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                ניהול משתמשים
              </CardTitle>
              <div className="relative mt-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם, אימייל או תפקיד..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם</TableHead>
                      <TableHead>אימייל</TableHead>
                      <TableHead>תפקיד</TableHead>
                      <TableHead>מקצוע</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          לא נמצאו משתמשים
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className={cn(
                            user.isBlocked && "bg-destructive/5"
                          )}
                        >
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "clinic" ? "default" : "secondary"}>
                              {user.role === "clinic" ? "מרפאה" : "עובד/ת"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.position || "—"}
                          </TableCell>
                          <TableCell>
                            {user.isBlocked ? (
                              <Badge variant="destructive">חסום</Badge>
                            ) : (
                              <Badge variant="outline" className="text-success border-success">
                                פעיל
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={user.isBlocked ? "outline" : "destructive"}
                              size="sm"
                              onClick={() => handleToggleBlock(user)}
                              disabled={blockingUserId === user.id}
                              className="gap-1"
                            >
                              {blockingUserId === user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : user.isBlocked ? (
                                <>
                                  <Shield className="w-3 h-3" />
                                  שחרר
                                </>
                              ) : (
                                <>
                                  <ShieldOff className="w-3 h-3" />
                                  חסום
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
