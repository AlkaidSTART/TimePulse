-- 迁移脚本：紧缩 touxiang 存储桶配额约束（适配总容量仅 5MB 的对象存储环境）
-- 1. 单文件上限调整至 200KB (204800 字节)
-- 2. 限制仅支持静态图片（png, jpeg, webp），移除 gif
-- 3. 彻底移除匿名访客上传策略，杜绝 5MB 空间被无门槛刷爆

UPDATE storage.buckets
SET
  file_size_limit = 204800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'touxiang';

-- 彻底移除匿名上传权限
DROP POLICY IF EXISTS "Anon users can upload guest avatars" ON storage.objects;
