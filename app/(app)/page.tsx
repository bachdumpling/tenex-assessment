import { auth } from "@/auth"
import { FolderLinkInput } from "@/components/folder/FolderLinkInput"
import { AccountSummary } from "@/components/home/AccountSummary"
import { HomeBento } from "@/components/home/HomeBento"
import { RecentFolders } from "@/components/home/RecentFolders"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const u = session.user

  return (
    <div className="flex flex-1 flex-col">
      <HomeBento
        hero={
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Talk to your folder
            </h1>
            <p className="mt-2 text-muted-foreground">
              Paste a Drive folder link. We index supported files so you can ask questions with
              citations. Recent folders appear below.
            </p>
          </div>
        }
        account={<AccountSummary name={u.name} email={u.email} image={u.image} />}
        folderLink={<FolderLinkInput className="w-full max-w-none" />}
        recents={<RecentFolders />}
      />
    </div>
  )
}
