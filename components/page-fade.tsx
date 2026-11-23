"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.4, 0, 0.2, 1] as const;

export function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      {children}
    </motion.div>
  );
}
