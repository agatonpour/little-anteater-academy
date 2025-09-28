-- Allow everyone to view coach profiles
CREATE POLICY "Everyone can view coach profiles" 
ON public.profiles 
FOR SELECT 
USING (role = 'coach');