import { auth, signIn } from "@/auth"
import { LoginHero } from "@/components/auth/LoginHero"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    redirect("/")
  }

  return (
    <LoginHero>
      <div className="flex w-full flex-col gap-4">
        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/" })
          }}
        >
          <Button type="submit" size="lg" className="w-full text-base">
            Continue with Google
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Built by{" "}
          <a
            href="https://www.bachle.info"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            @bach le
          </a>
        </p>
      </div>
    </LoginHero>
  )
}
