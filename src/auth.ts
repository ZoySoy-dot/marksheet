import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Google sign-in, and nothing else.
 *
 * No database adapter: the session is a signed JWT, and the only thing we keep
 * of a person is the id we already write onto their quizzes, attempts and
 * cards. That id is Google's stable subject claim.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  // Vercel fixes the Host header at the edge, so it can be trusted. Without
  // this a production build refuses every request with UntrustedHost, which
  // also bites when running `next start` locally.
  trustHost: true,
  callbacks: {
    /**
     * Without a database adapter, Auth.js throws away the provider's id and
     * mints a fresh crypto.randomUUID() as `user.id`, which becomes token.sub
     * (@auth/core, actions/callback). Every sign-in is therefore a different
     * person, and everything you own belongs to a previous "you".
     *
     * Google's subject claim is stable for the life of the account, and is on
     * both the raw profile and account.providerAccountId, so take either.
     */
    jwt({ token, profile, account }) {
      const t = token as Record<string, unknown>;

      const stable =
        (typeof profile?.sub === "string" && profile.sub) ||
        (typeof account?.providerAccountId === "string" && account.providerAccountId) ||
        null;
      if (stable) t.uid = stable;

      // On every request after sign-in, Auth.js re-runs this callback with the
      // decoded cookie and no profile or account, so a token minted before
      // stable ids existed can never acquire one. Returning null drops the
      // cookie and asks them to sign in once more, which costs a click and
      // returns the right id, where keeping it would quietly file their work
      // under a UUID nobody can sign in as again.
      if (typeof t.uid !== "string" || !t.uid) return null;

      return t;
    },

    session({ session, token }) {
      // Auth.js builds session.user from the token's name/email/picture only,
      // so the id is ours to supply. The jwt callback above guarantees uid.
      const uid = (token as Record<string, unknown>).uid;
      session.user.id = typeof uid === "string" ? uid : "";
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}


/** The signed-in person's id, or null. The shape every route wants. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  // An empty id means the session predates stable ids: treat it as signed out
  // rather than as a person, so nothing gets filed under a blank owner.
  return session?.user?.id || null;
}

/** Id, plus the name and picture a leaderboard needs. */
export async function currentUser(): Promise<{
  id: string;
  name: string | null;
  image: string | null;
} | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return {
    id,
    name: session.user.name?.trim() || null,
    image: session.user.image?.trim() || null,
  };
}
