"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const AgentationComponent = dynamic(
  () => import("agentation").then((mod) => ({ default: mod.Agentation })),
  { ssr: false }
);

export function AgentationProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <AgentationComponent />;
}
