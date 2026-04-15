import { auth } from "@/auth"
import { redirect } from "next/navigation"

type PageProps = { params: Promise<{ folderId: string }> }

export default async function FolderPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  const { folderId } = await params

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold text-zinc-50">Folder</h1>
      <p className="font-mono text-sm text-zinc-400">{folderId}</p>
      <p className="text-sm text-zinc-500">
        File tree and ingestion will show here in Phase 2.
      </p>
    </div>
  )
}
