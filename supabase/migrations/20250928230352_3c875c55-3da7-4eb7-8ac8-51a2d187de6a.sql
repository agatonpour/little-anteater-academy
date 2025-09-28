-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email text;

-- Update existing profiles with their auth email
UPDATE public.profiles 
SET email = auth.users.email 
FROM auth.users 
WHERE profiles.user_id = auth.users.id;