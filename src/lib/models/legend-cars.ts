/**
 * Ported from GridBeat (Flutter) lib/features/learn/data/legend_cars.dart —
 * the Evolution chapter's car timeline, verbatim (name/year/blurb/winRate/
 * stats). The Flutter screen renders each car as a downloaded 3D model in a
 * WebView (`legend.html?car=id` served the same way `/car`'s anatomy viewer
 * is); that's genuinely mobile-only infrastructure (see CLAUDE.md's "3D Car
 * Viewer" note), not a data gap, so this port skips `id`/`approxBytes`
 * (GLB-only) and `/evolution` renders the same era facts as a 2D scrubbable
 * timeline instead — same "new desktop-first UI, not a pixel port" call
 * already made for the driver/constructor hero images.
 *
 * Ordered strictly chronologically, same as the source.
 */

export interface LegendCarStat {
  label: string;
  value: string;
}

export interface LegendCar {
  name: string;
  year: string;
  blurb: string;
  /** 0..1 share of races won that season. Null where win rate doesn't tell the story. */
  winRate: number | null;
  stats: LegendCarStat[];
  accent: string;
}

export const LEGEND_CARS: LegendCar[] = [
  {
    name: "Lotus 72",
    year: "1970–75",
    blurb:
      'The wedge with side-mounted radiators that set the visual template for the modern F1 car. If one silhouette marks "this is where cars started looking like cars," it\'s this.',
    winRate: null,
    stats: [
      { label: "Wins", value: "20 across six seasons" },
      { label: "Teaches", value: "Birth of the modern shape" },
    ],
    accent: "#E8A33D",
  },
  {
    name: "Lotus 88",
    year: "1981",
    blurb:
      "A twin-chassis car built to keep ground-effect suction after skirts were regulated. It never raced a full Grand Prix — the FIA banned it first.",
    winRate: null,
    stats: [
      { label: "Concept", value: "Twin chassis, ground effect" },
      { label: "Raced", value: "Excluded before a points race" },
      { label: "Teaches", value: "The rulebook fighting back" },
    ],
    accent: "#FFD700",
  },
  {
    name: "McLaren MP4/1",
    year: "1981–83",
    blurb:
      "The first carbon-fibre monocoque. Every survival cell since descends from it — the direct ancestor of modern crash safety.",
    winRate: null,
    stats: [
      { label: "Innovation", value: "Carbon monocoque" },
      { label: "Teaches", value: "Modern crash safety" },
    ],
    accent: "#FF8000",
  },
  {
    name: "McLaren MP4/4",
    year: "1988",
    blurb:
      "Senna and Prost in the same garage, Honda turbo power, 15 wins from 16 races. The turbo era's peak and the most famous teammate rivalry in the sport.",
    winRate: 0.938,
    stats: [
      { label: "Wins", value: "15 / 16" },
      { label: "Drivers", value: "Senna · Prost" },
    ],
    accent: "#FF8000",
  },
  {
    name: "Williams FW14B",
    year: "1992",
    blurb:
      "Active suspension, semi-automatic gearbox, traction control — a rolling computer that made the field look antique. Its best tricks are now explicitly banned.",
    winRate: null,
    stats: [
      { label: "Wins", value: "10 / 16" },
      { label: "Driver", value: "Mansell — 9 wins" },
      { label: "Teaches", value: "Banned driver aids" },
    ],
    accent: "#60A5FA",
  },
  {
    name: "Ferrari F2004",
    year: "2004",
    blurb:
      "The end of Schumacher's five-title run and the V10 era at full song. Several of its lap records stood for over a decade — newer doesn't automatically mean faster.",
    winRate: 0.833,
    stats: [
      { label: "Wins", value: "15 / 18" },
      { label: "Driver", value: "Schumacher — 7th title" },
    ],
    accent: "#DC0000",
  },
  {
    name: "Brawn BGP 001",
    year: "2009",
    blurb:
      "Honda walked away, the team was sold for a nominal sum, and it won both championships in its only season of existence. The best underdog story F1 has.",
    winRate: null,
    stats: [
      { label: "Wins", value: "8 / 17" },
      { label: "Driver", value: "Button" },
      { label: "Titles", value: "Both, first attempt" },
    ],
    accent: "#B8E62E",
  },
  {
    name: "Red Bull RB7",
    year: "2011",
    blurb:
      "Peak exhaust-blown diffuser — routing exhaust gas over aero surfaces to manufacture downforce. Bridges the Newey story between the Vettel and Verstappen eras.",
    winRate: null,
    stats: [
      { label: "Wins", value: "12 / 19" },
      { label: "Driver", value: "Vettel" },
    ],
    accent: "#1E41FF",
  },
  {
    name: "Mercedes W11",
    year: "2020",
    blurb:
      "The hybrid era's high-water mark. Carried DAS, a steering system so clever it was banned the following season — a one-object lesson in how F1 innovation gets legislated away.",
    winRate: 0.76,
    stats: [
      { label: "Wins", value: "13 / 17" },
      { label: "Driver", value: "Hamilton — 7th title" },
    ],
    accent: "#00D2BE",
  },
  {
    name: "Red Bull RB19",
    year: "2023",
    blurb:
      "The most dominant single season in the sport's history by win rate — it lost exactly one race all year. Ground effect fully mastered, the thing the Lotus 88 died trying to keep.",
    winRate: 0.955,
    stats: [
      { label: "Wins", value: "21 / 22" },
      { label: "Driver", value: "Verstappen" },
    ],
    accent: "#1E41FF",
  },
];
