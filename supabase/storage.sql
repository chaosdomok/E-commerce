-- Storage Bucket Setup for SUE
-- Create 'book-covers' bucket for storing book cover images

-- Insert storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage RLS Policies for book-covers bucket
-- Anyone can read objects from the book-covers bucket
CREATE POLICY "Public read access for book-covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- Only authenticated users can upload to book-covers bucket
CREATE POLICY "Authenticated users can upload to book-covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.role() = 'authenticated'
  );

-- Only authenticated users can update their own uploads in book-covers bucket
CREATE POLICY "Authenticated users can update own uploads in book-covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-covers'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only the owner can delete their own uploads from book-covers bucket
CREATE POLICY "Users can delete own uploads from book-covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
