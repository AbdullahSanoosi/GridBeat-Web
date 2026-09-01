/**
 * Ported from GridBeat (Flutter) lib/features/learn/data/lessons.dart —
 * the Learn F1 hub's seven chapters, in the order each assumes the
 * vocabulary of the one before it.
 *
 * Three chapters (Anatomy, Rubber, Airflow) route to `/car`, `/tyres`,
 * `/car-airflow` in the Flutter app — all three are the same hardened
 * WebView shell (`CarViewerScreen`) rendering a downloaded 3D model, not a
 * data-driven screen with a web equivalent to port. `status: "mobileOnly"`
 * says so plainly on the hub instead of linking to a route that doesn't
 * exist here — same "tell the truth about what's finished" principle the
 * original file's own doc comment states, just applied to a platform gap
 * instead of a not-yet-built one.
 */

export type LessonStatus = "ready" | "comingSoon" | "mobileOnly";

export interface Lesson {
  number: number;
  title: string;
  subtitle: string;
  blurb: string;
  icon: string;
  accent: string;
  status: LessonStatus;
  route: string | null;
  payoff: string;
}

export const LESSONS: Lesson[] = [
  {
    number: 1,
    title: "Anatomy",
    subtitle: "What am I looking at?",
    blurb:
      "Every major part of a modern F1 car and what it actually does. Start here — nothing later makes sense without the vocabulary.",
    icon: "\u{1F3CE}\u{FE0F}",
    accent: "#22D3EE",
    status: "mobileOnly",
    route: null,
    payoff: "Name every part on the grid",
  },
  {
    number: 2,
    title: "Rubber",
    subtitle: "Why tyres decide races",
    blurb:
      "The three dry compounds side by side. Tyre choice explains more race outcomes than anything else, and it is the thing new viewers most often miss.",
    icon: "\u{1F6DE}",
    accent: "#FFD42A",
    status: "mobileOnly",
    route: null,
    payoff: "Follow pit strategy",
  },
  {
    number: 3,
    title: "Airflow",
    subtitle: "Why the car is shaped like that",
    blurb:
      "Downforce against drag, and the trade every team makes each weekend. Includes why a following car loses grip in dirty air.",
    icon: "\u{1F4A8}",
    accent: "#7DD3FC",
    status: "mobileOnly",
    route: null,
    payoff: "Understand why overtaking is hard",
  },
  {
    number: 4,
    title: "Evolution",
    subtitle: "How we got here",
    blurb:
      "A scrubbable timeline of the cars that changed the sport — from the wedge-shaped Lotus 72 to the most dominant season ever recorded. Includes the 1981 Lotus 88, twin-chassis and banned before it raced.",
    icon: "\u{23F1}\u{FE0F}",
    accent: "#E8A33D",
    status: "ready",
    route: "/evolution",
    payoff: "Read a car's era from its shape",
  },
  {
    number: 5,
    title: "Dominance",
    subtitle: 'What "great" actually means',
    blurb:
      "Win rates, pole rates and margins put numbers behind the reverence, so you can compare eras instead of taking anyone's word for it.",
    icon: "\u{1F3C6}",
    accent: "#FFD700",
    status: "comingSoon",
    route: null,
    payoff: "Argue the GOAT case with evidence",
  },
  {
    number: 6,
    title: "Penalties",
    subtitle: "Why did they get that?",
    blurb:
      "The rules that actually get broken, ordered by how often they really are, each with real incidents the stewards ruled on. Half of watching a race is knowing what just happened and why it cost someone.",
    icon: "\u{2696}\u{FE0F}",
    accent: "#EF4444",
    status: "ready",
    route: "/learn/penalties",
    payoff: "Know what the stewards just did",
  },
  {
    number: 7,
    title: "Race Day",
    subtitle: "Putting it together",
    blurb:
      "Weekend format, qualifying and the strategic picture in real time — where the lessons hand off to live timing and the rest of the app.",
    icon: "\u{1F3C1}",
    accent: "#B52400",
    status: "ready",
    route: "/live",
    payoff: "Watch a race and follow the story",
  },
];
