import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, Users } from "lucide-react";
import coachSarah from "@/assets/coach-sarah.jpg";
import coachMike from "@/assets/coach-mike.jpg";
import coachEmma from "@/assets/coach-emma.jpg";
import coachDavid from "@/assets/coach-david.jpg";

const Landing = () => {
  const navigate = useNavigate();

  const coaches = [
    { name: "Coach Sarah Martinez", position: "Head Soccer Coach", image: coachSarah },
    { name: "Coach Mike Rodriguez", position: "Goalkeeper Coach", image: coachMike },
    { name: "Coach Emma Thompson", position: "Youth Development", image: coachEmma },
    { name: "Coach David Park", position: "Fitness & Conditioning", image: coachDavid },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-end items-center">
        <Button variant="academy" onClick={() => navigate('/login')}>
          Login / Create Account
        </Button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
           <h2 className="text-5xl font-bold mb-6 text-primary">
             Little Anteater Academy
           </h2>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            [Mission Statement Placeholder - To be updated with your academy's mission, values, and commitment to developing young athletes through personalized training programs.]
          </p>
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <div className="flex items-center gap-3 text-lg">
              <Trophy className="h-6 w-6 text-primary" />
              <span>Championship Training</span>
            </div>
            <div className="flex items-center gap-3 text-lg">
              <Target className="h-6 w-6 text-secondary" />
              <span>Personalized Goals</span>
            </div>
            <div className="flex items-center gap-3 text-lg">
              <Users className="h-6 w-6 text-primary" />
              <span>Expert Coaches</span>
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
                    src={coach.image}
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
            variant="academy" 
            size="lg" 
            onClick={() => navigate('/login')}
            className="text-lg px-8 py-3"
          >
            Login / Create Account to Book Session
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;