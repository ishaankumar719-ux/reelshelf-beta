import FriendShelvesClient from "./FriendShelvesClient";
import ProfileTabStrip from "../_components/ProfileTabStrip";

export default async function FriendShelvesPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ shelf?: string; t?: string }>;
}) {
  const { username } = await params;
  const { shelf, t } = await searchParams;
  const name = decodeURIComponent(username);
  return (
    <FriendShelvesClient
      username={name}
      shelf={shelf ?? null}
      token={t ?? null}
      // A direct unlisted link shows just that shelf, without the profile tabs.
      tabs={shelf ? null : <ProfileTabStrip username={name} activeTab="shelves" />}
    />
  );
}
