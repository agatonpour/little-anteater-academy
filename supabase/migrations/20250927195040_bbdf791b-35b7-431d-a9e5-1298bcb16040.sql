-- Add specific_date column to coach_availability if it doesn't exist
ALTER TABLE coach_availability ADD COLUMN IF NOT EXISTS specific_date DATE;

-- Drop existing storage policies to recreate them properly
DROP POLICY IF EXISTS "Coaches can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view coach images" ON storage.objects;

-- Create proper storage policies for coach-images bucket
CREATE POLICY "Coaches can upload images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'coach-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Coaches can update images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'coach-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Coaches can delete images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'coach-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view coach images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'coach-images');