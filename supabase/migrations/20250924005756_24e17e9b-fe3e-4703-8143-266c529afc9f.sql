-- Update coaches table to focus on soccer coaches
DELETE FROM coaches;

-- Insert soccer coaches
INSERT INTO coaches (name, position, bio, available_times) VALUES
  ('Coach Sarah Martinez', 'Head Soccer Coach', 'Former professional player with 10+ years coaching experience. Specializes in technical skills and tactical awareness.', ARRAY['Monday 3:00 PM', 'Monday 5:00 PM', 'Wednesday 4:00 PM', 'Friday 3:30 PM']),
  ('Coach Mike Rodriguez', 'Goalkeeper Coach', 'Former Division I goalkeeper. Expert in shot-stopping techniques, distribution, and positioning.', ARRAY['Tuesday 4:00 PM', 'Thursday 3:00 PM', 'Thursday 5:30 PM', 'Saturday 10:00 AM']),
  ('Coach Emma Thompson', 'Youth Development Specialist', 'Focuses on fundamental skills development for young players. Creative training methods and positive reinforcement.', ARRAY['Monday 4:30 PM', 'Wednesday 3:00 PM', 'Friday 4:00 PM', 'Saturday 9:00 AM']),
  ('Coach David Park', 'Fitness & Conditioning Coach', 'Sports science background with focus on soccer-specific fitness, injury prevention, and performance optimization.', ARRAY['Tuesday 5:00 PM', 'Wednesday 5:30 PM', 'Friday 5:00 PM', 'Saturday 11:00 AM']);