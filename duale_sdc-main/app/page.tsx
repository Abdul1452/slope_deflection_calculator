"use client";

import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Calculator, CheckCircle, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Background Patterns */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <motion.div
          style={{ y }}
          className="absolute inset-0 opacity-30 dark:opacity-20"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,#e5e7eb,transparent)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/30 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Calculator className="mx-auto h-16 w-16 text-indigo-600 dark:text-indigo-400" />
          </motion.div>

          <h1 className="mt-8 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Slope Deflection Calculator
          </h1>

          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            A powerful tool for structural engineers to calculate beam
            deflections and moments using the slope deflection method.
          </p>

          <div className="mt-10 flex items-center justify-center gap-6">
            <Link href="/beams">
              <Button>Beams</Button>
            </Link>
            <Link href="/frames">
              <Button>Frames</Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative rounded-2xl bg-white/80 dark:bg-gray-800/80 p-8 shadow-lg ring-1 ring-gray-200/50 dark:ring-gray-700/50 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/50 dark:to-purple-950/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <feature.icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                  {feature.name}
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

const features = [
  {
    name: "Easy to Use",
    description:
      "Simple and intuitive interface for quick calculations of slope deflection problems.",
    icon: CheckCircle,
  },
  {
    name: "Instant Results",
    description:
      "Get immediate results for your structural engineering calculations with real-time updates.",
    icon: Zap,
  },
  {
    name: "Time Saving",
    description:
      "Save hours of manual calculations with our automated and efficient solution.",
    icon: Clock,
  },
];
