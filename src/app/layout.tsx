import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Sidebar from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MountLift Ops",
  description: "Internal console for Creators, Brands, Campaigns and Finance.",
};

const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('mountlift-theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored ? stored : (systemDark ? 'dark' : 'light');
      document.documentElement.dataset.theme = theme;
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-screen font-sans md:flex">
          <Sidebar />
          <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 md:px-12 md:py-10 lg:px-16">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}