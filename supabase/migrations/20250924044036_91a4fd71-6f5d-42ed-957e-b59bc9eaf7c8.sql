-- Allow players to cancel their own sessions by updating the policies
-- This ensures players can cancel sessions, which will trigger availability restoration

-- Drop and recreate the policy with proper syntax
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;

CREATE POLICY "Users can update their own sessions" 
ON public.sessions 
FOR UPDATE 
USING (auth.uid() = user_id);