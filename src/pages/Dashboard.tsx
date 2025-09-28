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

  // Helper function to parse time slot string to exact date
  const parseTimeSlotToDate = (timeSlot: string) => {
    // Format: "Tuesday October 7 5:00 PM" or "Tuesday 5:00 PM"
    const timeMatch = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) return null;
    
    const [, hoursStr, minutesStr, period] = timeMatch;
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    
    // Check if it contains a specific date (like "October 7")
    const monthDateMatch = timeSlot.match(/(\w+)\s+(\d+)/);
    if (monthDateMatch) {
      const [, monthName, dayNum] = monthDateMatch;
      const currentYear = new Date().getFullYear();
      
      // Create date from month name and day
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
      
      if (monthIndex !== -1) {
        const targetDate = new Date(currentYear, monthIndex, parseInt(dayNum));
        targetDate.setHours(hours, minutes, 0, 0);
        return targetDate;
      }
    }
    
    // Fallback to next weekday logic for slots without specific dates
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetWeekday = weekdays.findIndex(day => timeSlot.toLowerCase().includes(day.toLowerCase()));
    
    if (targetWeekday === -1) return null;
    
    const today = new Date();
    const currentWeekday = today.getDay();
    
    // Calculate days until next occurrence
    let daysUntil = targetWeekday - currentWeekday;
    if (daysUntil <= 0) daysUntil += 7; // Get next week's occurrence
    
    const targetDate = addDays(today, daysUntil);
    targetDate.setHours(hours, minutes, 0, 0);
    
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
            is_available,
            specific_date
          )
        `)
        .not('user_id', 'is', null) // Only get coaches linked to users
        .order('name');

      if (coachesError) throw coachesError;

      // Transform the data to match expected format with available_times array
      const transformedCoaches = (coachesData || []).map(coach => ({
        ...coach,
        available_times: coach.coach_availability
          ?.filter(slot => {
            // Filter available slots and exclude past dates
            if (!slot.is_available) return false;
            if (slot.specific_date) {
              const today = new Date();
              today.setHours(0,0,0,0);
              return new Date(slot.specific_date) >= today;
            }
            return true;
          })
          .sort((a, b) => {
            // Sort by specific_date first, then by day_of_week
            if (a.specific_date && b.specific_date) {
              return new Date(a.specific_date).getTime() - new Date(b.specific_date).getTime();
            }
            return 0;
          })
          .map(slot => {
            // Format time slots with dates
            const startTime = new Date(`2000-01-01T${slot.start_time}`);
            const formattedTime = startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            if (slot.specific_date) {
              // Use format from date-fns to avoid timezone issues
              const date = new Date(slot.specific_date + 'T00:00:00');
              const dayName = format(date, 'EEEE');
              const dateStr = format(date, 'MMMM d');
              return `${dayName} ${dateStr} ${formattedTime}`;
            }
            
            return `${slot.day_of_week} ${formattedTime}`;
          }) || []
      }));

      setCoaches(transformedCoaches);
    } catch (error) {
      console.error('Error loading coaches:', error);
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
          coaches (
            name, 
            position,
            bio,
            strengths,
            user_id
          )
        `)
        .eq('user_id', currentUser.id)
        .order('session_date');
      
      if (error) throw error;

      // Get coach emails and additional profile info separately since there's no direct FK relationship
      const sessions_with_profiles = [];
      for (const session of (data || [])) {
        if (session.coaches?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, age')
            .eq('user_id', session.coaches.user_id)
            .maybeSingle();
          
          sessions_with_profiles.push({
            ...session,
            coaches: {
              ...session.coaches,
              email: profile?.email || null,
              age: profile?.age || null
            }
          });
        } else {
          sessions_with_profiles.push(session);
        }
      }

      setSessions(sessions_with_profiles);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const bookSession = async (coachId: string, timeSlot: string) => {
    try {
      // Clean and parse the time slot (e.g., "Tuesday October 7 5:00 PM")
      const timeString = timeSlot.trim();
      console.log('Parsing time slot:', timeString);
      
      // Parse the date and time from the formatted string
      const sessionDate = parseTimeSlotToDate(timeString);
      
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
        const newSpecificDate = format(sessionDate, 'yyyy-MM-dd');
        const newDbTimeFormat = `${newSessionTime}:00`;

        // Find and update the correct availability slot
        const { data: matchingSlots } = await supabase
          .from('coach_availability')
          .select('*')
          .eq('coach_id', coachId)
          .eq('day_of_week', newDayOfWeek)
          .eq('start_time', newDbTimeFormat);

        // Prioritize specific_date match, fallback to recurring slot
        const slotsWithSpecificDate = matchingSlots?.filter(slot => slot.specific_date === newSpecificDate);
        const slotsWithoutSpecificDate = matchingSlots?.filter(slot => !slot.specific_date);

        if (slotsWithSpecificDate && slotsWithSpecificDate.length > 0) {
          await supabase
            .from('coach_availability')
            .update({ is_available: false })
            .eq('id', slotsWithSpecificDate[0].id);
        } else if (slotsWithoutSpecificDate && slotsWithoutSpecificDate.length > 0) {
          await supabase
            .from('coach_availability')
            .update({ is_available: false })
            .eq('id', slotsWithoutSpecificDate[0].id);
        }

        
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
        const specificDate = format(sessionDate, 'yyyy-MM-dd');
        const dbTimeFormat = `${sessionTime}:00`;

        // Find and update the correct availability slot
        const { data: matchingSlots } = await supabase
          .from('coach_availability')
          .select('*')
          .eq('coach_id', coachId)
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', dbTimeFormat);

        // Prioritize specific_date match, fallback to recurring slot
        const slotsWithSpecificDate = matchingSlots?.filter(slot => slot.specific_date === specificDate);
        const slotsWithoutSpecificDate = matchingSlots?.filter(slot => !slot.specific_date);

        if (slotsWithSpecificDate && slotsWithSpecificDate.length > 0) {
          await supabase
            .from('coach_availability')
            .update({ is_available: false })
            .eq('id', slotsWithSpecificDate[0].id);
        } else if (slotsWithoutSpecificDate && slotsWithoutSpecificDate.length > 0) {
          await supabase
            .from('coach_availability')
            .update({ is_available: false })
            .eq('id', slotsWithoutSpecificDate[0].id);
        }

        // Show custom session booking dialog
        const formattedDate = sessionDate ? format(sessionDate, 'EEEE, MMMM d, h:mm a') : timeSlot;
        
        // Use a custom alert dialog instead of toast
        const alertElement = document.createElement('div');
        alertElement.innerHTML = `
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 24px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1000; max-width: 400px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #1e293b;">Session Request Sent!</h3>
            <p style="color: #64748b; margin-bottom: 16px;">Your session request has been sent to <strong>${selectedCoach?.name}</strong> for <strong>${formattedDate}</strong>. Waiting for Coach confirmation.</p>
            <button onclick="this.parentElement.parentElement.remove()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500;">OK</button>
          </div>
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;" onclick="this.parentElement.remove()"></div>
        `;
        document.body.appendChild(alertElement);
      }

      setSelectedCoach(null);
      await loadSessions();
      await loadCoaches(); // Refresh coaches to update availability
    } catch (error: any) {
      console.error('Error:', error);
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
        const specificDate = format(sessionDate, 'yyyy-MM-dd');

        await supabase
          .from('coach_availability')
          .update({ is_available: true })
          .eq('coach_id', session.coach_id)
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', sessionTime)
          .eq('specific_date', specificDate);

        setReschedulingSession(session);
        setSelectedCoach(coach);
        await loadCoaches(); // Refresh coaches to show restored availability
      }
    }
  };

  const cancelSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // 1. Delete the session
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteError) throw deleteError;

      // 2. Restore the availability slot
      const sessionDate = new Date(session.session_date);
      const dayOfWeek = format(sessionDate, 'EEEE');
      const sessionTime = format(sessionDate, 'HH:mm:ss');
      const specificDate = format(sessionDate, 'yyyy-MM-dd');

      // Find the exact slot that was used for this session and restore it
      const { data: slots, error: findError } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', session.coach_id)
        .eq('day_of_week', dayOfWeek)
        .eq('start_time', sessionTime)
        .eq('is_available', false);

      if (findError) throw findError;

      // Restore the slot (prefer specific date match, fallback to any matching slot)
      const slotToRestore = slots?.find(slot => slot.specific_date === specificDate) || slots?.[0];
      
      if (slotToRestore) {
        const { error: updateError } = await supabase
          .from('coach_availability')
          .update({ is_available: true })
          .eq('id', slotToRestore.id);

        if (updateError) throw updateError;

        toast({
          title: "Session was Cancelled",
          description: "Session slot is now Available for Coach again.",
        });
      } else {
        toast({
          title: "Session Cancelled",
          description: "Your session has been cancelled.",
        });
      }

      await loadSessions();
      await loadCoaches();
    } catch (error: any) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Cancellation failed",
        description: "Please try again.",
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
                      <p className="text-xs text-muted-foreground mb-2">{coach.position ? coach.position.charAt(0).toUpperCase() + coach.position.slice(1) : ""}</p>
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
                        const fullDate = parseTimeSlotToDate(time);
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
                {sessions.filter(s => new Date(s.session_date) > new Date() && s.status !== 'cancelled').length === 0 ? (
                  <p className="text-muted-foreground">No upcoming sessions scheduled.</p>
                ) : (
                  <div className="space-y-3">
                     {sessions
                       .filter(s => new Date(s.session_date) > new Date() && s.status !== 'cancelled')
                       .map((session) => (
                        <div key={session.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                              <p className="font-medium text-lg">{session.coaches?.name}</p>
                              {session.coaches?.position && (
                                <p className="text-sm font-medium text-primary">{session.coaches.position}</p>
                              )}
                              {session.coaches?.age && (
                                <p className="text-sm text-muted-foreground">Age: {session.coaches.age}</p>
                              )}
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
                                variant="destructive" 
                                size="sm"
                                onClick={() => cancelSession(session.id)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                          
                          {(session.coaches?.bio || session.coaches?.strengths) && (
                            <div className="space-y-2 mb-3">
                              {session.coaches?.bio && (
                                <div>
                                  <p className="text-sm font-medium">Bio:</p>
                                  <p className="text-sm text-muted-foreground">{session.coaches.bio}</p>
                                </div>
                              )}
                              {session.coaches?.strengths && (
                                <div>
                                  <p className="text-sm font-medium">Strengths:</p>
                                  <p className="text-sm text-muted-foreground">{session.coaches.strengths}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-sm text-muted-foreground border-t pt-2">
                            Need to reschedule? Contact coach at <strong>{session.coaches?.email || 'Contact through admin'}</strong>
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
                          {/* Remove status badge from past sessions */}
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
                  <div><strong>Email:</strong> {profile?.email || user?.email}</div>
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