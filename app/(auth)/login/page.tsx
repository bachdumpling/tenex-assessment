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
    </LoginHero>
  )
}
