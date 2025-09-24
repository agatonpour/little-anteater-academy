-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('player', 'coach');

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'player';

-- Update coaches table to link to user accounts
ALTER TABLE public.coaches ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.coaches ADD COLUMN strengths text;
ALTER TABLE public.coaches DROP COLUMN IF EXISTS available_times;

-- Create coach_availability table for dynamic time management
CREATE TABLE public.coach_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  day_of_week text NOT NULL, -- 'Monday', 'Tuesday', etc.
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on coach_availability
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

-- Create session status enum
CREATE TYPE public.session_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Rename old status column and create new one
ALTER TABLE public.sessions RENAME COLUMN status TO old_status;
ALTER TABLE public.sessions ADD COLUMN status public.session_status NOT NULL DEFAULT 'pending';

-- Migrate data from old_status to new status
UPDATE public.sessions SET status = 
  CASE 
    WHEN old_status = 'pending' THEN 'pending'::public.session_status
    WHEN old_status = 'confirmed' THEN 'confirmed'::public.session_status
    WHEN old_status = 'completed' THEN 'completed'::public.session_status
    WHEN old_status = 'cancelled' THEN 'cancelled'::public.session_status
    ELSE 'confirmed'::public.session_status
  END;

-- Drop old status column
ALTER TABLE public.sessions DROP COLUMN old_status;

-- RLS Policies for coach_availability
CREATE POLICY "Coaches can manage their own availability" 
ON public.coach_availability 
FOR ALL 
USING (
  coach_id IN (
    SELECT id FROM public.coaches WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Players can view coach availability" 
ON public.coach_availability 
FOR SELECT 
USING (is_available = true);

-- Update coaches RLS to allow coaches to update their own profile
CREATE POLICY "Coaches can update their own profile" 
ON public.coaches 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Coaches can insert their own profile" 
ON public.coaches 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Update sessions RLS for coaches to view sessions booked with them
CREATE POLICY "Coaches can view their sessions" 
ON public.sessions 
FOR SELECT 
USING (
  coach_id IN (
    SELECT id FROM public.coaches WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update their sessions" 
ON public.sessions 
FOR UPDATE 
USING (
  coach_id IN (
    SELECT id FROM public.coaches WHERE user_id = auth.uid()
  )
);

-- Add trigger for coach_availability updated_at
CREATE TRIGGER update_coach_availability_updated_at
BEFORE UPDATE ON public.coach_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for coach_availability and sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;