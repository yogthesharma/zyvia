-- Issue rich description (Plate JSON) + durable editor media bucket.

alter table public.issues
  add column if not exists description_doc jsonb;

comment on column public.issues.description_doc is
  'Plate/Slate rich document JSON. Plain text issues.description is derived for search/snippets.';

-- ---------------------------------------------------------------------------
-- Editor media (images, video, audio, pdf for rich text embeds)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editor-media',
  'editor-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/webm',
    'audio/aac',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path layout: {workspace_id}/{user_id}/{uuid}-{filename}

create policy "editor_media_public_read"
  on storage.objects for select
  using (bucket_id = 'editor-media');

create policy "editor_media_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'editor-media'
    and private.workspace_role((storage.foldername(name))[1]::uuid) is not null
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "editor_media_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'editor-media'
    and private.workspace_role((storage.foldername(name))[1]::uuid) is not null
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'editor-media'
    and private.workspace_role((storage.foldername(name))[1]::uuid) is not null
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "editor_media_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'editor-media'
    and private.workspace_role((storage.foldername(name))[1]::uuid) is not null
    and (storage.foldername(name))[2] = auth.uid()::text
  );
