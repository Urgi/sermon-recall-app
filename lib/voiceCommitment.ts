import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'voice-commitments';

export type VoiceUploadOk = { path: string };
export type VoiceUploadErr = { error: string };

/**
 * Uploads a local recording URI into Supabase Storage; returns object path for `voice_recording_url`.
 */
export async function uploadVoiceCommitment(opts: {
  supabase: SupabaseClient;
  localUri: string;
  userId: string;
  devotionalId: string;
}): Promise<VoiceUploadOk | VoiceUploadErr> {
  const path = `${opts.userId}/${opts.devotionalId}.m4a`;

  let blob: Blob;
  try {
    const res = await fetch(opts.localUri);
    blob = await res.blob();
  } catch {
    return { error: 'Could not read the recording file.' };
  }

  const { error: upErr } = await opts.supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'audio/m4a', upsert: true });

  if (upErr) {
    return { error: upErr.message };
  }

  return { path };
}

export async function createVoicePlaybackUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
