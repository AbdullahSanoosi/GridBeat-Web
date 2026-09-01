/**
 * A speed / throttle / brake trace for one lap of Monza — the same three
 * channels the app's own Telemetry Compare screen plots
 * (lib/features/live_timing/presentation/widgets/telemetry_compare.dart).
 *
 * NOT captured from a session. Derived from the circuit's real centreline
 * geometry: MultiViewer's full-resolution Monza path (752 points) resampled
 * to 260 evenly-spaced stations, local corner radius taken as the
 * circumradius of each station and its neighbours, converted to metres
 * against the real 5,793 m lap length, then run through a vehicle model —
 * a lateral-grip cornering limit, a backward braking pass and a forward
 * traction-limited acceleration pass. That asymmetry (sharp decel, gradual
 * accel) is what makes the shape read as real telemetry rather than a
 * smooth wave.
 *
 * Sanity: 350 km/h peak, 153 km/h minimum, 73.0 s modelled lap against a
 * real Monza pole of ~79–81 s — fast, because a centreline ignores kerbs
 * and the racing line. Presented as a model, never as a real driver's lap.
 */

export const LAP_LENGTH_M = 5793;
export const CIRCUIT_NAME = "MONZA";

export const SPEED_KMH: number[] = [
  345, 348, 349, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350,
  350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 341, 311, 264,
  211, 177, 166, 155, 153, 166, 180, 193, 204, 215, 224, 233, 241, 249, 256, 263, 269, 275, 281, 286,
  291, 296, 301, 306, 310, 314, 318, 322, 325, 329, 332, 336, 339, 342, 345, 348, 349, 350, 350, 350,
  350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 348, 335, 299, 247, 204, 194, 198, 198, 203,
  213, 223, 232, 240, 248, 255, 262, 268, 274, 280, 278, 256, 224, 207, 203, 206, 214, 224, 233, 241,
  249, 256, 262, 269, 275, 281, 277, 249, 212, 198, 204, 214, 224, 233, 241, 249, 256, 263, 269, 275,
  281, 286, 291, 296, 301, 305, 310, 314, 318, 322, 325, 329, 332, 336, 339, 342, 345, 348, 349, 350,
  350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 341, 312, 265, 222, 204, 209, 219,
  228, 237, 245, 252, 259, 257, 246, 245, 252, 259, 265, 272, 278, 283, 288, 293, 298, 303, 307, 312,
  316, 320, 323, 327, 330, 334, 337, 340, 343, 346, 348, 350, 350, 350, 350, 350, 350, 350, 350, 350,
  350, 350, 350, 350, 350, 350, 348, 335, 299, 254, 219, 202, 199, 206, 215, 225, 234, 242, 249, 256,
  263, 269, 275, 281, 287, 292, 297, 301, 306, 310, 314, 318, 322, 326, 329, 333, 336, 339, 342,
];

export const THROTTLE_PCT: number[] = [
  100, 100, 100, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85,
  85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 0, 0, 0, 0, 0, 0, 0, 0, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 100, 100, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 0, 0,
  0, 0, 0, 0, 100, 85, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 0, 0, 0, 0, 0, 100,
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 0, 0, 0, 0, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 0, 0, 0, 0, 0, 100, 100, 100,
  100, 100, 100, 100, 0, 0, 0, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85,
  85, 85, 85, 0, 0, 0, 0, 0, 0, 0, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
];

export const BRAKE_PCT: number[] = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 21, 70, 100, 97, 50, 14, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33, 83, 100,
  73, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 57, 27, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  8, 54, 63, 21, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 21, 69, 100, 81, 27, 0, 0, 0, 0, 0, 0, 0, 0, 19, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 33, 83, 94, 62, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0,
];

/**
 * Real Monza corner names at their measured position along the lap. Each
 * one lines up with a braking event in BRAKE_PCT above — the model found
 * the corners on its own, they weren't placed by hand.
 */
export const CORNERS: { at: number; label: string }[] = [
  { at: 0.15, label: "T1 RETTIFILO" },
  { at: 0.36, label: "ROGGIA" },
  { at: 0.43, label: "LESMO 1" },
  { at: 0.49, label: "LESMO 2" },
  { at: 0.69, label: "ASCARI" },
  { at: 0.87, label: "PARABOLICA" },
];

/** Marshalling sector boundaries as a fraction of the lap. */
export const SECTOR_BOUNDS = [0, 0.34, 0.66, 1];
