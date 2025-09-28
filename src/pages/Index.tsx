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
        const { data, error } = await supabase
          .from('coaches')
          .select('*');
        
        if (error) throw error;

        // Get coach emails and ages from profiles
        const coachesWithProfiles = [];
        for (const coach of (data || [])) {
          if (coach.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, age')
              .eq('user_id', coach.user_id)
              .maybeSingle();
            
            coachesWithProfiles.push({
              ...coach,
              email: profile?.email || null,
              age: profile?.age || null
            });
          } else {
            coachesWithProfiles.push(coach);
          }
        }

        setCoaches(coachesWithProfiles);
      } catch (error) {
        console.error('Error loading coaches:', error);
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
            <Card key={coach.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-4">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={coach.image_url || ""} alt={coach.name} />
                  <AvatarFallback className="text-lg">
                    {coach.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{coach.name}</CardTitle>
                {coach.position && (
                  <CardDescription className="text-lg font-medium">
                    {coach.position}
                  </CardDescription>
                )}
                {coach.age && (
                  <Badge variant="secondary" className="w-fit mx-auto">
                    Age {coach.age}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {coach.bio && (
                  <div>
                    <h4 className="font-semibold mb-2">Bio</h4>
                    <p className="text-sm text-muted-foreground">{coach.bio}</p>
                  </div>
                )}
                {coach.strengths && (
                  <div>
                    <h4 className="font-semibold mb-2">Strengths</h4>
                    <p className="text-sm text-muted-foreground">{coach.strengths}</p>
                  </div>
                )}
                {coach.email && (
                  <div>
                    <h4 className="font-semibold mb-2">Contact</h4>
                    <p className="text-sm text-muted-foreground">{coach.email}</p>
                  </div>
                )}
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
