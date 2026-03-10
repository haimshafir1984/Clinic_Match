import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Building2, Heart, Loader2, RefreshCw, Search, Shield, ShieldOff, UserRound, Users } from "lucide-react";
import { TopHeader } from "@/components/layout/TopHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminStats, getAdminUsers, toggleUserBlock } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import { AdminStats, AdminUser } from "@/types/admin";
import { toast } from "sonner";

export default function Admin() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && currentUser && !currentUser.isAdmin) {
      toast.error("אין לך הרשאות גישה לעמוד זה");
      navigate("/swipe", { replace: true });
    }
  }, [authLoading, currentUser, navigate]);

  const fetchData = useCallback(async () => {
    if (!currentUser?.profileId || !currentUser.isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(currentUser.profileId),
        getAdminUsers(currentUser.profileId),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.isAdmin, currentUser?.profileId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || user.position?.toLowerCase().includes(query));
  }, [searchQuery, users]);

  const handleToggleBlock = async (user: AdminUser) => {
    if (!currentUser?.profileId) return;
    setBlockingUserId(user.id);
    try {
      await toggleUserBlock({ adminId: currentUser.profileId, userIdToBlock: user.id, blockStatus: !user.isBlocked });
      setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, isBlocked: !item.isBlocked } : item));
      toast.success(user.isBlocked ? `${user.name} שוחרר/ה` : `${user.name} נחסם/ה`);
    } catch {
      toast.error("שגיאה בעדכון סטטוס המשתמש");
    } finally {
      setBlockingUserId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <div className="flex h-[80vh] items-center justify-center px-4">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">שגיאה בטעינת הנתונים</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => void fetchData()} className="gap-2"><RefreshCw className="h-4 w-4" />נסה שוב</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />
      <main className="mx-auto max-w-4xl space-y-6 p-4 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">פאנל ניהול</h1>
              <p className="text-sm text-muted-foreground">ניהול משתמשים וסטטיסטיקות</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => void fetchData()}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Users className="h-4 w-4" />משתמשים</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalUsers}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Building2 className="h-4 w-4" />בתי עסק</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{stats.totalClinics}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><UserRound className="h-4 w-4" />עובדים</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{stats.totalWorkers}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Heart className="h-4 w-4" />התאמות</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-success">{stats.activeMatches}</p></CardContent></Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />משתמשים</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="חיפוש לפי שם, אימייל או תפקיד" className="pr-10" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם</TableHead>
                      <TableHead>אימייל</TableHead>
                      <TableHead>סוג</TableHead>
                      <TableHead>תפקיד</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">לא נמצאו משתמשים</TableCell></TableRow>
                    ) : filteredUsers.map((user) => (
                      <TableRow key={user.id} className={cn(user.isBlocked && "bg-destructive/5")}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell><Badge variant={user.role === "clinic" ? "default" : "secondary"}>{user.role === "clinic" ? "בית עסק" : "עובד/ת"}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{user.position || "-"}</TableCell>
                        <TableCell>{user.isBlocked ? <Badge variant="destructive">חסום</Badge> : <Badge variant="outline" className="border-success text-success">פעיל</Badge>}</TableCell>
                        <TableCell>
                          <Button variant={user.isBlocked ? "outline" : "destructive"} size="sm" className="gap-1" disabled={blockingUserId === user.id} onClick={() => void handleToggleBlock(user)}>
                            {blockingUserId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : user.isBlocked ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                            {user.isBlocked ? "שחרר" : "חסום"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
