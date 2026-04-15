import { auth } from "@/auth"
import { FolderWorkspace } from "@/components/folder/FolderWorkspace"
import { redirect } from "next/navigation"

type PageProps = { params: Promise<{ folderId: string }> }

export default async function FolderPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  const { folderId } = await params

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Folder</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{folderId}</p>
      </div>
      <FolderWorkspace folderId={folderId} />
    </div>
  )
}
