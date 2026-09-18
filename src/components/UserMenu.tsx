"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import SignInButton from "@/components/SignInButton";
import { firstName, initial } from "@/lib/people";
import { useUsage } from "@/lib/useUsage";
import { TOKENS_PER_TYPICAL_IMPORT } from "@/lib/usage";

/**
 * The account, behind the avatar.
 *
 * Signing out used to sit in the masthead as a bare button, which put the one
 * irreversible action on the page permanently one stray tap away, and left
 * nowhere to show anything else. Now the avatar opens a panel: who you are
 * signed in as, what you have left, where to top up, and a way out last.
 */
export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();
  const usage = useUsage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Following a link should put the panel away.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Render nothing rather than flashing "Sign in" at someone who is signed in.
  if (status === "loading") return <span className="user-chip is-loading" aria-hidden="true" />;

  if (!session?.user) {
    return <SignInButton className="auth-btn">Sign in</SignInButton>;
  }

  const user = session.user;
  const left = usage?.importsLeft ?? null;
  const tokens = usage?.credits ?? null;

  /**
   * A balance too small for one whole read is still not nothing, and "0 credits
   * left" reads as though the money never arrived. It is also wrong about what
   * you can do: canImport() asks whether anything is left, not whether there is
   * enough for this file, so a part balance still buys a read.
   */
  const partial = left === 0 && (tokens ?? 0) > 0;

  return (
    <div className="account" ref={wrap}>
      <button
        className="account-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? "Close account menu" : "Open account menu"}</span>
        {user.image ? (
          // Google's avatar, served straight from their CDN.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="user-avatar" src={user.image} alt="" width={28} height={28} />
        ) : (
          <span className="user-avatar user-avatar-blank" aria-hidden="true">
            {initial(user.name)}
          </span>
        )}
        {compact ? null : (
          <span className="user-name">{firstName(user.name, "Account")}</span>
        )}
        {/* A chevron, so the avatar reads as something you can press. */}
        <svg className="account-caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      <div className="account-panel" role="menu" hidden={!open}>
        <div className="account-who">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="user-avatar" src={user.image} alt="" width={40} height={40} />
          ) : (
            <span className="user-avatar user-avatar-blank" aria-hidden="true">
              {initial(user.name)}
            </span>
          )}
          <div className="account-id">
            <p className="account-name">{user.name ?? "Signed in"}</p>
            {user.email ? <p className="account-email">{user.email}</p> : null}
          </div>
        </div>

        <div className="account-credits">
          <p className="figure">
            <span className="figure-num">
              {partial ? tokens!.toLocaleString() : (left ?? "—")}
            </span>
            <span className="figure-label">
              {partial ? "tokens left" : left === 1 ? "credit left" : "credits left"}
            </span>
          </p>
          <p className="account-note">
            {partial ? (
              <>
                Under the {TOKENS_PER_TYPICAL_IMPORT.toLocaleString()} tokens a document usually
                takes, so this may not stretch to a whole one. It is still spendable, and a read
                that overshoots is allowed to finish.
              </>
            ) : (
              <>
                One credit has AI make a quiz from a document. Writing a sheet yourself, and
                anyone taking one, is always free.
              </>
            )}
          </p>
          <Link className="btn btn-primary" href="/topup" role="menuitem">
            {left === 0 && !partial ? "Top up to use AI" : "Top up"}
          </Link>
        </div>

        {/* Home, not back where they were. Signing out on a page that needs an
            account bounces straight to the sign-in screen, which reads as the
            sign-out having failed. */}
        <button
          className="account-out"
          type="button"
          role="menuitem"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
