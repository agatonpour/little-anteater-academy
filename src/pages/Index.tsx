import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Coach {
  id: string;
  name: string;
  position: string | null;
  bio: string | null;
  strengths: string | null;
  image_url: string | null;
  user_id: string | null;
  age?: number | null;
  email?: string | null;
}

const Index = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCoaches = async () => {
      try {
        // Fetch coaches and their profiles separately since there's no direct foreign key
        const { data: coachesData, error: coachesError } = await supabase
          .from('coaches')
          .select('*');
        
        if (coachesError) throw coachesError;

        // Fetch all profiles for coaches
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, age, email')
          .eq('role', 'coach');

        if (profilesError) throw profilesError;

        // Create a map of user_id to profile data
        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.user_id, profile);
        });

        // Combine coaches with their profile data
        const coachesWithProfiles = (coachesData || []).map(coach => {
          const profile = coach.user_id ? profilesMap.get(coach.user_id) : null;
          return {
            ...coach,
            age: profile?.age || null,
            email: profile?.email || null
          };
        });

        console.log('Coaches with profiles loaded:', coachesWithProfiles);
        setCoaches(coachesWithProfiles);
      } catch (error) {
        console.error('Error loading coaches:', error);
        // Fallback: try to fetch coaches without profiles if there's an RLS issue
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('coaches')
            .select('*');
          
          if (!fallbackError && fallbackData) {
            console.log('Using fallback coach data:', fallbackData);
            setCoaches(fallbackData);
          }
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadCoaches();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">Loading coaches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Anteater Academy
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Meet our professional coaching team
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/login')} variant="default">
              Player Login
            </Button>
            <Button onClick={() => navigate('/coach-login')} variant="outline">
              Coach Login
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((coach) => (
            <Card key={coach.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden rounded-t-lg">
                  <img
                    src={coach.image_url || ""}
                    alt={coach.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{coach.name}</h3>
                    {coach.position && (
                      <p className="text-sm text-primary font-medium">{coach.position.charAt(0).toUpperCase() + coach.position.slice(1)}</p>
                    )}
                    {coach.age && (
                      <p className="text-sm text-muted-foreground">Age: {coach.age}</p>
                    )}
                  </div>
                  
                  {coach.bio && (
                    <div>
                      <p className="text-sm font-medium">Bio:</p>
                      <p className="text-xs text-muted-foreground">{coach.bio}</p>
                    </div>
                  )}
                  
                  {coach.strengths && (
                    <div>
                      <p className="text-sm font-medium">Strengths:</p>
                      <p className="text-xs text-muted-foreground">{coach.strengths}</p>
                    </div>
                  )}
                  
                  {coach.email && (
                    <div>
                      <p className="text-sm font-medium">Contact:</p>
                      <p className="text-xs text-muted-foreground">{coach.email}</p>
                    </div>
                  )}
                  
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Book Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {coaches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No coaches available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
