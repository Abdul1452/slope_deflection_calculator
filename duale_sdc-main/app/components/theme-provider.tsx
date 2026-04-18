/**
 * ThemeProvider — app/components/theme-provider.tsx
 *
 * A thin wrapper around NextThemesProvider from the `next-themes` library.
 *
 * Purpose of the wrapper:
 *   The root layout (app/layout.tsx) is a Server Component, but
 *   NextThemesProvider requires `"use client"`.  Extracting it here
 *   keeps the Server Component boundary clean while giving the layout
 *   full declarative control over the theme configuration props.
 *
 * Props are forwarded verbatim, so the layout can set:
 *   attribute="class"   — Adds the "dark"/"light" class to <html>
 *   defaultTheme="system" — Respects the OS preference by default
 *   enableSystem        — Allows the "system" theme
 *   disableTransitionOnChange — Prevents flashes during theme changes
 */
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
