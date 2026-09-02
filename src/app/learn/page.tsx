import Link from "next/link";
import { Check } from "lucide-react";
import { LESSONS, type Lesson } from "@/lib/models/lessons";

/**
 * Ports learn_screen.dart — the learning path hub, seven chapters in
 * dependency order. The chapter number is load-bearing, not decorative:
 * jumping to Evolution before Anatomy has no vocabulary to hang it on.
 */
export default function LearnPage() {
  const readyCount = LESSONS.filter((l) => l.status === "ready").length;

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-[var(--font-f1)] text-2xl font-bold">Learn F1</h1>
      <p className="mt-3 max-w-xl text-2xl leading-tight font-bold tracking-tight">
        Start with the car, end with the race.
      </p>
      <p className="mt-2 max-w-xl text-sm text-(--color-text-secondary)">
        Seven chapters, in order. Each one assumes the last, so working through them beats jumping around.
      </p>

      <ProgressStrip ready={readyCount} total={LESSONS.length} />

      <div className="mt-6 flex flex-col gap-2.5">
        {LESSONS.map((lesson) => (
          <LessonCard key={lesson.number} lesson={lesson} />
        ))}
      </div>
    </main>
  );
}

function ProgressStrip({ ready, total }: { ready: number; total: number }) {
  return (
    <div className="mt-5 flex max-w-xl items-center gap-3">
      <div className="flex flex-1 gap-1">
        {LESSONS.map((l, i) => (
          <div
            key={l.number}
            className="h-[3px] flex-1 rounded-full"
            style={{ backgroundColor: i < ready ? l.accent : "var(--color-border)" }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[10px] font-bold tracking-[0.12em] text-(--color-text-muted)">
        {ready} / {total} READY
      </span>
    </div>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const enabled = lesson.status === "ready" && lesson.route != null;
  const badge = lesson.status === "comingSoon" ? "SOON" : lesson.status === "mobileOnly" ? "MOBILE APP" : null;

  const body = (
    <div
      className={`flex items-start gap-3.5 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-4 transition-colors ${
        enabled ? "hover:border-(--color-primary)" : ""
      }`}
      style={{ opacity: enabled ? 1 : 0.6 }}
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${lesson.accent} 13%, transparent)` }}
        >
          <lesson.icon className="h-5 w-5" style={{ color: lesson.accent }} strokeWidth={2} aria-hidden="true" />
        </div>
        <span className="font-mono text-[11px] font-bold text-(--color-text-muted)">
          {String(lesson.number).padStart(2, "0")}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[17px] font-bold tracking-tight">{lesson.title}</span>
          {badge && (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-wide text-(--color-text-muted)" style={{ backgroundColor: "var(--color-border)" }}>
              {badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[12.5px] font-semibold" style={{ color: lesson.accent }}>
          {lesson.subtitle}
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-(--color-text-secondary)">{lesson.blurb}</p>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-(--color-text-muted)">
          <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{lesson.payoff}</span>
          {enabled && <span className="shrink-0 text-(--color-text-muted)">›</span>}
        </div>
      </div>
    </div>
  );

  return enabled ? (
    <Link href={lesson.route!} className="block">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
