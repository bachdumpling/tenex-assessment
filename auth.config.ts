import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

const driveReadonly = "https://www.googleapis.com/auth/drive.readonly"

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: `openid email profile ${driveReadonly}`,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname
      if (path.startsWith("/api/auth")) return true
      if (path === "/login") return true
      if (path.startsWith("/api/")) {
        return !!auth?.user
      }
      if (path === "/" || path.startsWith("/folder")) {
        return !!auth?.user
      }
      return true
    },
  },
} satisfies NextAuthConfig
