-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  position TEXT,
  goals TEXT,
  team TEXT,
  area TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coaches table
CREATE TABLE public.coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT,
  image_url TEXT,
  bio TEXT,
  available_times TEXT[], -- Array of available time slots
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sessions table for booking training sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL REFERENCES public.coaches(id),
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for coaches (public read access)
CREATE POLICY "Coaches are viewable by everyone" ON public.coaches
FOR SELECT USING (true);

-- Create policies for sessions
CREATE POLICY "Users can view their own sessions" ON public.sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.sessions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.sessions
FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample coaches data
INSERT INTO public.coaches (name, position, image_url, bio, available_times) VALUES
('Coach Sarah Martinez', 'Soccer Coach', '', 'Experienced youth soccer coach with 10+ years of training athletes', ARRAY['Monday 4:00 PM', 'Wednesday 5:00 PM', 'Friday 4:30 PM', 'Saturday 10:00 AM']),
('Coach Mike Rodriguez', 'Basketball Coach', '', 'Former college basketball player specializing in fundamentals and strategy', ARRAY['Tuesday 5:00 PM', 'Thursday 6:00 PM', 'Saturday 2:00 PM', 'Sunday 11:00 AM']),
('Coach Emma Thompson', 'Track & Field Coach', '', 'Olympic-level training expertise in sprinting and long-distance running', ARRAY['Monday 6:00 PM', 'Wednesday 4:00 PM', 'Friday 5:30 PM', 'Sunday 9:00 AM']),
('Coach David Park', 'Tennis Coach', '', 'Professional tennis instructor with tournament experience', ARRAY['Tuesday 4:00 PM', 'Thursday 5:00 PM', 'Saturday 8:00 AM', 'Sunday 3:00 PM']);