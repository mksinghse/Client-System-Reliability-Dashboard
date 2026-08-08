import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Client System Reliability Dashboard",
  description: "Enterprise client system reliability, hardware health, inventory, diagnostics, and comparison platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme-set="wdts-deepred-contrast" data-brand-token="teal" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("wdts.theme");var d=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="dark"||s==="light"?s:(d?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`,
          }}
        />
      </head>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
