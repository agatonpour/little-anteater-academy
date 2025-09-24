-- Create storage bucket for coach images
INSERT INTO storage.buckets (id, name, public) VALUES ('coach-images', 'coach-images', true);

-- Create policies for coach image uploads
CREATE POLICY "Coach images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'coach-images');

CREATE POLICY "Coaches can upload their own images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'coach-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coaches can update their own images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'coach-images' AND auth.uid()::text = (storage.foldername(name))[1]);