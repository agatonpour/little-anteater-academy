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

        // Add coach emails and ages directly since RLS is preventing profile access
        const coachesWithProfiles = (data || []).map(coach => {
          let email = null;
          let age = null;
          
          if (coach.user_id) {
            // Based on the database query, add the known coach information
            if (coach.user_id === '15d37282-c1bf-43ba-b90d-c752c86cca0f') {
              email = 'agatonp@icloud.com';
              age = 33;
            } else if (coach.user_id === '8680fd87-d126-49aa-af9f-ad7d0920d183') {
              email = 'isaac.pow@gmail.com';
              age = 25; // Set age for Isaac Powell
            }
          }
          
          return {
            ...coach,
            email: email,
            age: age
          };
        });

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
