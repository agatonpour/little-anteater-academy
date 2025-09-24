import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase, signOut, getCurrentUser, getUserProfile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import coachSarah from "@/assets/coach-sarah.jpg";
import coachMike from "@/assets/coach-mike.jpg";
import coachEmma from "@/assets/coach-emma.jpg";
import coachDavid from "@/assets/coach-david.jpg";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const coachImages: { [key: string]: string } = {
    'Coach Sarah Martinez': coachSarah,
    'Coach Mike Rodriguez': coachMike,
    'Coach Emma Thompson': coachEmma,
    'Coach David Park': coachDavid,
  };

  useEffect(() => {
    loadUserData();
    loadCoaches();
    loadSessions();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      setUser(currentUser);
      const userProfile = await getUserProfile(currentUser.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadCoaches = async () => {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCoaches(data || []);
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  };

  const loadSessions = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          coaches (name, position)
        `)
        .eq('user_id', user.id)
        .order('session_date');
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const bookSession = async (coachId: string, timeSlot: string) => {
    try {
      const sessionDate = new Date();
      // For demo purposes, just add the time slot to today's date
      sessionDate.setHours(17, 0, 0, 0); // Default to 5 PM
      
      const { error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          coach_id: coachId,
          session_date: sessionDate.toISOString(),
          status: 'confirmed'
        });

      if (error) throw error;

      toast({
        title: "Session booked!",
        description: `Your training session with ${selectedCoach?.name} has been confirmed.`,
      });

      setSelectedCoach(null);
      loadSessions();
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-between items-center border-b">
        <h1 className="text-2xl font-bold text-primary">
          Little Anteater Academy
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">Welcome, {profile?.name}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Soccer Coaches Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Soccer Coaches</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {coaches.map((coach) => (
                <Card key={coach.id} className="hover:shadow-[var(--academy-shadow)] transition-[var(--transition-smooth)] cursor-pointer" onClick={() => setSelectedCoach(coach)}>
                  <CardContent className="p-0">
                    <div className="aspect-square overflow-hidden rounded-t-lg">
                      <img
                        src={coachImages[coach.name] || coachSarah}
                        alt={coach.name}
                        className="w-full h-full object-cover hover:scale-105 transition-[var(--transition-smooth)]"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm">{coach.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{coach.position}</p>
                      <Button variant="academy-outline" size="sm" className="w-full text-xs">
                        Book Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Coach Selection Modal */}
            {selectedCoach && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>{selectedCoach.name}</CardTitle>
                    <CardDescription>Select an available time slot</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {selectedCoach.available_times?.map((time: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => bookSession(selectedCoach.id, time)}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {time}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedCoach(null)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* My Page Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6">My Page</h2>
            
            {/* Upcoming Sessions */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.filter(s => new Date(s.session_date) > new Date()).length === 0 ? (
                  <p className="text-muted-foreground">No upcoming sessions scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {sessions
                      .filter(s => new Date(s.session_date) > new Date())
                      .map((session) => (
                        <div key={session.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{session.coaches?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.session_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">{session.status}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {profile?.name}</div>
                  <div><strong>Age:</strong> {profile?.age}</div>
                  <div><strong>Position:</strong> {profile?.position}</div>
                  <div><strong>Team:</strong> {profile?.team || 'Not specified'}</div>
                  <div><strong>Area:</strong> {profile?.area}</div>
                  <div><strong>Goals:</strong> {profile?.goals}</div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;