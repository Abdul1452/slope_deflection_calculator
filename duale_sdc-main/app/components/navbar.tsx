/**
 * Navbar — app/components/navbar.tsx
 *
 * Fixed top navigation bar rendered in the root layout.
 *
 * Features:
 * - Slides in from the top on first render using Framer Motion.
 * - Highlights the active route (/beams or /frames) with an indigo underline.
 * - Theme toggle button: clicking cycles between "dark" and "light" using
 *   next-themes' setTheme. The Sun and Moon icons use CSS scale transforms
 *   to cross-fade in and out.
 * - Frosted glass appearance via `backdrop-blur-md` and a semi-transparent
 *   background colour.
 *
 * Uses `usePathname()` (Next.js App Router) to detect the current route.
 */
"use client";

import { motion } from "framer-motion";
import { Calculator, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Calculator className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-gray-900 dark:text-white">SDC</span>
          </Link>

          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-4">
              <Link
                href="/beams"
                className={`text-sm font-medium transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${
                  pathname === "/beams"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                Beams
              </Link>
              <Link
                href="/frames"
                className={`text-sm font-medium transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${
                  pathname === "/frames"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                Frames
              </Link>
            </nav>

            <button
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
