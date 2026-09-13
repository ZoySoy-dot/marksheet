"use client";

import { signOut, useSession } from "next-auth/react";
import SignInButton from "@/components/SignInButton";

/** Avatar plus a way out. No popover: there are only two things to do. */
export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();

  // Render nothing rather than flashing "Sign in" at someone who is signed in.
  if (status === "loading") return <span className="user-chip is-loading" aria-hidden="true" />;

  if (!session?.user) {
    return <SignInButton className="auth-btn">Sign in</SignInButton>;
  }

  const name = session.user.name ?? "Signed in";

  return (
    <span className="user-chip">
      {session.user.image ? (
        // Google's avatar, served straight from their CDN.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="user-avatar" src={session.user.image} alt="" width={28} height={28} />
      ) : (
        <span className="user-avatar user-avatar-blank" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      {compact ? null : <span className="user-name">{name}</span>}
      <button className="link-btn" type="button" onClick={() => signOut()}>
        Sign out
      </button>
    </span>
  );
}
