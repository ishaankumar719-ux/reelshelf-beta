import type { SupabaseClient } from "@supabase/supabase-js";

type CreateNotificationOptions = {
  userId: string;
  actorUserId: string;
  type: "comment";
  targetId: string;
  preview: string;
};

export async function createNotification(
  client: SupabaseClient,
  { userId, actorUserId, type: _type, targetId }: CreateNotificationOptions
): Promise<void> {
  if (userId === actorUserId) return;

  const { error } = await client.from("notifications").insert({
    recipient_id: userId,
    actor_id: actorUserId,
    type: "entry_commented",
    reference_id: targetId,
    reference_type: "diary_entry",
    read: false,
  });

  if (error) {
    console.error("[createNotification] insert failed", error);
  }
}
