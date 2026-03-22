"use client";

import { RunwayLogoIcon } from "@/components/runway-logo";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

const GREEN = "#166534";

export function ConnectCTA({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  function handleClick() {
    if (launching) return;
    setLaunching(true);
    setTimeout(() => router.push("/connect"), 750);
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
    >
      {label}
      <div className="relative size-4 shrink-0">
        <ArrowRight
          className={`size-4 absolute inset-0 transition-all duration-200 ${launching ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
        />
        <RunwayLogoIcon
          className={`size-4 absolute inset-0 ${launching ? "animate-logo-launch" : "opacity-0"}`}
        />
      </div>
    </button>
  );
}
