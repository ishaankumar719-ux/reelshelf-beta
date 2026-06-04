import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import ShortFilmDetailClient from "./ShortFilmDetailClient";

export interface ShortFilm {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  channel: string | null;
  release_year: number | null;
  release_date: string | null;
  runtime: number | null;
  thumbnail_url: string | null;
  external_url: string | null;
  video_id: string | null;
  platform: string | null;
  genres: string[];
  credits: Array<{ name: string; role: string }>;
}

export default async function ShortFilmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  if (!supabase) {
    notFound();
  }

  const { data: shortFilm, error } = await supabase
    .from("short_films")
    .select("*")
    .eq("id", id)
    .single<ShortFilm>();

  if (error || !shortFilm) {
    notFound();
  }

  return <ShortFilmDetailClient shortFilm={shortFilm} />;
}
