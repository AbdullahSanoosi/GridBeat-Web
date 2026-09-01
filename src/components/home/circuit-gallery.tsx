"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * The Circuit Guide, shown with the app's own circuit artwork
 * (assets/images/circuit_*.png, copied into public/circuits) and its own
 * curated facts (lib/features/schedule/data/circuit_facts.dart). Every
 * value here is from that file — lap records are official race records.
 */

interface Circuit {
  id: string;
  /** Explicit 3-letter code — slicing the id collides Monza with Monaco. */
  short: string;
  name: string;
  city: string;
  country: string;
  km: string;
  laps: string;
  turns: string;
  topSpeed: string;
  drs: number;
  firstGp: number;
  overtaking: number;
  best: string;
  character: string[];
  record: [string, string, string];
  mostWins: string;
  accent: string;
}

const CIRCUITS: Circuit[] = [
  {
    id: "spa", short: "SPA", name: "SPA-FRANCORCHAMPS", city: "Stavelot", country: "Belgium",
    km: "7.004", laps: "44", turns: "19", topSpeed: "340", drs: 2, firstGp: 1950, overtaking: 5,
    best: "Eau Rouge → Raidillon", character: ["LONG-LAP", "ELEVATION", "WEATHER-CHAOS"],
    record: ["Valtteri Bottas", "1:46.286", "2018"], mostWins: "Michael Schumacher (6)", accent: "#00CC00",
  },
  {
    id: "monza", short: "MNZ", name: "MONZA", city: "Monza", country: "Italy",
    km: "5.793", laps: "53", turns: "11", topSpeed: "360", drs: 2, firstGp: 1950, overtaking: 4,
    best: "Curva Grande + Della Roggia", character: ["LOW-DOWNFORCE", "ULTRA-HIGH-SPEED", "HERITAGE"],
    record: ["Rubens Barrichello", "1:21.046", "2004"], mostWins: "Michael Schumacher (5)", accent: "#E80020",
  },
  {
    id: "monaco", short: "MCO", name: "MONACO", city: "Monte Carlo", country: "Monaco",
    km: "3.337", laps: "78", turns: "19", topSpeed: "300", drs: 1, firstGp: 1950, overtaking: 1,
    best: "Swimming Pool complex", character: ["STREET-CIRCUIT", "NO-OVERTAKING", "PRECISION"],
    record: ["Lewis Hamilton", "1:12.909", "2021"], mostWins: "Ayrton Senna (6)", accent: "#FFD600",
  },
  {
    id: "suzuka", short: "SUZ", name: "SUZUKA", city: "Suzuka", country: "Japan",
    km: "5.807", laps: "53", turns: "18", topSpeed: "325", drs: 2, firstGp: 1987, overtaking: 3,
    best: "The Esses (Turns 3–7)", character: ["DRIVERS-FAVOURITE", "FLOWING", "HIGH-COMMITMENT"],
    record: ["Lewis Hamilton", "1:30.983", "2019"], mostWins: "Michael Schumacher (6)", accent: "#BF00FF",
  },
  {
    id: "silverstone", short: "SIL", name: "SILVERSTONE", city: "Silverstone", country: "United Kingdom",
    km: "5.891", laps: "52", turns: "18", topSpeed: "330", drs: 2, firstGp: 1950, overtaking: 4,
    best: "Maggotts–Becketts–Chapel (S1)", character: ["HIGH-SPEED", "HERITAGE", "HIGH-G"],
    record: ["Max Verstappen", "1:27.097", "2020"], mostWins: "Lewis Hamilton (9)", accent: "#2979FF",
  },
  {
    id: "interlagos", short: "INT", name: "INTERLAGOS", city: "São Paulo", country: "Brazil",
    km: "4.309", laps: "71", turns: "15", topSpeed: "335", drs: 2, firstGp: 1973, overtaking: 4,
    best: "Senna S (Turns 1–2)", character: ["ANTICLOCKWISE", "WEATHER-CHAOS", "DRAMATIC"],
    record: ["Valtteri Bottas", "1:10.540", "2018"], mostWins: "Michael Schumacher / Alain Prost (6)", accent: "#27F4D2",
  },
];

