-- Create a table to store valid coach access codes
CREATE TABLE public.coach_access_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.coach_access_codes ENABLE ROW LEVEL SECURITY;

-- Only allow reading of codes for verification (no user access to view all codes)
CREATE POLICY "Anyone can verify codes exist" 
ON public.coach_access_codes 
FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Insert some initial coach access codes
INSERT INTO public.coach_access_codes (code, description) VALUES 
('COACH2024', 'Initial coach access code'),
('ANTEATER_COACH', 'Anteater Academy coach code');