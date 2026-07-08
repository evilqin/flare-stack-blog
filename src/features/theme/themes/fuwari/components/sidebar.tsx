import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";
import { Tags, TagsSkeleton } from "./tags";

const MusicPlayer = lazy(() =>
  import("./music-player").then((mod) => ({ default: mod.MusicPlayer })),
);

function MusicPlayerSkeleton() {
  return (
    <div className="fuwari-card-base p-4">
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <div className="w-6 h-6 rounded-full bg-(--fuwari-btn-regular-bg) animate-pulse" />
        <div className="w-20 h-3 rounded bg-(--fuwari-btn-regular-bg) animate-pulse" />
      </div>
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <Profile />
      </div>
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "120ms" }}
      >
        <ClientOnly fallback={<MusicPlayerSkeleton />}>
          <Suspense fallback={<MusicPlayerSkeleton />}>
            <MusicPlayer />
          </Suspense>
        </ClientOnly>
      </div>
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{ animationDelay: "150ms" }}
      >
        <Suspense fallback={<TagsSkeleton />}>
          <Tags />
        </Suspense>
      </div>
    </aside>
  );
}
