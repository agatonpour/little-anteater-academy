import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, CheckCircle, XCircle, Plus, Settings, LogOut, Eye, Edit, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
    age?: number;
    gender?: string;
    goals?: string;
    team?: string;
    area?: string;
  } | null;
}

interface PlayerDetails {
  name: string;
  position: string;
  age: number;
  gender: string;
  goals: string;
  team: string;
  area: string;
}

interface AvailabilitySlot {
  id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  specific_date?: string;
}

const CoachDashboard = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isAddingAvailability, setIsAddingAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [newSlot, setNewSlot] = useState({ 
    date: "",
    start_hour: "", 
    start_minute: "", 
    start_period: "AM",
    end_hour: "", 
    end_minute: "", 
    end_period: "AM" 
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState({
    name: "",
    position: "", 
    strengths: "",
    bio: "",
    age: "",
    gender: ""
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetails | null>(null);
  const [isViewingPlayer, setIsViewingPlayer] = useState(false);
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
            .select('name, position, age, gender, goals, team, area')
            .eq('user_id', session.user_id)
            .single();

          return {
            ...session,
            profiles: profileError ? null : profile
          };
        })
      );

      setSessions(sessionsWithProfiles as SessionData[]);

      // Fetch availability - only show available slots ordered by date
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', coachData.id)
        .eq('is_available', true)
        .order('specific_date', { ascending: true });

      if (availabilityError) throw availabilityError;
      setAvailability(availabilityData || []);

    } catch (error) {
      console.error('Error fetching coach data:', error);
      toast.error('Failed to load coach data');
    }
  };

  const handleSessionAction = async (sessionId: string, status: 'confirmed' | 'cancelled') => {
    try {
      // Get session details first to find the corresponding availability slot
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        toast.error('Session not found');
        return;
      }

      const { error } = await supabase
        .from('sessions')
        .update({ status })
        .eq('id', sessionId);

      if (error) throw error;

      // If confirming a session, mark the corresponding availability slot as unavailable
      if (status === 'confirmed' && coachProfile) {
        const sessionDate = new Date(session.session_date);
        const dayOfWeek = format(sessionDate, 'EEEE');
        const sessionTime = format(sessionDate, 'HH:mm');
        const specificDate = format(sessionDate, 'yyyy-MM-dd');

        // Find and update the matching availability slot
        const { error: availabilityError } = await supabase
          .from('coach_availability')
          .update({ is_available: false })
          .eq('coach_id', coachProfile.id)
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', sessionTime)
          .eq('specific_date', specificDate);

        if (availabilityError) {
          console.error('Error updating availability:', availabilityError);
          // Don't throw error here as the session was already confirmed
        }
      }

      // If cancelling a confirmed session, restore the availability slot
      if (status === 'cancelled' && coachProfile) {
        const sessionDate = new Date(session.session_date);
        const dayOfWeek = format(sessionDate, 'EEEE');
        const sessionTime = format(sessionDate, 'HH:mm');
        const specificDate = format(sessionDate, 'yyyy-MM-dd');

        const { error: availabilityError } = await supabase
          .from('coach_availability')
          .update({ is_available: true })
          .eq('coach_id', coachProfile.id)
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', sessionTime)
          .eq('specific_date', specificDate);

        if (availabilityError) {
          console.error('Error restoring availability:', availabilityError);
        }
      }

      setSessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, status } : session
      ));

      // Refresh availability data to show updated slots
      if (user) {
        const { data: availabilityData, error: fetchError } = await supabase
          .from('coach_availability')
          .select('*')
          .eq('coach_id', coachProfile.id)
          .eq('is_available', true)
          .order('specific_date', { ascending: true });

        if (!fetchError) {
          setAvailability(availabilityData || []);
        }
      }

      toast.success(`Session ${status === 'confirmed' ? 'confirmed' : 'cancelled'} successfully`);
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const convertTo24Hour = (hour: string, minute: string, period: string) => {
    const h = parseInt(hour);
    const m = minute.padStart(2, '0');
    
    if (period === "AM") {
      if (h === 12) return `00:${m}`;
      return `${h.toString().padStart(2, '0')}:${m}`;
    } else {
      if (h === 12) return `12:${m}`;
      return `${(h + 12).toString().padStart(2, '0')}:${m}`;
    }
  };

  const addAvailabilitySlot = async () => {
    if (!selectedDate || !newSlot.start_hour || !newSlot.start_minute || 
        !newSlot.end_hour || !newSlot.end_minute || !coachProfile) {
      toast.error("Please fill in all fields");
      return;
    }

    const startTime = convertTo24Hour(newSlot.start_hour, newSlot.start_minute, newSlot.start_period);
    const endTime = convertTo24Hour(newSlot.end_hour, newSlot.end_minute, newSlot.end_period);
    const dayOfWeek = format(selectedDate, 'EEEE');

    try {
      const { error } = await supabase
        .from('coach_availability')
        .insert({
          coach_id: coachProfile.id,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          specific_date: format(selectedDate, 'yyyy-MM-dd'),
          is_available: true
        });

      if (error) throw error;

      toast.success("Availability added successfully");
      setNewSlot({ 
        date: "",
        start_hour: "", 
        start_minute: "", 
        start_period: "AM",
        end_hour: "", 
        end_minute: "", 
        end_period: "AM" 
      });
      setSelectedDate(undefined);
      setIsAddingAvailability(false);
      
      if (user) fetchCoachData(user.id);
    } catch (error) {
      console.error('Error adding availability:', error);
      toast.error('Failed to add availability');
    }
  };

  const uploadProfileImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('coach-images')
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('coach-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const updateProfile = async () => {
    if (!coachProfile || !user) return;

    try {
      let imageUrl = coachProfile.image_url;
      
      if (profileImage) {
        imageUrl = await uploadProfileImage(profileImage);
      }

      const { error } = await supabase
        .from('coaches')
        .update({
          name: editProfile.name,
          position: editProfile.position,
          strengths: editProfile.strengths,
          bio: editProfile.bio,
          image_url: imageUrl
        })
        .eq('id', coachProfile.id);

      if (error) throw error;

      // Update profiles table too
      await supabase
        .from('profiles')
        .update({
          name: editProfile.name,
          age: parseInt(editProfile.age),
          gender: editProfile.gender
        })
        .eq('user_id', user.id);

      toast.success("Profile updated successfully");
      setIsEditingProfile(false);
      setProfileImage(null);
      fetchCoachData(user.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minutes} ${period}`;
  };

  const viewPlayerDetails = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, position, age, gender, goals, team, area')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setSelectedPlayer(profile);
      setIsViewingPlayer(true);
    } catch (error) {
      console.error('Error fetching player details:', error);
      toast.error('Failed to load player details');
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


        {/* Coach Profile Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Your Coach Profile</CardTitle>
                <CardDescription>Your profile information as shown to players</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setEditProfile({
                  name: coachProfile.name,
                  position: coachProfile.position,
                  strengths: coachProfile.strengths,
                  bio: coachProfile.bio,
                  age: "",
                  gender: ""
                });
                setIsEditingProfile(true);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {coachProfile.image_url && (
                <div className="flex-shrink-0">
                  <img
                    src={coachProfile.image_url}
                    alt={coachProfile.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-semibold">{coachProfile.name}</h3>
                <p className="text-muted-foreground">{coachProfile.position}</p>
                <p className="text-sm"><strong>Strengths:</strong> {coachProfile.strengths}</p>
                <p className="text-sm">{coachProfile.bio}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{session.profiles?.name || 'Unknown Player'}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewPlayerDetails(session.user_id)}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Availability Slot</DialogTitle>
                      <DialogDescription>
                        Add a new time slot when you're available for coaching
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Start Time</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <Select value={newSlot.start_hour} onValueChange={(value) => setNewSlot(prev => ({ ...prev, start_hour: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Hr" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                                <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={newSlot.start_minute} onValueChange={(value) => setNewSlot(prev => ({ ...prev, start_minute: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(minute => (
                                <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={newSlot.start_period} onValueChange={(value) => setNewSlot(prev => ({ ...prev, start_period: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>End Time</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <Select value={newSlot.end_hour} onValueChange={(value) => setNewSlot(prev => ({ ...prev, end_hour: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Hr" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                                <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={newSlot.end_minute} onValueChange={(value) => setNewSlot(prev => ({ ...prev, end_minute: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(minute => (
                                <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={newSlot.end_period} onValueChange={(value) => setNewSlot(prev => ({ ...prev, end_period: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
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
                   availability
                     .filter(slot => {
                       // Filter out past dates
                       if (slot.specific_date) {
                         const today = new Date();
                         today.setHours(0,0,0,0);
                         return new Date(slot.specific_date) >= today;
                       }
                       return slot.is_available;
                     })
                     .map((slot) => (
                        <div key={slot.id} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <span className="font-medium">
                              {slot.specific_date 
                                ? `${format(new Date(slot.specific_date), 'EEEE')}, ${format(new Date(slot.specific_date), 'MMMM d')}, ${formatTimeDisplay(slot.start_time)} - ${formatTimeDisplay(slot.end_time)}`
                                : `${slot.day_of_week}, ${formatTimeDisplay(slot.start_time)} - ${formatTimeDisplay(slot.end_time)}`}
                            </span>
                          </div>
                          <Badge variant="default">
                            Available
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

        {/* Edit Profile Dialog */}
        <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Update your coach profile information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setProfileImage(file);
                  }}
                />
                {profileImage && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <p className="text-sm text-muted-foreground">
                      Selected: {profileImage.name}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setProfileImage(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editProfile.name}
                  onChange={(e) => setEditProfile(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  value={editProfile.position}
                  onChange={(e) => setEditProfile(prev => ({ ...prev, position: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={editProfile.age}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, age: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={editProfile.gender} onValueChange={(value) => setEditProfile(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Strengths</Label>
                <Input
                  value={editProfile.strengths}
                  onChange={(e) => setEditProfile(prev => ({ ...prev, strengths: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={editProfile.bio}
                  onChange={(e) => setEditProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button onClick={updateProfile} className="w-full">
                Update Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Player Details Dialog */}
        <Dialog open={isViewingPlayer} onOpenChange={setIsViewingPlayer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Player Details</DialogTitle>
              <DialogDescription>Complete player information</DialogDescription>
            </DialogHeader>
            {selectedPlayer && (
              <div className="space-y-3">
                <div>
                  <Label className="font-semibold">Name</Label>
                  <p>{selectedPlayer.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Position</Label>
                  <p>{selectedPlayer.position}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Age</Label>
                    <p>{selectedPlayer.age}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Gender</Label>
                    <p>{selectedPlayer.gender}</p>
                  </div>
                </div>
                <div>
                  <Label className="font-semibold">Team</Label>
                  <p>{selectedPlayer.team}</p>
                </div>
                <div>
                  <Label className="font-semibold">Area</Label>
                  <p>{selectedPlayer.area}</p>
                </div>
                <div>
                  <Label className="font-semibold">Goals</Label>
                  <p>{selectedPlayer.goals}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CoachDashboard;