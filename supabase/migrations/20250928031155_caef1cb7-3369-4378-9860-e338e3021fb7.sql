-- Allow coaches to view profiles of players who have sessions with them
CREATE POLICY "Coaches can view player profiles for their sessions" 
ON public.profiles 
FOR SELECT 
USING (
  user_id IN (
    SELECT s.user_id 
    FROM sessions s
    JOIN coaches c ON s.coach_id = c.id
    WHERE c.user_id = auth.uid()
  )
);