/* ============================================================
   THE LAW OF THE HALF TURN

   Every moving thing on this site obeys one rule, and the rule is read off
   the mark rather than borrowed from anywhere. Six numbers, all measured on
   the drawing:

     the arm        the mark's diagonals sit 4.18 degrees off true 45, so the
                    arm is 40.82 degrees. cos 0.756767, sin 0.653685,
                    1 / tan 1.157694.
     the turn       the counter maps onto itself at 22 of 22 vertices at a
                    half turn, at 29 of 52 at a quarter and at 32 of 52
                    mirrored. So 180 degrees is the only rotation the drawing
                    can make and come back identical.
     the centre     that half turn happens about 49.90% / 50.71% of the box,
                    which is where the drawing's real centre of rotation was
                    measured, not where the box's centre is.
     the stroke     7.178% of the box.
     the cut        3.589% of the box, exactly half the stroke.
     rest           1.

   THE LAW, IN FIVE SENTENCES.

   1. ONE ANGLE. Every displacement on this site lies on the mark's arm. Its
      two components are fixed at 0.756767 across and 0.653685 up, so every
      translate on the site reads |dy / dx| = 0.863786 and no other value.
      Which way along the arm is decided by where the thing is going: toward
      the frame's edge to leave, toward its resting place to arrive. There is
      no horizontal move, no vertical move and no third direction.

   2. ONE ROTATION, AND IT IS NEVER SCRUBBED. 180 degrees, about 49.90% /
      50.71%. Nothing on this site turns by any other amount or about any
      other point. And a half turn is always time-based, always the long
      duration, and always plays through in one go, because a scrubbed
      rotation is a rotation the reader can park at 90 degrees: the drawing
      maps onto itself at only 29 of 52 vertices there and reads as a
      different figure. Both ends of the turn are this mark. Nothing in
      between is, so nothing in between is allowed to be held.

   3. ONE LADDER OF DISTANCE. Six rungs, the mark's cut corner doubled five
      times: 0.3589, 0.7178, 1.4356, 2.8712, 5.7424 and 11.4848 rem, which is
      5.4px to 172.3px on the 1500px sheet. Every rung is exactly double the
      one below it, the way the stroke is exactly double the cut corner. A
      state change travels one rung; the rung is chosen by the size of the
      thing that moves and by nothing else.

   4. ONE LADDER OF TIME. Three rungs: 0.2041s, 0.4082s, 0.8164s. The base is
      the arm's own angle read in hundredths of a second, and it is halved and
      doubled on the same 2:1 the distances use. No other duration exists.

   5. ONE CURVE. cubic-bezier(0.0418, 0.8639, 0.4082, 1). Its four
      coordinates are the drawing's: the 4.18 degrees it departs from true 45,
      the tangent of the 40.82 degrees it actually sits at, that angle itself,
      and rest. Every transition and every timed tween is eased with it and
      with nothing else.

   TWO CONSEQUENCES, because they are where the law is easiest to break.

   A PLANE THAT SPANS ITS FRAME cannot travel the arm without opening a seam
   behind it, so it carries the arm as its EDGE instead of as its path: it
   crosses on one axis with its leading edge cut at 40.82 degrees, and the run
   is derived from the rise through 1.157694. The room change on the cover,
   the fill inside every pill and the cut corner of the portal plate are all
   that one move at three scales.

   A SCRUBBED SCENE HAS NO CURVE. The wheel is its clock, so every segment is
   linear and every join is a corner. There is no lerp, no smoothing and no
   inertia anywhere between the wheel and the frame. The curve belongs to
   time-based motion only.

   HOW TO CHECK ANY ANIMATION ON THIS SITE, IN ONE LINE. Read its transform:
   if it translates, dy / dx is 0.863786; if it rotates, it is 180 degrees
   about 49.90% / 50.71% and it is on a clock rather than on the wheel. Read
   its transition: the duration is 0.2041s, 0.4082s or 0.8164s and the curve
   is --curve. Anything else is a violation, and the correct repair is to
   delete the effect rather than to exempt it.

   WHERE THE NUMBERS LIVE. Here, and in the MOTION block of
   src/styles/tokens.css, which restates exactly these values as custom
   properties for the stylesheets. Nothing else in the system is allowed to
   name a duration, a distance, an angle or a curve.
   ============================================================ */

/** The mark's arm, in degrees. 45 less the drawing's measured 4.18. */
export const ARM = 40.82;

/** The two components of one unit travelled along the arm. */
export const ARM_X = 0.756767;
export const ARM_Y = 0.653685;

/** One unit of rise costs this much run at the arm's angle. 1 / tan(40.82). */
export const CUT_K = 1.157694;

/** The only rotation, and the only origin it may happen about. */
export const HALF_TURN = 180;
export const TURN_ORIGIN = '49.90% 50.71%';

/** The three durations, in seconds. Base halved and doubled. */
export const DUR_HALF = 0.2041;
export const DUR = 0.4082;
export const DUR_DOUBLE = 0.8164;

/** The six rungs of the distance ladder, in rem. */
export const RUNG = [0.3589, 0.7178, 1.4356, 2.8712, 5.7424, 11.4848] as const;

/**
 * One rung, resolved to its two pixel components along the arm.
 * Positive travels up the arm: right and up, so y comes back negative.
 */
export function travel(rung: number, rootPx = 15): { x: number; y: number } {
  const d = RUNG[rung] * rootPx;
  return { x: d * ARM_X, y: -d * ARM_Y };
}

/**
 * THE CURVE, as a function, so GSAP eases on exactly the same shape the
 * stylesheets do rather than on a named approximation of it. Newton is not
 * needed: eight bisection steps on x resolve a 60fps frame far finer than a
 * pixel, and this runs once per tween update at most.
 */
const P1X = 0.0418;
const P1Y = 0.8639;
const P2X = 0.4082;
const P2Y = 1;

const bez = (a: number, b: number, t: number): number => {
  const u = 1 - t;
  return 3 * a * t * u * u + 3 * b * t * t * u + t * t * t;
};

export function curve(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 16; i++) {
    const cx = bez(P1X, P2X, t);
    if (cx < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return bez(P1Y, P2Y, t);
}

/** The same curve spelled for CSS, for anything that has to write one inline. */
export const CURVE_CSS = `cubic-bezier(${P1X}, ${P1Y}, ${P2X}, ${P2Y})`;
