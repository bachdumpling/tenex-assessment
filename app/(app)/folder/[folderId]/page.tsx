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

  return <FolderWorkspace folderId={folderId} />
}
