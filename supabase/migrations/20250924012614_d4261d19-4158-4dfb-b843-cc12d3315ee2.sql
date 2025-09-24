-- Add DELETE policy for sessions so users can cancel their own sessions
CREATE POLICY "Users can delete their own sessions" 
ON public.sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Clear all existing sessions to start with a blank slate
DELETE FROM public.sessions;