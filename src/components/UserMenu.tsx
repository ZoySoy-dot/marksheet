"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import SignInButton from "@/components/SignInButton";
import { firstName, initial } from "@/lib/people";
import { useUsage } from "@/lib/useUsage";

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
            <span className="figure-num">{left ?? "—"}</span>
            <span className="figure-label">
              {left === 1 ? "credit left" : "credits left"}
            </span>
          </p>
          <p className="account-note">
            One credit has AI make a quiz from a document. Writing a sheet yourself, and anyone
            taking one, is always free.
          </p>
          <Link className="btn btn-primary" href="/topup" role="menuitem">
            {left === 0 ? "Top up to use AI" : "Top up"}
          </Link>
        </div>

        <button
          className="account-out"
          type="button"
          role="menuitem"
          onClick={() => signOut()}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
