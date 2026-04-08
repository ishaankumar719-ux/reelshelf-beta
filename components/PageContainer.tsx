export default function PageContainer({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  )
}