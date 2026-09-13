import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Masthead from "@/components/Masthead";
import ClaimOnSignIn from "@/components/ClaimOnSignIn";
import SessionProvider from "@/components/SessionProvider";
import ThemeToggle from "@/components/ThemeToggle";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** Only the text box and the format examples. Never the interface. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Marksheet: turn plain text into a quiz",
    template: "%s · Marksheet",
  },
  description: "Paste your questions as plain text. Get an interactive quiz you can share with a link.",
};

/** Sets the theme before first paint so the page never flashes the wrong one. */
const themeScript = `(function(){try{var t=localStorage.getItem("marksheet.theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionProvider>
          <ClaimOnSignIn />
          <a className="skip" href="#main">Skip to content</a>
          <Masthead />
          <main id="main">{children}</main>
          <footer className="footer">
            <p>Marksheet grades in your browser. Your answers are never stored.</p>
            <ThemeToggle />
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
