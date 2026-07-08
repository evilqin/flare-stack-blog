import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { MusicPlayer } from "./music-player";
import { Profile } from "./profile";
import { RandomQuote } from "./random-quote";
import { Tags, TagsSkeleton } from "./tags";

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
        <MusicPlayer />
      </div>
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "135ms" }}
      >
        <RandomQuote />
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
