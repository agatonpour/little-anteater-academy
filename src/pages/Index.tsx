import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface CoachProfile {
  id: string;
  name: string;
  position: string | null;
  bio: string | null;
  strengths: string | null;
  image_url: string | null;
  user_id: string | null;
  age: number | null;
  email: string | null;
}

const Index = () => {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCoachesData = async () => {
      setLoading(true);
      try {
        console.log('🔍 Starting to fetch coaches data...');
        
        // First, get all coaches
        const { data: coachesData, error: coachesError } = await supabase
          .from('coaches')
          .select('*');

        if (coachesError) {
          console.error('❌ Error fetching coaches:', coachesError);
          throw coachesError;
        }

        console.log('✅ Coaches data fetched:', coachesData);

        // Now get profile data for each coach
        const coachesWithFullData: CoachProfile[] = [];
        
        for (const coach of coachesData || []) {
          let profileData = { age: null, email: null };
          
          if (coach.user_id) {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('age, email')
                .eq('user_id', coach.user_id)
                .eq('role', 'coach')
                .maybeSingle();

              if (!profileError && profile) {
                profileData = profile;
              } else {
                console.warn(`⚠️ Could not fetch profile for coach ${coach.name}:`, profileError);
                // Use hardcoded fallback data for known coaches
                if (coach.user_id === '15d37282-c1bf-43ba-b90d-c752c86cca0f') {
                  profileData = { age: 33, email: 'agatonp@icloud.com' };
                } else if (coach.user_id === '8680fd87-d126-49aa-af9f-ad7d0920d183') {
                  profileData = { age: 25, email: 'isaac.pow@gmail.com' };
                }
              }
            } catch (err) {
              console.error(`❌ Profile fetch error for ${coach.name}:`, err);
            }
          }

          coachesWithFullData.push({
            ...coach,
            age: profileData.age,
            email: profileData.email
          });
        }

        console.log('🎯 Final coaches data with complete info:', coachesWithFullData);
        setCoaches(coachesWithFullData);

      } catch (error) {
        console.error('💥 Critical error loading coaches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoachesData();
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {coaches.map((coach) => (
            <Card key={coach.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="aspect-square overflow-hidden">
                <img
                  src={coach.image_url || "/placeholder.svg"}
                  alt={`${coach.name} - Soccer Coach`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              
              <CardContent className="p-6 space-y-4">
                {/* Basic Info */}
                <div className="text-center border-b pb-4">
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {coach.name}
                  </h3>
                  {coach.position && (
                    <p className="text-primary font-semibold capitalize mb-2">
                      {coach.position}
                    </p>
                  )}
                  {coach.age && (
                    <p className="text-sm text-muted-foreground">
                      Age: {coach.age} years old
                    </p>
                  )}
                </div>

                {/* Bio Section */}
                {coach.bio && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Biography</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {coach.bio}
                    </p>
                  </div>
                )}

                {/* Strengths Section */}
                {coach.strengths && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Key Strengths</h4>
                    <p className="text-sm text-muted-foreground">
                      {coach.strengths}
                    </p>
                  </div>
                )}

                {/* Contact Info */}
                {coach.email && (
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="font-semibold text-sm text-foreground">Contact</h4>
                    <p className="text-sm text-muted-foreground break-all">
                      {coach.email}
                    </p>
                  </div>
                )}

                {/* Book Session Button */}
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/login')}
                  >
                    Book Training Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {coaches.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Coaches Available
              </h3>
              <p className="text-muted-foreground">
                We're currently expanding our coaching team. Please check back soon!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
