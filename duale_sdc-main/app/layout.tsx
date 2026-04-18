/**
 * Root Layout — app/layout.tsx
 *
 * This is the single top-level layout that wraps every route in the app.
 * It:
 *   - Loads the Inter variable font from Google Fonts.
 *   - Wraps the page tree in <ThemeProvider> to enable light/dark/system themes.
 *   - Renders the fixed <Navbar> above all page content.
 *   - Applies pt-16 (64 px top padding) to <main> so content is not hidden
 *     behind the fixed navbar.
 *
 * suppressHydrationWarning on <html> is required by next-themes to suppress
 * the React hydration mismatch that occurs when the theme class is set
 * server-side vs. client-side.
 */
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/app/components/navbar";
import { ThemeProvider } from "@/app/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Duale-SDC",
  description: "Calculate beams & frames",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="pt-16">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
