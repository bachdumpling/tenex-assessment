import NextAuth from "next-auth"

import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account }) {
      if (account?.provider === "google" && account.refresh_token && token.sub) {
        const { encryptRefreshToken } = await import("@/lib/crypto/refresh-token")
        const { saveEncryptedRefreshToken } = await import(
          "@/lib/db/queries/google-oauth"
        )
        const ciphertext = encryptRefreshToken(account.refresh_token)
        await saveEncryptedRefreshToken(token.sub, ciphertext)
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