export function CircuitGallery() {
  const [active, setActive] = useState(0);
  const c = CIRCUITS[active];
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-white/10 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-lg">
          <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.26em] text-(--color-sector-yellow)">
            CIRCUIT GUIDE
          </span>
          <h2 className="mt-3 font-[var(--font-f1)] text-3xl font-bold sm:text-5xl">Know the track</h2>
          <p className="mt-3 text-sm text-(--color-text-secondary)">
            Every venue on the calendar, with the numbers that actually shape the race — and the corner worth staying up
            for.
          </p>
        </div>

        {/* Selector */}
        <div className="mt-10 -mx-6 overflow-x-auto px-6 pb-2">
          <div className="flex gap-3">
            {CIRCUITS.map((circ, i) => (
              <button
                key={circ.id}
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className="group shrink-0 rounded-xl border p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                style={{
                  borderColor: i === active ? circ.accent : "rgb(255 255 255 / 0.1)",
                  backgroundColor: i === active ? `color-mix(in srgb, ${circ.accent} 10%, transparent)` : "transparent",
                }}
              >
                <Image
                  src={`/circuits/circuit_${circ.id}.png`}
                  alt=""
                  width={64}
                  height={64}
                  className="h-14 w-14 object-contain transition-opacity"
                  style={{ opacity: i === active ? 1 : 0.42 }}
                />
                <span
                  className="mt-1.5 block text-center font-[var(--font-f1)] text-[9px] font-bold tracking-wider"
                  style={{ color: i === active ? circ.accent : "var(--color-text-muted)" }}
                >
                  {circ.short}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="mt-6 grid gap-8 rounded-2xl border border-white/10 bg-(--color-surface)/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,340px)_1fr]">
          <AnimatePresence mode="wait">
            <motion.div
              key={c.id}
              initial={reduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto flex w-full max-w-[320px] items-center justify-center"
            >
              <div
                className="absolute inset-0 rounded-full blur-3xl"
                style={{ background: `color-mix(in srgb, ${c.accent} 22%, transparent)` }}
              />
              <Image
                src={`/circuits/circuit_${c.id}.png`}
                alt={`${c.name} circuit layout`}
                width={320}
                height={320}
                className="relative w-full max-w-[300px] object-contain"
                priority={active === 0}
              />
            </motion.div>
          </AnimatePresence>

          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h3 className="font-[var(--font-f1)] text-2xl font-bold sm:text-3xl" style={{ color: c.accent }}>
                {c.name}
              </h3>
              <span className="text-sm text-(--color-text-secondary)">
                {c.city}, {c.country}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.character.map((t) => (
                <span
                  key={t}
                  className="rounded-full border px-2.5 py-0.5 font-[var(--font-f1)] text-[9px] font-bold tracking-wider"
                  style={{ borderColor: `color-mix(in srgb, ${c.accent} 40%, transparent)`, color: c.accent }}
                >
                  {t}
                </span>
              ))}
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-5">
              <Fact label="LENGTH" value={c.km} unit="km" />
              <Fact label="LAPS" value={c.laps} />
              <Fact label="TURNS" value={c.turns} />
              <Fact label="TOP SPEED" value={c.topSpeed} unit="km/h" />
              <Fact label="DRS ZONES" value={String(c.drs)} />
            </dl>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <div className="font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted)">
                  OVERTAKING
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="h-1.5 w-6 rounded-full"
                        style={{ backgroundColor: n <= c.overtaking ? c.accent : "rgb(255 255 255 / 0.12)" }}
                      />
                    ))}
                  </div>
                  <span className="text-xs tabular-nums text-(--color-text-secondary)">{c.overtaking}/5</span>
                </div>
              </div>
              <div>
                <div className="font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted)">
                  FIRST GRAND PRIX
                </div>
                <div className="mt-1.5 font-[var(--font-f1)] text-lg font-bold tabular-nums">{c.firstGp}</div>
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
              <Row label="Lap record">
                <span className="tabular-nums text-white">{c.record[1]}</span>{" "}
                <span className="text-(--color-text-muted)">
                  {c.record[0]}, {c.record[2]}
                </span>
              </Row>
              <Row label="Best sector">{c.best}</Row>
              <Row label="Most wins">{c.mostWins}</Row>
            </div>

            <Link
              href="/circuits"
              className="mt-6 inline-block rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold tracking-wide transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Explore all circuits
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dd className="font-[var(--font-f1)] text-xl font-bold tabular-nums sm:text-2xl">
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-medium text-(--color-text-muted)">{unit}</span>}
      </dd>
      <dt className="mt-0.5 font-[var(--font-f1)] text-[9px] tracking-[0.14em] text-(--color-text-muted)">{label}</dt>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3">
      <span className="w-24 shrink-0 text-(--color-text-muted)">{label}</span>
      <span className="min-w-0 text-(--color-text-secondary)">{children}</span>
    </div>
  );
}
