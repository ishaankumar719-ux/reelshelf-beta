import { Suspense } from "react"
import SearchPageClient from "@/components/search/SearchPageClient"

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = resolvedSearchParams.q ?? ""

  return (
    <Suspense fallback={null}>
      <SearchPageClient initialQuery={initialQuery} />
    </Suspense>
  )
}
