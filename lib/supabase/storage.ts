"use client";

import { createClient as createSupabaseBrowserClient } from "./client";

const BUCKET = "review-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export type UploadResult =
  | { url: string; type: "image" | "gif" }
  | { error: string };

export async function uploadAttachment(file: File): Promise<UploadResult> {
  if (file.size > MAX_BYTES) {
    return { error: "Image must be under 10 MB." };
  }

  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { error: "Only JPEG, PNG, WebP, and GIF images are supported." };
  }

  const client = createSupabaseBrowserClient();
  if (!client) return { error: "Not connected to Supabase." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  const type: "image" | "gif" = ext === "gif" ? "gif" : "image";
  return { url: data.publicUrl, type };
}
