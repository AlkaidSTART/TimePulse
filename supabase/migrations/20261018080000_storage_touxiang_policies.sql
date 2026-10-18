-- Enable public bucket for touxiang if not already
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'touxiang',
  'touxiang',
  true,
  204800,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 204800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- 1. Public SELECT
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'touxiang');

-- 2. Authenticated INSERT
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'touxiang'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- 3. Anon INSERT (彻底移除匿名访客上传权限，防止 5MB 总对象存储被恶意填满)
DROP POLICY IF EXISTS "Anon users can upload guest avatars" ON storage.objects;

-- 4. Authenticated UPDATE (upsert requires SELECT + INSERT + UPDATE)
DROP POLICY IF EXISTS "Authenticated users can update their own avatar" ON storage.objects;
CREATE POLICY "Authenticated users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'touxiang'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'touxiang'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- 5. Authenticated DELETE
DROP POLICY IF EXISTS "Authenticated users can delete their own avatar" ON storage.objects;
CREATE POLICY "Authenticated users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'touxiang'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);
