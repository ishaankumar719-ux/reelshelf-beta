import FriendShelvesClient from "./FriendShelvesClient";

export default async function FriendShelvesPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ shelf?: string; t?: string }>;
}) {
  const { username } = await params;
  const { shelf, t } = await searchParams;
  return <FriendShelvesClient username={decodeURIComponent(username)} shelf={shelf ?? null} token={t ?? null} />;
}
