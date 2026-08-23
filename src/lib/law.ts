/* ============================================================
   THE LAW OF THE SHORT ANSWER

   Every moving thing on this site obeys one rule, and the rule is read off
   the mark rather than borrowed from anywhere. The numbers are all measured
   on the drawing:

     the arm        the mark's diagonals sit 4.18 degrees off true 45, so the
                    arm is 40.82 degrees. cos 0.756767, sin 0.653685.
     the turn       the counter maps onto itself at 22 of 22 vertices at a
                    half turn, at 29 of 52 at a quarter and at 32 of 52
                    mirrored. So 180 degrees is the only rotation the drawing
                    can make and come back identical.
     the centre     that half turn happens about 49.90% / 50.71% of the box,
                    which is where the drawing's real centre of rotation was
                    measured, not where the box's centre is.
     the stroke     7.178% of the box.
     the cut        3.589% of the box, exactly half the stroke.

   WHAT CHANGED, AND WHY. The previous law was the same six numbers driving a
   different kind of motion: objects were scrubbed against the scroll wheel
   across whole viewports, a mark travelled the page, a dial swung, a plane
   grew. The ladder of distance ran to 172px and the ladder of time to 816ms.
   That vocabulary was judged and rejected, and the verdict was right: a
   reader cannot park a fade at 40 percent, but a scrubbed object is exactly
   that, an animation with the wheel as its clock, and every reference this
   site is measured against refuses to build one.

   The numbers did not change. The RANGE did. The ladders are cut short at
   both ends and the wheel is taken off the clock entirely. What is left is a
   page that holds still and answers the pointer.

   THE LAW, IN SIX SENTENCES.

   1. ONE ANGLE. Every displacement on this site lies on the mark's arm. Its
      two components are fixed at 0.756767 across and 0.653685 up, so every
      translate on the site reads |dy / dx| = 0.863786 and no other value.
      Up the arm is right and up, and it is where the light is; down the arm
      is left and down. A surface answering a pointer goes up it. A surface
      arriving comes up it to rest. There is no horizontal move, no vertical
      move and no third direction.

   2. ONE LADDER OF DISTANCE, AND IT IS SHORT. Three rungs, the mark's cut
      corner doubled twice: 0.3589, 0.7178 and 1.4356 rem, which is 5.4px,
      10.8px and 21.5px on the 15px root. Every rung is exactly double the one
      below it, the way the stroke is exactly double the cut corner. Nothing
      on this site moves further than 21.5px. The three rungs above these,
      43px, 86px and 172px, are deleted along with every object that used
      them, because a distance that large is an object travelling and not a
      material responding.

      THE ONE EXEMPTION, AND IT IS STATED RATHER THAN HIDDEN. A thing that
      has to CLEAR THE FRAME cannot use a rung, because a rung is 21.5px and a
      header that stops 21.5px up is a header still covering the first line of
      the page. Two objects are in that position and both carry the arm as a
      shape rather than as a path: the header, whose travel is its own height
      with the run derived through 1 / tan(40.82); and any plane whose leading
      EDGE is cut at 40.82 degrees rather than travelling it, which is the
      chamfer on the portal plate, the fill inside a pill and the cut corner
      on an interior document. Every one of those still reads 0.863786. The
      exemption is to the LADDER, never to the angle.

   3. ONE LADDER OF TIME, AND IT IS SHORT. Two rungs: 0.2041s and 0.4082s.
      The base is the arm's own angle read in hundredths of a second and the
      other rung is double it. A surface answering the pointer takes the short
      rung; a surface opening or closing takes the long one. 0.8164s is
      deleted: past about 600ms a response stops reading as the material
      moving and starts reading as an animation being played at you.

   4. ONE CURVE. cubic-bezier(0.0418, 0.8639, 0.4082, 1). Its four
      coordinates are the drawing's: the 4.18 degrees it departs from true 45,
      the arm's own slope of 0.863786, the 40.82 degree angle itself, and
      rest. It leaves fast and settles slowly, which is what a real surface
      does. Every transition and every timed tween is eased with it and with
      nothing else. Nothing is ever eased linearly.

   5. ONE ROTATION, AND IT HAPPENS IN ONE PLACE. 180 degrees about 49.90% /
      50.71%, on the menu control, on click. The drawing maps onto itself at a
      half turn and at no other angle: at a quarter turn only 29 of its 52
      vertices land and it reads as a different figure. So a half turn is the
      only rotation it can make, it is always time-based, and it always plays
      through in one go. Both ends of the turn are this mark and nothing in
      between is, so nothing in between may be held.

   6. NOTHING IS SCRUBBED. There is no scroll-linked transform, opacity,
      scale, rotation or clip anywhere on this site. The wheel is not a clock.
      Scroll is allowed to change exactly one thing and it is a boolean: on
      screen or not, past the head or not. A boolean has no intermediate state
      to park at, which is the entire difference.

   HOW TO CHECK ANY ANIMATION ON THIS SITE, IN ONE LINE. Read its transform:
   if it translates, dy / dx is 0.863786 and the distance is 5.4, 10.8 or
   21.5px, or the thing is clearing the frame and the distance is its own box;
   if it rotates, it is 180 degrees about 49.90% / 50.71% and it was started
   by a click. Read its transition: the duration is 0.2041s or
   0.4082s and the curve is --curve. Read what started it: a pointer, a focus,
   a click, or a boolean crossing. Anything else is a violation, and the
   correct repair is to delete the effect rather than to exempt it.

   WHERE THE NUMBERS LIVE. Here, and in the MOTION block of
   src/styles/tokens.css, which restates exactly these values as custom
   properties for the stylesheets. Nothing else in the system is allowed to
   name a duration, a distance, an angle or a curve.
   ============================================================ */

/** The mark's arm, in degrees. 45 less the drawing's measured 4.18. */
export const ARM = 40.82;

/** One unit of rise costs this much run at the arm's angle. 1 / tan(40.82).
    The exempt objects in clause 2 derive their run from their own rise
    through this, which is how they stay on the arm without using a rung. */
export const CUT_K = 1.157694;

/** The two components of one unit travelled along the arm. */
export const ARM_X = 0.756767;
export const ARM_Y = 0.653685;

/** The only rotation, and the only origin it may happen about. */
export const HALF_TURN = 180;
export const TURN_ORIGIN = '49.90% 50.71%';

/** The two durations, in seconds. The arm's angle in hundredths, and double. */
export const DUR = 0.2041;
export const DUR_DOUBLE = 0.4082;

/**
 * The three rungs of the distance ladder, in rem: the mark's cut corner
 * doubled twice. 5.4px, 10.8px and 21.5px against the 15px root.
 */
export const RUNG = [0.3589, 0.7178, 1.4356] as const;

/**
 * One rung, resolved to its two pixel components along the arm.
 * Positive travels UP the arm, which is right and up, so y comes back
 * negative. This is the only function on the site that may produce a distance.
 */
export function travel(rung: number, rootPx = 15): { x: number; y: number } {
  const d = RUNG[rung] * rootPx;
  return { x: d * ARM_X, y: -d * ARM_Y };
}

/**
 * THE CURVE, as a function, so any scripted tween eases on exactly the same
 * shape the stylesheets do rather than on a named approximation of it.
 * Sixteen bisection steps on x resolve a 60fps frame far finer than a pixel.
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
