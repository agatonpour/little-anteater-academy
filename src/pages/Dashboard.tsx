import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase, signOut, getCurrentUser, getUserProfile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
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
  const [reschedulingSession, setReschedulingSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const coachImages: { [key: string]: string } = {
    'Coach Sarah Martinez': coachSarah,
    'Coach Mike Rodriguez': coachMike,
    'Coach Emma Thompson': coachEmma,
    'Coach David Park': coachDavid,
  };

  // Helper function to get next occurrence of a weekday
  const getNextWeekdayDate = (weekdayName: string, timeString: string) => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetWeekday = weekdays.findIndex(day => weekdayName.toLowerCase().includes(day.toLowerCase()));
    
    if (targetWeekday === -1) return null;
    
    const today = new Date();
    const currentWeekday = today.getDay();
    
    // Calculate days until next occurrence
    let daysUntil = targetWeekday - currentWeekday;
    if (daysUntil <= 0) daysUntil += 7; // Get next week's occurrence
    
    const targetDate = addDays(today, daysUntil);
    
    // Parse time
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      const [, hoursStr, minutesStr, period] = timeMatch;
      let hours = parseInt(hoursStr);
      const minutes = parseInt(minutesStr);
      
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      targetDate.setHours(hours, minutes, 0, 0);
    }
    
    return targetDate;
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
      // Get coaches with their availability
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select(`
          id,
          name,
          position,
          bio,
          image_url,
          strengths,
          coach_availability (
            day_of_week,
            start_time,
            end_time,
            is_available
          )
        `)
        .not('user_id', 'is', null) // Only get coaches linked to users
        .order('name');

      if (coachesError) throw coachesError;

      // Transform the data to match expected format with available_times array
      const transformedCoaches = (coachesData || []).map(coach => ({
        ...coach,
        available_times: coach.coach_availability
          ?.filter(slot => slot.is_available)
          .map(slot => {
            // Format time slots as "Day HH:MM AM/PM"
            const startTime = new Date(`2000-01-01T${slot.start_time}`);
            const formattedTime = startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            return `${slot.day_of_week} ${formattedTime}`;
          }) || []
      }));

      setCoaches(transformedCoaches);
    } catch (error) {
      console.error('Error loading coaches:', error);
      toast({
        title: "Error",
        description: "Failed to load coaches",
        variant: "destructive"
      });
    }
  };

  const loadSessions = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          coaches (name, position)
        `)
        .eq('user_id', currentUser.id)
        .order('session_date');
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const bookSession = async (coachId: string, timeSlot: string) => {
    try {
      // Clean and parse the time slot (e.g., "Tuesday 5:00 PM" or "5:00 PM")
      const timeString = timeSlot.trim();
      console.log('Parsing time slot:', timeString);
      
      // Use the helper function to get the proper date
      const sessionDate = getNextWeekdayDate(timeString, timeString);
      
      if (!sessionDate) {
        throw new Error(`Invalid time format: ${timeString}`);
      }
      
      if (reschedulingSession) {
        // Update existing session
        const { error } = await supabase
          .from('sessions')
          .update({ session_date: sessionDate.toISOString() })
          .eq('id', reschedulingSession.id);

        if (error) throw error;

        // Mark new slot as unavailable
        const newDayOfWeek = format(sessionDate, 'EEEE');
        const newSessionTime = format(sessionDate, 'HH:mm');

        await supabase
          .from('coach_availability')
          .update({ is_available: false })
          .eq('coach_id', coachId)
          .eq('day_of_week', newDayOfWeek)
          .eq('start_time', newSessionTime);

        toast({
          title: "Session rescheduled!",
          description: `Your training session with ${selectedCoach?.name} has been rescheduled to ${timeSlot}.`,
        });
        
        setReschedulingSession(null);
      } else {
        // Create new session
        const currentUser = await getCurrentUser();
        if (!currentUser) return;

        const { error } = await supabase
          .from('sessions')
          .insert({
            user_id: currentUser.id,
            coach_id: coachId,
            session_date: sessionDate.toISOString(),
            status: 'pending'
          });

        if (error) throw error;

        // Mark slot as unavailable
        const dayOfWeek = format(sessionDate, 'EEEE');
        const sessionTime = format(sessionDate, 'HH:mm');

        await supabase
          .from('coach_availability')
          .update({ is_available: false })
          .eq('coach_id', coachId)
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', sessionTime);

        toast({
          title: "Session booked!",
          description: `Your training session with ${selectedCoach?.name} has been confirmed for ${timeSlot}.`,
        });
      }

      setSelectedCoach(null);
      await loadSessions();
      await loadCoaches(); // Refresh coaches to update availability
    } catch (error: any) {
      toast({
        title: reschedulingSession ? "Reschedule failed" : "Booking failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const rescheduleSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const coach = coaches.find(c => c.id === session.coach_id);
      if (coach) {
        // Restore availability for the old slot
        const sessionDate = new Date(session.session_date);
        const dayOfWeek = format(sessionDate, 'EEEE');
        const sessionTime = format(sessionDate, 'HH:mm');

        await supabase
          .from('coach_availability')
          .update({ is_available: true })
          .eq('coach_id', session.coach_id)
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', sessionTime);

        setReschedulingSession(session);
        setSelectedCoach(coach);
        await loadCoaches(); // Refresh coaches to show restored availability
      }
    }
  };

  const cancelSession = async (sessionId: string) => {
    try {
      // Get session details first to restore availability
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Update session status to cancelled instead of deleting
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) throw error;

      // Restore the availability slot
      const sessionDate = new Date(session.session_date);
      const dayOfWeek = format(sessionDate, 'EEEE');
      const sessionTime = format(sessionDate, 'HH:mm');

      const { error: availabilityError } = await supabase
        .from('coach_availability')
        .update({ is_available: true })
        .eq('coach_id', session.coach_id)
        .eq('day_of_week', dayOfWeek)
        .eq('start_time', sessionTime);

      if (availabilityError) {
        console.error('Error restoring availability:', availabilityError);
      }

      toast({
        title: "Session cancelled",
        description: "Your session has been successfully cancelled.",
      });

      await loadSessions();
      await loadCoaches(); // Refresh coaches to show restored availability
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
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
                        src={coach.image_url || coachSarah}
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
                    <CardDescription>
                      {reschedulingSession ? 'Select a new time slot' : 'Select an available time slot'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {selectedCoach.available_times?.map((time: string, index: number) => {
                        const fullDate = getNextWeekdayDate(time, time);
                        const displayText = fullDate 
                          ? format(fullDate, "EEEE, MMMM d, h:mm a")
                          : time;
                        
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => bookSession(selectedCoach.id, time)}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {displayText}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedCoach(null);
                        setReschedulingSession(null);
                      }}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sessions and Profile Section */}
          <div className="space-y-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
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
                              {format(new Date(session.session_date), "EEEE, MMMM d, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(session.session_date), "h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{session.status}</Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => rescheduleSession(session.id)}
                            >
                              Reschedule
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => cancelSession(session.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Clock className="h-5 w-5" />
                  Past Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.filter(s => new Date(s.session_date) <= new Date()).length === 0 ? (
                  <p className="text-muted-foreground">No past sessions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sessions
                      .filter(s => new Date(s.session_date) <= new Date())
                      .map((session) => (
                        <div key={session.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{session.coaches?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(session.session_date), "EEEE, MMMM d, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(session.session_date), "h:mm a")}
                            </p>
                          </div>
                          <Badge variant="outline">{session.status}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
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