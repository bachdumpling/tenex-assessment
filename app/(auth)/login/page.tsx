import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    redirect("/")
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Talk to a Folder
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with Google (read-only Drive) to index a folder and chat with
          citations.
        </p>
      </div>
      <form
        action={async () => {
          "use server"
          await signIn("google", { redirectTo: "/" })
        }}
      >
        <Button type="submit" size="lg">
          Continue with Google
        </Button>
      </form>
    </div>
  )
}
