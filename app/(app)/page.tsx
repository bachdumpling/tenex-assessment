import { auth } from "@/auth"
import { FolderLinkInput } from "@/components/folder/FolderLinkInput"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Your folders</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Paste a Google Drive folder link to open it. Ingestion and chat arrive in
          later phases.
        </p>
      </div>
      <FolderLinkInput />
    </div>
  )
}
