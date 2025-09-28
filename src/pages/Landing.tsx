import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import heroImage from "@/assets/anteater-academy-hero.png";

const Landing = () => {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<any[]>([]);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const { data, error } = await supabase
          .from('coaches')
          .select('*');
        
        if (error) {
          console.error('Error fetching coaches:', error);
          return;
        }
        
        setCoaches(data || []);
      } catch (error) {
        console.error('Error fetching coaches:', error);
      }
    };

    fetchCoaches();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Button 
          size="sm" 
          onClick={() => navigate('/coach-login')}
          className="bg-[hsl(222,84%,27%)] hover:bg-[hsl(222,84%,22%)] text-white"
        >
          Sign in as Coach
        </Button>
        <Button 
          onClick={() => navigate('/login')}
          className="bg-[hsl(222,84%,27%)] hover:bg-[hsl(222,84%,22%)] text-white"
        >
          Login
        </Button>
      </header>

      {/* Hero Section */}
      <section 
        className="relative min-h-[70vh] flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="container mx-auto px-6 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-8 text-white drop-shadow-lg">
              Little Anteater Academy
            </h1>
            <p className="text-xl mb-8 leading-relaxed text-white/90 drop-shadow-md max-w-3xl mx-auto">
              Our mission is to inspire and develop the next generation of soccer players in our community by providing high-quality, accessible training led by UC Irvine Men's Soccer athletes. We aim to build skills, confidence, and a lifelong love of the game while giving back to the families who support us and the sport we love.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="flex items-center gap-3 text-lg text-white/90">
                <Trophy className="h-6 w-6 text-white" />
                <span>High-Quality Training</span>
              </div>
              <div className="flex items-center gap-3 text-lg text-white/90">
                <Target className="h-6 w-6 text-white" />
                <span>Personalized Goals</span>
              </div>
              <div className="flex items-center gap-3 text-lg text-white/90">
                <Users className="h-6 w-6 text-white" />
                <span>Division 1 Coaches</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Player Profiles */}
      <section className="container mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-center mb-12 text-secondary">Meet Our Coaches</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {coaches.map((coach, index) => (
            <Card key={index} className="group hover:shadow-[var(--academy-shadow)] transition-[var(--transition-smooth)] overflow-hidden">
              <CardContent className="p-0">
                 <div className="aspect-square overflow-hidden">
                   <img
                     src={coach.image_url || "/placeholder.svg"}
                     alt={coach.name}
                     className="w-full h-full object-cover group-hover:scale-105 transition-[var(--transition-smooth)]"
                   />
                 </div>
                <div className="p-6 text-center">
                  <h4 className="font-semibold text-lg mb-2">{coach.name}</h4>
                  <p className="text-muted-foreground">{coach.position}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-lg text-muted-foreground mb-6">
            Ready to start your training journey?
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/login')}
            className="bg-[hsl(222,84%,27%)] hover:bg-[hsl(222,84%,22%)] text-white text-lg px-8 py-3"
          >
            Login / Create Account to Book Session
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;