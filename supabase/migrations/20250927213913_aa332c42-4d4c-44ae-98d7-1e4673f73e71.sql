-- Add RLS policy to allow coaches to delete sessions for their bookings
CREATE POLICY "Coaches can delete their sessions" 
ON public.sessions 
FOR DELETE 
USING (coach_id IN ( SELECT coaches.id
   FROM coaches
  WHERE (coaches.user_id = auth.uid())));