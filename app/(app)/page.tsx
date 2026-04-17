import { auth } from "@/auth"
import Waves from "@/components/Waves"
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
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-background" aria-hidden>
        <Waves
          lineColor="oklch(0.705 0.015 286.067 / 0.55)"
          backgroundColor="transparent"
          waveAmpX={32}
          waveAmpY={16}
          xGap={11}
          yGap={26}
          showCursorDot={false}
          className="opacity-100"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-1 bg-linear-to-b from-background/88 via-background/48 to-background/88"
        aria-hidden
      />
      <div className="relative z-10 flex w-full flex-col items-center justify-center">
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
    </div>
  )
}
