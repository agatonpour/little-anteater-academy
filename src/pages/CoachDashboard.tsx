import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, User, CheckCircle, XCircle, Plus, Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { User as AuthUser, Session as AuthSession } from "@supabase/supabase-js";

interface CoachProfile {
  id: string;
  name: string;
  position: string;
  bio: string;
  strengths: string;
  image_url: string;
  user_id: string;
}

interface SessionData {
  id: string;
  session_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  user_id: string;
  profiles: {
    name: string;
    position: string;
  } | null;
}

interface AvailabilitySlot {
  id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const CoachDashboard = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isAddingAvailability, setIsAddingAvailability] = useState(false);
  const [newSlot, setNewSlot] = useState({ day_of_week: "", start_time: "", end_time: "" });
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchCoachData(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchCoachData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCoachData = async (userId: string) => {
    try {
      // Check if user has coach role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (profileError || profile?.role !== 'coach') {
        toast.error("Access denied. This page is for coaches only.");
        navigate('/dashboard');
        return;
      }

      // Fetch coach profile
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (coachError) throw coachError;
      setCoachProfile(coachData);

      // Fetch coach sessions with user profiles
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          status,
          notes,
          user_id
        `)
        .eq('coach_id', coachData.id)
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch profiles for each session separately
      const sessionsWithProfiles = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name, position')
            .eq('user_id', session.user_id)
            .single();

          return {
            ...session,
            profiles: profileError ? null : profile
          };
        })
      );

      setSessions(sessionsWithProfiles as SessionData[]);

      // Fetch availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', coachData.id)
        .order('day_of_week');

      if (availabilityError) throw availabilityError;
      setAvailability(availabilityData || []);

    } catch (error) {
      console.error('Error fetching coach data:', error);
      toast.error('Failed to load coach data');
    }
  };

  const handleSessionAction = async (sessionId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, status } : session
      ));

      toast.success(`Session ${status === 'confirmed' ? 'confirmed' : 'cancelled'} successfully`);
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const addAvailabilitySlot = async () => {
    if (!newSlot.day_of_week || !newSlot.start_time || !newSlot.end_time || !coachProfile) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from('coach_availability')
        .insert({
          coach_id: coachProfile.id,
          day_of_week: newSlot.day_of_week,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          is_available: true
        });

      if (error) throw error;

      toast.success("Availability added successfully");
      setNewSlot({ day_of_week: "", start_time: "", end_time: "" });
      setIsAddingAvailability(false);
      
      if (user) fetchCoachData(user.id);
    } catch (error) {
      console.error('Error adding availability:', error);
      toast.error('Failed to add availability');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (!user || !coachProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading coach dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingSessions = sessions.filter(s => s.status === 'pending');
  const upcomingSessions = sessions.filter(s => s.status === 'confirmed' && new Date(s.session_date) > new Date());
  const pastSessions = sessions.filter(s => s.status === 'completed' || new Date(s.session_date) < new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Coach Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {coachProfile.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold">{pendingSessions.length}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed Sessions</p>
                  <p className="text-2xl font-bold">{upcomingSessions.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Slots</p>
                  <p className="text-2xl font-bold">{availability.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Session Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Session Requests</CardTitle>
              <CardDescription>Review and respond to new booking requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No pending requests</p>
                ) : (
                  pendingSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{session.profiles?.name || 'Unknown Player'}</p>
                          <p className="text-sm text-muted-foreground">{session.profiles?.position || 'Unknown Position'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(session.session_date), 'EEEE, MMMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      {session.notes && (
                        <p className="text-sm bg-muted p-2 rounded">
                          <strong>Notes:</strong> {session.notes}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSessionAction(session.id, 'confirmed')}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSessionAction(session.id, 'cancelled')}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Availability Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Availability</CardTitle>
                  <CardDescription>Manage your available time slots</CardDescription>
                </div>
                <Dialog open={isAddingAvailability} onOpenChange={setIsAddingAvailability}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Slot
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Availability Slot</DialogTitle>
                      <DialogDescription>
                        Add a new time slot when you're available for coaching
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Day of Week</Label>
                        <Select value={newSlot.day_of_week} onValueChange={(value) => setNewSlot(prev => ({ ...prev, day_of_week: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monday">Monday</SelectItem>
                            <SelectItem value="Tuesday">Tuesday</SelectItem>
                            <SelectItem value="Wednesday">Wednesday</SelectItem>
                            <SelectItem value="Thursday">Thursday</SelectItem>
                            <SelectItem value="Friday">Friday</SelectItem>
                            <SelectItem value="Saturday">Saturday</SelectItem>
                            <SelectItem value="Sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={newSlot.start_time}
                            onChange={(e) => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={newSlot.end_time}
                            onChange={(e) => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                          />
                        </div>
                      </div>
                      <Button onClick={addAvailabilitySlot} className="w-full">
                        Add Availability
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availability.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No availability set</p>
                ) : (
                  availability.map((slot) => (
                    <div key={slot.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{slot.day_of_week}</span>
                        <span className="text-muted-foreground ml-2">
                          {slot.start_time} - {slot.end_time}
                        </span>
                      </div>
                      <Badge variant={slot.is_available ? "default" : "secondary"}>
                        {slot.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confirmed Sessions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Upcoming Confirmed Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No upcoming sessions</p>
              ) : (
                upcomingSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{session.profiles?.name || 'Unknown Player'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.session_date), 'EEEE, MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Badge>Confirmed</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CoachDashboard;