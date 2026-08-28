/* ============================================================
   XStudioz: the optical scene

   THE SENTENCE. A single structural rule crosses the reserved field. A
   precision plate lies along it, a little above the paper, with its leading
   end cut on the mark's own 40.82 degrees. The rule bends into the glass at
   that cut, runs the whole length of the plate displaced from its own line,
   and bends back out at the square end.

   THE SUBJECT IS THE CROSSING. Not the plate, which is a few levels of ink
   on its own, and not the rule, which is a hairline. What is on the page is
   the EVIDENCE that the material has depth. The mark is not in this scene,
   in any form, at any scale.

   THREE SHAPES WERE BUILT AND TWO WERE THROWN AWAY, and the reasons are
   worth keeping because each one is a way this could still go wrong.

     A BAND at the arm's angle running off all four sides. It covered half
     the field and read as a grey slab; the crossing was a notch in it.
     A ROTATED RECTANGLE at the arm's angle. Better, but the rule crossed a
     short chord near one end and most of the object had nothing under it.
     A PARALLELOGRAM with both ends raked. The crossing was perfect and the
     silhouette was wrong: a sheared horizontal quad with a shadow beneath it
     is the canonical shape of a flat plane seen in perspective, which is the
     one thing the scene may not look like.

   WHAT IS HERE is square to the page on three sides, so it agrees with the
   grid the whole composition is built on, and cut on the brand's angle
   exactly where the crossing begins. Orthogonal where the page is
   orthogonal, angled where the brand is.

   ------------------------------------------------------------
   TWO MESHES, TWO DRAW CALLS, AND WHY IT IS NOT ONE

   It could be one. The whole picture fits in a single fragment shader on a
   single quad, and that would be cheaper. It is two because the second mesh
   is the only honest source of the thing the scene has to prove.

     THE GROUND, at z = 0, sized so it exactly fills the frustum. It draws
     the rule, it withholds the rule wherever the plate covers it, and it
     carries the plate's contact shadow.

     THE PLATE, floating 26px above the ground and tilted nine degrees. It is
     a real object at a real distance under a real perspective camera, so it
     is magnified very slightly, its edges converge very slightly, and when
     the pointer tilts it the rule underneath moves by an amount the geometry
     decides rather than by an amount a number chose. Measured: 3.83 CSS
     pixels between the two ends of the pointer's travel.

   NO RENDER TARGET, NO SECOND PASS, NO POST-PROCESSING. The plate does not
   sample a texture of the ground; it evaluates the SAME rule function the
   ground evaluates, at the point its refracted ray lands. The background is
   analytic, so there is nothing to render to and nothing to blur.

   ------------------------------------------------------------
   THE OPTICS, AND WHICH PART OF THEM IS EXAGGERATED

   The refraction is a slab: the ray from the camera enters the plate, bends
   by Snell at eta = 1/1.5, crosses an optical thickness, and leaves parallel
   to the way it came, laterally displaced. Everything about that is real
   except the thickness, which is 150px rather than the two or three the
   plate would actually be. At true thickness the displacement is a third of
   a pixel and the scene has nothing to show. That is the one liberty taken
   and it is stated here rather than buried.

   THE EDGE IS WHERE ALL THREE MATERIAL CUES COME FROM, and none of them is
   drawn as a stroke. Real precision optics are not sharp at the boundary;
   they carry a polished chamfer, and they are not flat slabs either. So two
   different profiles run inward from every edge:

     THE CHAMFER, 7px, rolls the normal outward. It is narrow because a
     polished edge is narrow and a wide one reads as a rounded lozenge.
     THE OPTICAL RAMP, 30px, takes the thickness from zero to full. It is
     four times the chamfer because the plate is very slightly convex, which
     is what an optical element is.

   From those two:

     THE BEND        thickness reaching zero at the boundary turns the
                     displacement into a curve instead of a step. The rule
                     eases into its offset over 46px of run at the raked end
                     and 30px at the square one. Tied to the chamfer instead,
                     it was a 9px drop over 10.7px, which read as a broken
                     line.
     THE FRESNEL     a normal rolled to sixty-six degrees is at a grazing
                     angle to the camera, so the standard Fresnel term lights
                     the chamfer and nothing else. A consequence, not a
                     stroke.
     THE CAUSTIC     the same roll compresses the mapping between the plate
                     and the ground. The compression is read off the screen
                     derivative of the sampled coordinate, and where the
                     mapping compresses the rule is drawn brighter. One
                     bright stretch, at the exit, for the same reason a real
                     lens puts one there.

   ------------------------------------------------------------
   COLOUR

   ONE ink at four alphas, read from the page's own tokens at mount and
   re-read whenever the room changes: the rule, the glass body, the chamfer
   and the shadow. The composition is identical in greyscale because it is
   already greyscale. Two of the four invert with the room and the reasoning
   is in readTokens, where it was found by looking at the dark room rather
   than by reasoning about it.

   The accent is spent once, on about sixteen pixels: the piece of rule lying
   in the leading chamfer, where the crossing begins. It is the same
   permission .rulefield::after spends on the copy edge — an accent marking a
   structural event.

   ------------------------------------------------------------
   FRAMES

   Zero at rest. A frame is requested when something has changed and the loop
   stops the moment nothing is changing: the settle finishes, the pointer
   follow is inside its epsilon, the canvas leaves the viewport, the tab is
   hidden. There is no ambient loop, no idle rotation and no rAF that exists
   because a canvas does. Measured on the built page: 67 frames for the
   settle, 2 GL draw calls in every one of them, and 0 frames over the next
   three seconds.
   ============================================================ */

import {
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  LinearSRGBColorSpace,
  NoToneMapping,
  ColorManagement,
} from 'three';

import { ARM, CUT_K, DUR_DOUBLE, RUNG, curve } from '../lib/law';
import type { OpticHandle } from './optic';

/* ------------------------------------------------------------
   THE FIGURES

   Every one of them is either read off the law, derived from the field's own
   measured box, or is an optical constant. Nothing here is a round number
   chosen because it looked right in one screenshot.
   ------------------------------------------------------------ */

const THETA = (ARM * Math.PI) / 180;
const SIN_A = Math.sin(THETA);
const COS_A = Math.cos(THETA);

/** The settle, in ms. Two of the site's long rung and not a new duration. */
const SETTLE_MS = DUR_DOUBLE * 2 * 1000;

/** Glass. Crown, near enough, and the ratio is what Snell wants. */
const ETA = 1 / 1.5;

/** One rung of the ladder in pixels, against the site's 15px root: 5.4. The
    only distance the plate is allowed to travel. */
const RUNG_PX = RUNG[0] * 15;

/** The pane's resting tilt about its own long axis, in radians, and the
    amount the pointer is allowed to add to it either way.

    THE SWING IS SOLVED FROM THE PIXELS, AND THE ESTIMATOR THAT READ THEM IS
    HALF THE ANSWER. A note here previously reported a total travel of 0.80px
    at 2.4 degrees and raised the swing to 5.6 to compensate. That figure came
    from a CENTROID taken over a window inside the plate, and the plate's body
    tint is a broad, nearly uniform block about 100px tall: it outweighs a
    one pixel rule by two orders of magnitude, so the centroid reports the
    tint's centre of mass and barely moves however far the rule does. The
    same window read with a peak locator, parabolic fit around the extremum
    and the plate's own tint taken as the local background, reports the rule
    itself.

    MEASURED THAT WAY, on the built page at 1500, pointer driven to each end
    of its travel and the render loop then polled until it had actually
    STOPPED before the frame was captured, the transmitted rule travels
      2.4 degrees   4.38, 4.38, 4.38 and 3.06 CSS px at four columns
      5.6 degrees  10.37, 10.32, 10.32 and 7.12 CSS px
    against a brief that asks for 2 to 4. The control confirms the estimator:
    the same rule read at a column OUTSIDE the plate moves 0.000px between the
    two states, so what is being measured is the refraction and nothing else.
    Slab refraction through 150px at eta 1/1.5 predicts 9.9px of change across
    a 9 +/- 5.6 degree swing and 4.25px across 9 +/- 2.4, which is the two
    readings to within the noise, so the geometry agrees with the camera.

    1.5 degrees is the angle solved for the middle of the band rather than its
    edge: 1.84px of rule travel per degree of swing, so 2.77px, with the slide
    below trimmed to match so the two axes cannot add up past the ceiling. */
const TILT_REST = (9.0 * Math.PI) / 180;
const TILT_SWING = (1.5 * Math.PI) / 180;

/** How far along the rule the pointer may slide the plate, in CSS px. Both
    of the plate's raked ends move with it, so both bends move with it, which
    is the visible half of the response.

    THE SQUARE RIGHT END IS THE ONLY HONEST LANDMARK for this one, because it
    is vertical and can therefore only move with the slide, where the leading
    tip lies on the raked edge and carries the tilt as well. Read there, on
    rows clear of the one the transmitted rule crosses, and with the loop
    polled until it had stopped before capture, 2.0 gives 3.99 and 3.94 CSS px
    of travel across the pointer's full horizontal sweep. That sits exactly on
    the brief's ceiling on its own, and the tilt above adds a second axis to
    it: at 2.8px each the worst case is a corner to corner move of 3.9px,
    where 2.8 and 4.0 would have been 4.9. 1.4 is the same 2.8px the tilt was
    solved for, so neither axis is at the edge and their sum is not past it. */
const SLIDE_SWING = 1.4;

/** The light, as a direction of travel: down the arm from the upper left and
    into the page, so the shadow falls off the pane's lower-right edge by
    about a third of its height. */
const LIGHT = new Vector3(0.3, -0.36, -0.88).normalize();

/* ------------------------------------------------------------
   READING THE PAGE'S OWN COLOURS

   getComputedStyle hands back a USED value, which for a color-mix() token is
   `color(srgb r g b / a)` and for anything else is `rgb()` or `rgba()`. Both
   shapes are one regex apart, and the only real difference is whether the
   channels are 0..1 or 0..255.

   The probe is a real element inside the host, so the custom properties
   resolve against the host's own cascade — which is what makes the room
   switch work without this file naming a single colour.
   ------------------------------------------------------------ */

type RGBA = [number, number, number, number];

function parseColor(value: string): RGBA {
  const srgb = /^color\(\s*srgb/i.test(value);
  const found = value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?%?/gi);
  if (!found || found.length < 3) return [0, 0, 0, 1];
  const n = found.map((raw) =>
    raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw)
  );
  const k = srgb ? 1 : 1 / 255;
  return [n[0] * k, n[1] * k, n[2] * k, n.length > 3 ? n[3] : 1];
}

/** Rec.709 luminance of an sRGB triple, 0..1. Used only to decide which of
    two tokens is the lighter, which is a comparison and not a colour. */
function lum(c: RGBA): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

interface Tokens {
  ink: RGBA;
  rule: RGBA;
  accent: RGBA;
  lift: RGBA;
  ground: RGBA;
  /** The colour a specular highlight takes, and the alpha it may spend. */
  spec: RGBA;
  specA: number;
  /** What a contact shadow is worth in this room. Zero on the void. */
  shadowA: number;
}

function readTokens(host: HTMLElement): Tokens {
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
  host.appendChild(probe);

  const take = (token: string): RGBA => {
    probe.style.color = '';
    probe.style.color = `var(${token})`;
    return parseColor(getComputedStyle(probe).color);
  };

  const ink = take('--ink');
  const rule = take('--ink-line-strong');
  const accent = take('--ink-accent');
  /* The value that stands one step off the ground. On porcelain that is
     eight levels UP; on the void it is nine. */
  const lift = take('--canvas-elevated');
  const ground = take('--canvas');
  probe.remove();

  /* ============================================================
     THE TWO ROOMS INVERT, AND TWO OF THE FOUR MATERIAL CUES INVERT WITH
     THEM. Both were caught by looking at the dark room rather than by
     reasoning about it.

     THE HIGHLIGHT TAKES WHICHEVER TOKEN IS LIGHTER, always, because a
     specular highlight is by definition the lightest thing in the picture.
     On paper that is --canvas-elevated, eight levels above porcelain. On the
     void it is --ink, and --canvas-elevated is nine levels above black,
     which is DARKER than the chamfer it was being painted over: the leading
     edge of the plate disappeared entirely in the dark room, which is what
     the capture showed.

     AND ITS ALPHA IS SOLVED FROM THE HEADROOM RATHER THAN FIXED. The
     highlight is worth about twenty-four levels of change in either room, so
     the alpha is twenty-four divided by the distance between the highlight
     and the ground: on paper that is 24/7, which clamps to full and buys the
     seven levels that exist; on the void it is 24/233, which is a tenth, and
     a fixed alpha there would have put a hundred-level white edge on the
     plate.

     THE SHADOW IS WORTH NOTHING ON THE VOID. A contact shadow is ink laid
     under an object, and on paper ink is 220 levels below the ground. On the
     void the ground is already at ten and the ink is 233 levels ABOVE it, so
     the same declaration was LIGHTENING the sheet where the plate's shadow
     should be. It is scaled by how far the ink actually falls below the
     ground, which is 1 on paper and 0 on the void, and in the dark room the
     plate reads by the lift of its body and its chamfer instead — which is
     what a glass plate on a black surface actually looks like.
     ============================================================ */
  const spec = lum(lift) >= lum(ink) ? lift : ink;
  const specA = Math.min((24 / 255) / Math.max(Math.abs(lum(spec) - lum(ground)), 1e-3), 1);
  const shadowA = Math.max(0, Math.min((lum(ground) - lum(ink)) / 0.86, 1));

  return { ink, rule, accent, lift, ground, spec, specA, shadowA };
}

/* ------------------------------------------------------------
   THE SHADERS
   ------------------------------------------------------------ */

/* Shared by both programs: the field is measured in CSS pixels from its own
   top-left, and world units ARE CSS pixels, so the only conversion is the
   flip and the half-extent. */
const FIELD_GLSL = /* glsl */ `
  uniform vec2  uField;
  uniform float uRuleY;

  float fieldY(float worldY) { return uField.y * 0.5 - worldY; }
  float fieldX(float worldX) { return worldX + uField.x * 0.5; }
`;

/* The occlusion and shadow test, and it is ONE function used twice. Cast a
   ray at the pane's plane, land on it, and ask how far the landing point is
   from the band's centreline along the pane's own perpendicular axis. With
   the camera as the origin it answers "is this bit of ground hidden by the
   pane"; with the light as the direction it answers "is this bit of ground
   in the pane's shadow". */
const COVER_GLSL = /* glsl */ `
  uniform vec3  uPaneO;
  uniform vec3  uPaneN;
  uniform vec3  uPaneU;
  uniform vec3  uPaneV;
  uniform float uHalfL;
  uniform float uHalfW;

  /* THE PLATE'S OWN SILHOUETTE, AS THREE SIGNED DISTANCES.

     It is not a rectangle and it is not a parallelogram, and both of those
     were built and rejected. A rectangle is a card. A parallelogram with two
     raked ends is the canonical shape of a flat plane seen in perspective,
     and with a shadow under it that is exactly what it read as — the one
     thing the brief calls a generic 3D object.

     What is here is the site's own plate: square to the page on three sides,
     so it agrees with the grid the whole composition is built on, and cut on
     the mark's 40.82 degrees at the LEADING end, which is where the rule
     enters and where the accent goes. Orthogonal where the page is
     orthogonal, and angled exactly where the brand is.

     Each function returns the distance INSIDE the boundary, in CSS pixels,
     so the same three numbers drive the bound, the antialiasing and the
     chamfer without a second set of constants.
  */
  float dRake(vec2 p)  { return (p.x + uHalfL) * ${SIN_A.toFixed(6)} - p.y * ${COS_A.toFixed(6)}; }
  float dRight(vec2 p) { return uHalfL - p.x; }
  float dFace(vec2 p)  { return uHalfW - abs(p.y); }
  float dPlate(vec2 p) { return min(min(dRake(p), dRight(p)), dFace(p)); }

  float plateHit(vec3 origin, vec3 dir, float feather) {
    float denom = dot(dir, uPaneN);
    if (abs(denom) < 1e-5) return 0.0;
    float t = dot(uPaneO - origin, uPaneN) / denom;
    if (t < 0.0) return 0.0;
    vec3 d = origin + dir * t - uPaneO;
    return smoothstep(-feather, feather, dPlate(vec2(dot(d, uPaneU), dot(d, uPaneV))));
  }
`;

const GROUND_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`;

const GROUND_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;

  uniform vec3  uCam;
  uniform vec3  uInk;
  uniform vec3  uRuleInk;
  uniform float uRuleA;
  uniform float uShadowA;
  uniform vec3  uLight;

  ${FIELD_GLSL}
  ${COVER_GLSL}

  void main() {
    float fy = fieldY(vWorld.y);
    float w  = max(fwidth(fy), 0.0001);

    /* The rule. One CSS pixel, analytically antialiased against the actual
       screen derivative, so it is exactly as crisp as the divider below it
       at any device pixel ratio. */
    float rule = 1.0 - smoothstep(0.5 - w, 0.5 + w, abs(fy - uRuleY));

    /* Withheld wherever the pane covers it: the pane draws the refracted
       version of the same rule, and two of them would read as a fault. */
    vec3 toHere = normalize(vWorld - uCam);
    float hidden = plateHit(uCam, toHere, 0.75);

    /* The contact shadow, which is the only reason the pane reads as being
       ABOVE the paper rather than printed on it. It is one --edge-quiet of
       ink over about ten pixels, and it is shown only outside the pane. */
    float shade = plateHit(vWorld, -uLight, 8.0);

    float ruleA  = rule * uRuleA * (1.0 - hidden);
    float shadeA = shade * uShadowA * (1.0 - hidden);

    float a = clamp(ruleA + shadeA, 0.0, 1.0);
    vec3 col = a > 0.0 ? (uRuleInk * ruleA + uInk * shadeA) / a : uInk;
    gl_FragColor = vec4(col * a, a);
  }
`;

const PANE_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`;

const PANE_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;
  varying vec2 vLocal;

  uniform vec3  uCam;
  uniform vec3  uInk;
  uniform vec3  uRuleInk;
  uniform vec3  uAccent;
  uniform vec3  uLift;
  uniform vec3  uLight;
  uniform float uSpecA;
  uniform float uAccentA;
  uniform float uRuleA;
  uniform float uTintA;
  uniform float uFresA;
  uniform float uOpacity;

  uniform float uThick;
  uniform float uBevel;
  uniform float uRamp;
  uniform float uSoft;
  uniform vec2  uCross;

  ${FIELD_GLSL}
  ${COVER_GLSL}

  void main() {
    /* THE PLATE LIES ALONG THE RULE, so the rule is inside the glass for the
       whole length of the object and every part of the object is doing work.
       Three edges are square to the page; the fourth, the leading end, is
       cut on the mark's 40.82 degrees, and it is the edge the rule enters
       through. */
    float dR = dRake(vLocal);
    float dE = dRight(vLocal);
    float dF = dFace(vLocal);
    float d = min(min(dR, dE), dF);
    if (d < -1.5) discard;

    float edgeAA = smoothstep(-0.7, 0.7, d);
    if (edgeAA <= 0.0) discard;

    /* THE CHAMFER, one per edge, and the plate takes whichever is deepest. */
    float bR = 1.0 - smoothstep(0.0, uBevel, dR);
    float bE = 1.0 - smoothstep(0.0, uBevel, dE);
    float bF = 1.0 - smoothstep(0.0, uBevel, dF);
    float b = max(max(bR, bE), bF);

    /* The normal rolls outward over the chamfer, toward whichever edge is
       producing it. On the leading end that direction is itself cut on the
       arm, so the chamfer that lights and the chamfer that bends the rule are
       one edge. */
    vec3 out2 =
      (uPaneV * ${COS_A.toFixed(6)} - uPaneU * ${SIN_A.toFixed(6)}) * bR +
      uPaneU * bE +
      uPaneV * (sign(vLocal.y) * bF);
    vec3 outward = length(out2) > 1e-4 ? normalize(out2) : uPaneV;
    float roll = b * b * 1.15;
    vec3 N = normalize(uPaneN * cos(roll) + outward * sin(roll));

    vec3 V = normalize(uCam - vWorld);
    vec3 I = -V;

    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);

    /* Snell through a slab whose thickness falls to zero at every boundary.

       THE OPTICAL RAMP IS FOUR TIMES THE CHAMFER, AND THE TWO ARE DIFFERENT
       THINGS. The chamfer is 7px because a polished edge is narrow and a
       wide one reads as a rounded lozenge rather than as a machined plate.
       But tying the thickness ramp to it put the rule's whole displacement
       inside 10.7px of run: measured, a 9px drop over 10.7px, which is a
       forty degree jog and reads as a broken line rather than as a bend.

       So the plate is very slightly convex, which is what an optical element
       actually is, and its thickness rises over 30px from any edge. The rule
       now eases into its offset over 46px of run at the raked end and 30px at
       the square one, which is a curve a reader can see happening. */
    float thick = uThick * smoothstep(0.0, uRamp, d);
    vec3 shift = vec3(0.0);
    vec3 R = refract(I, N, ${ETA.toFixed(6)});
    if (dot(R, R) > 0.0) {
      vec3 exitR = vWorld + R * (thick / max(abs(dot(R, N)), 0.08));
      vec3 exitI = vWorld + I * (thick / max(abs(dot(I, N)), 0.08));
      shift = exitR - exitI;
    }

    /* Where the untouched view ray lands on the paper, and where the
       refracted one lands. */
    float s0 = -vWorld.z / min(I.z, -1e-3);
    vec3 hit0 = vWorld + I * s0;
    vec3 hit = hit0 + shift;

    float fy0 = fieldY(hit0.y);
    float fy = fieldY(hit.y);

    /* THE CAUSTIC, read rather than drawn: where the chamfer compresses the
       mapping the sampled coordinate moves more slowly across the screen
       than the untouched one, and the rule concentrates by exactly that
       ratio. Clamped hard, because a derivative is a noisy thing to trust. */
    float base = max(fwidth(fy0), 0.0001);
    float rate = max(fwidth(fy), 0.0001);
    float gain = clamp(base / rate, 0.85, 1.9);

    /* The rule is softer inside the glass than on the paper. */
    float thin = 0.5 + uSoft;
    float aa = max(rate, 0.35);
    float rule = 1.0 - smoothstep(thin - aa, thin + aa, abs(fy - uRuleY));

    /* The body of the glass: one neutral step, a little denser at the
       chamfer because that is where a real pane has the most material in the
       line of sight. */
    float tint = uTintA * (1.0 + 1.1 * b);

    float ruleA = rule * uRuleA * gain;
    float glassA = tint + uFresA * fres;

    /* THE ONE HIGHLIGHT, AND IT IS WHY THE PLATE IS A SOLID RATHER THAN AN
       OUTLINE. A chamfer that is uniformly dark on all four sides is a
       wireframe: it says where the object's boundary is and nothing about
       which way it faces. A specular term off the SAME rolled normal lights
       only the chamfers turned toward the light, so two edges catch and two
       do not, and the plate acquires an orientation.

       It is the only place in the scene that paints something LIGHTER than
       the sheet, and it is spent on about a pixel and a half of edge. */
    float spec = pow(max(dot(reflect(uLight, N), V), 0.0), 30.0) * b;

    float inkA = clamp(glassA + ruleA, 0.0, 0.9);
    float specA = uSpecA * spec;

    float a = (inkA + specA) * edgeAA * uOpacity;
    if (a <= 0.0) discard;

    vec3 inkCol = (uInk * glassA + uRuleInk * ruleA) / max(glassA + ruleA, 1e-4);
    vec3 col = (inkCol * inkA + uLift * specA) / max(inkA + specA, 1e-4);

    /* THE ACCENT, AND ITS ENTIRE BUDGET: the dozen or so pixels where the
       rule meets the leading raked edge, which is the exact point the
       crossing begins.

       IT IS COMPOSITED OVER, NOT MIXED IN, and that is a repair rather than a
       flourish. Mixed into a colour that then leaves at the chamfer's own
       alpha of about a third, full strength plum arrived on the sheet as
       rgb(182,174,180): a seven level spread, which is a warm grey and not a
       colour at all. Measured, not assumed. Laid over the top at its own
       weight it arrives at about rgb(114,69,125), which is the token, and it
       is spent on roughly twenty pixels of a 1.35 million pixel frame. */
    float onLead = 1.0 - smoothstep(0.0, 2.5, dR);
    vec2 fp = vec2(fieldX(hit0.x), fy0);
    float atCross = 1.0 - smoothstep(3.0, 8.0, distance(fp, uCross));
    float tick = uAccentA * onLead * atCross * uOpacity;

    float outA = tick + a * (1.0 - tick);
    vec3 outC = (uAccent * tick + col * a * (1.0 - tick)) / max(outA, 1e-4);

    gl_FragColor = vec4(outC * outA, outA);
  }
`;

/* ------------------------------------------------------------
   MOUNT
   ------------------------------------------------------------ */

export function mount(host: HTMLElement): OpticHandle | null {
  let W = host.clientWidth;
  let H = host.clientHeight;
  if (W < 120 || H < 120) return null;

  ColorManagement.enabled = false;

  /* THE CONTEXT IS CREATED HERE AND HANDED TO three, RATHER THAN BY three.

     Two things fall out of one line. The first is that asking whether WebGL
     is available and actually taking it are now the SAME act: the loader used
     to create a throwaway context purely to ask, which cost every reader a
     context creation — over 200ms of it on the first one a process makes —
     and then threw the answer away. The second is that a machine which
     refuses a context gets a null back from getContext and this function
     returns quietly, where constructing a WebGLRenderer would have printed
     `Error creating WebGL context` to the console first. A page that has
     fallen back to its drawing should not also be shouting.

     depth and stencil are off because both meshes are ordered by hand and
     nothing in the scene tests depth. */
  const attributes: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  };

  const canvas = document.createElement('canvas');
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  try {
    gl =
      (canvas.getContext('webgl2', attributes) as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl', attributes) as WebGLRenderingContext | null);
  } catch {
    gl = null;
  }
  if (!gl) return null;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, context: gl, ...attributes });
  } catch {
    canvas.remove();
    return null;
  }

  /* Nothing in three's colour pipeline may touch the values this scene
     writes: they are the page's own tokens and they have to composite over
     the paper exactly as the CSS beside them does. */
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearAlpha(0);

  canvas.style.pointerEvents = 'none';
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(22, W / H, 1, 6000);

  /* ---- geometry, in CSS pixels ---- */
  const geoState = {
    halfL: 0,
    halfW: 0,
    bevel: 0,
    lift: 0,
    thick: 0,
    ruleY: 0,
    centre: new Vector2(),
    cross: new Vector2(),
  };

  function solveGeometry(): void {
    /* THE RULE sits on the field's own centre line, snapped to the pixel
       grid. It is one CSS pixel and the divider it answers to is one CSS
       pixel; a rule whose centre lands on a pixel BOUNDARY is antialiased
       across two rows and reads as a soft grey band instead of a hairline.
       Measured before this line: 231 and 205 on two rows against a 247
       sheet, where one row of 189 is wanted. */
    geoState.ruleY = Math.round(H * 0.5) - 0.5;

    /* THE PLATE LIES ALONG THE RULE. Its half-height is a fixed fraction of
       the field; its length is solved so the whole silhouette, rake included,
       occupies 52 percent of the field's WIDTH. Sizing the length from the
       width rather than from the height is what keeps its clearance from the
       drawn boundary and from the container edge generous at every viewport
       the field exists at.

       The rake costs halfW / tan(arm) of horizontal run beyond the square
       end, which is why it comes out of the budget rather than being added
       to it. */
    geoState.halfW = H * 0.16;
    const span = W * 0.52;
    geoState.halfL = Math.max((span - geoState.halfW * CUT_K) * 0.5, 44);

    /* THE CHAMFER IS 7px AND NOT A FRACTION OF THE PLATE, because it is
       standing in for a polished edge and a polished edge is a fixed physical
       width. It is also what sets how far the rule takes to bend: 7px
       measured perpendicular to a raked end is 10.7px of rule. */
    geoState.bevel = 7;
    geoState.lift = Math.min(Math.max(H * 0.085, 18), 30);

    /* The optical thickness, scaled off the field so the displacement stays
       the same fraction of the picture at every width. */
    geoState.thick = 150 * (H / 310);

    /* Centred a little left of the field's middle, so the rule has a clear
       run out to the container edge on the right where it closes. */
    geoState.centre.set(W * 0.47, geoState.ruleY);

    /* THE CROSSING IS SOLVED, NOT PLACED: the rule meets the leading raked
       end at the plate's own centre height, so the accent lands exactly on
       the first of the two bends. */
    geoState.cross.set(geoState.centre.x - geoState.halfL, geoState.ruleY);
  }

  solveGeometry();

  const groundGeo = new PlaneGeometry(1, 1);
  const paneGeo = new PlaneGeometry(1, 1);

  const uField = new Vector2(W, H);
  const uCam = new Vector3();
  const uPaneO = new Vector3();
  const uPaneN = new Vector3();
  const uPaneU = new Vector3();
  const uPaneV = new Vector3();

  const tokens = readTokens(host);
  const ink = new Vector3(tokens.ink[0], tokens.ink[1], tokens.ink[2]);
  const ruleInk = new Vector3(tokens.rule[0], tokens.rule[1], tokens.rule[2]);
  const accent = new Vector3(tokens.accent[0], tokens.accent[1], tokens.accent[2]);
  const lift = new Vector3(tokens.spec[0], tokens.spec[1], tokens.spec[2]);
  let specAlpha = tokens.specA;
  let shadowScale = tokens.shadowA;
  let ruleAlpha = tokens.rule[3];

  const shared = {
    uField: { value: uField },
    uRuleY: { value: geoState.ruleY },
    uCam: { value: uCam },
    uInk: { value: ink },
    uRuleInk: { value: ruleInk },
    uPaneO: { value: uPaneO },
    uPaneN: { value: uPaneN },
    uPaneU: { value: uPaneU },
    uPaneV: { value: uPaneV },
    uHalfL: { value: geoState.halfL },
    uHalfW: { value: geoState.halfW },
  };

  const groundMat = new ShaderMaterial({
    uniforms: {
      ...shared,
      uRuleA: { value: 0 },
      uShadowA: { value: 0 },
      uLight: { value: LIGHT },
    },
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    transparent: true,
    /* BOTH SHADERS WRITE PREMULTIPLIED COLOUR, AND THIS IS THE FLAG THAT
       MAKES THAT TRUE. `premultipliedAlpha` on the RENDERER is only a
       context attribute — it tells the compositor how to read the drawing
       buffer. The blend function is chosen from the MATERIAL's flag, which
       defaults to false, so without this line three multiplies by alpha a
       second time in the blend.

       IT WAS INVISIBLE ON PAPER AND FATAL ON THE VOID. Squaring the alpha of
       a near-black ink over a near-white sheet changes almost nothing: the
       pane read 175 where 176 was wanted. Squaring the alpha of a near-white
       ink over a near-black sheet halves the whole material: the pane read
       29 against a 10 sheet where 80 was wanted, and the dark room's plate
       was a ghost. Measured by reading the drawing buffer with readPixels,
       which is the only way to tell a shader fault from a compositing one. */
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });

  const paneMat = new ShaderMaterial({
    uniforms: {
      ...shared,
      uAccent: { value: accent },
      uLift: { value: lift },
      uLight: { value: LIGHT },
      uSpecA: { value: tokens.specA },
      uAccentA: { value: 0.8 },
      uRuleA: { value: ruleAlpha },
      uTintA: { value: 0.03 },
      uFresA: { value: 0.55 },
      uOpacity: { value: 0 },
      uThick: { value: 0 },
      uBevel: { value: geoState.bevel },
      uRamp: { value: 30 },
      uSoft: { value: 0.12 },
      uCross: { value: new Vector2() },
    },
    vertexShader: PANE_VERT,
    fragmentShader: PANE_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });

  const ground = new Mesh(groundGeo, groundMat);
  ground.renderOrder = 0;
  ground.frustumCulled = false;
  scene.add(ground);

  const pane = new Mesh(paneGeo, paneMat);
  pane.renderOrder = 1;
  pane.frustumCulled = false;
  scene.add(pane);

  /* ---- state ---- */
  let dpr = 1;
  let tilt = TILT_REST;
  let tiltTarget = TILT_REST;
  let slide = 0;
  let slideTarget = 0;
  let settle = 0;
  let settleFrom = 0;
  let visible = true;
  let disposed = false;
  let lost = false;
  let raf = 0;
  let queued = false;
  let pointer: { x: number; y: number } | null = null;
  let pointerLive = false;

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  pointerLive = fine.matches;

  /* ---- layout ---- */
  function layout(): void {
    uField.set(W, H);
    camera.aspect = W / H;
    /* The ground plane fills the frustum exactly at z = 0, so one world unit
       is one CSS pixel there and every figure above can be written in
       pixels. */
    const dist = H * 0.5 / Math.tan((22 * Math.PI) / 360);
    camera.position.set(0, 0, dist);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    uCam.copy(camera.position);

    ground.geometry.dispose();
    ground.geometry = new PlaneGeometry(W, H);

    /* The mesh is the parallelogram's bounding box; the shader discards the
       four corners outside it. One quad either way, and the alternative is a
       custom BufferGeometry rebuilt on every resize. */
    const meshHalfX = geoState.halfL + geoState.halfW * CUT_K;
    pane.geometry.dispose();
    pane.geometry = new PlaneGeometry(meshHalfX * 2 + 8, geoState.halfW * 2 + 8);

    shared.uRuleY.value = geoState.ruleY;
    shared.uHalfL.value = geoState.halfL;
    shared.uHalfW.value = geoState.halfW;
    paneMat.uniforms.uBevel.value = geoState.bevel;
    (paneMat.uniforms.uCross.value as Vector2).copy(geoState.cross);

    /* 1.5 on a full desktop field, 1.25 on the constrained band. Beyond that
       the extra samples buy nothing a hairline can show.

       AND THE FIGURE IS THE FIELD'S WIDTH, NOT THE VIEWPORT'S, WHICH IS WHY
       THE PREVIOUS ONE NEVER FIRED. W here is host.clientWidth — the
       reserved track, which is 293 at 1024 and 646 at its widest. It is
       never 1279, so `W >= 1279` was false at every width the site has and
       the whole desktop band rendered at 1.25. Measured on the built page at
       a device ratio of 2: 1.248 at 1024, 1.248 at 1280, 1.249 at 1500,
       1.249 at 1920 and 1.250 at 2200 — the wide cap was unreachable.

       479 is the same breakpoint expressed in the box this module actually
       owns, and it is measured rather than picked. The constrained band runs
       the field from 293.34 at 1024 to 378.34 at 1279; the full band opens
       at 479.34 at 1280 and the four-column band above 2140 sits at 512.02.
       There is a hundred-pixel gap between the two, so one figure separates
       them at every width and this file still never reads window.innerWidth. */
    const cap = W >= 479 ? 1.5 : 1.25;
    dpr = Math.min(window.devicePixelRatio || 1, cap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
  }

  const rot = new Quaternion();
  const qX = new Quaternion();
  const axisX = new Vector3(1, 0, 0);
  const localX = new Vector3(1, 0, 0);
  const localY = new Vector3(0, 1, 0);
  const localZ = new Vector3(0, 0, 1);

  function placePane(s: number): void {
    /* THE PLATE IS NOT ROTATED IN ITS OWN PLANE. Its long edges are
       horizontal because the rule is horizontal, and the mark's angle is
       carried by the two raked ENDS, which the shader cuts. The only
       rotation here is the tilt, which is what makes the glass refract at
       all: tilting about the horizontal axis displaces the rule
       perpendicular to itself, which is the largest displacement a
       horizontal line can be given and therefore the most legible. */
    qX.setFromAxisAngle(axisX, tilt);
    rot.copy(qX);
    pane.quaternion.copy(rot);

    /* THE SETTLE'S POSITIONAL HALF, and it is the site's one arrival shape:
       up the arm, one rung, on the one curve. 5.4px is --d0 against the 15px
       root, resolved onto the arm exactly the way every other displacement on
       this site is. */
    const back = (1 - s) * RUNG_PX;

    const cx = geoState.centre.x - W * 0.5 + slide - back * COS_A;
    const cy = H * 0.5 - geoState.centre.y - back * SIN_A;

    pane.position.set(cx, cy, geoState.lift);
    pane.updateMatrixWorld();

    uPaneO.copy(pane.position);
    uPaneN.copy(localZ).applyQuaternion(rot);
    uPaneU.copy(localX).applyQuaternion(rot);
    uPaneV.copy(localY).applyQuaternion(rot);
  }

  /* ---- the loop, and it stops ---- */
  function request(): void {
    if (disposed || lost || queued || !visible) return;
    queued = true;
    raf = requestAnimationFrame(frame);
  }

  let settleStart = 0;

  function frame(now: number): void {
    queued = false;
    if (disposed || lost) return;

    let moving = false;

    if (settle < 1) {
      if (!settleStart) settleStart = now;
      const t = Math.min((now - settleStart) / SETTLE_MS, 1);
      settle = settleFrom + (1 - settleFrom) * curve(t);
      if (t < 1) moving = true;
      else settle = 1;
    }

    if (pointerLive) {
      const dt = 0.14;
      const dTilt = tiltTarget - tilt;
      const dSlide = slideTarget - slide;
      tilt += dTilt * dt;
      slide += dSlide * dt;
      if (Math.abs(dTilt) > 1e-5 || Math.abs(dSlide) > 0.004) moving = true;
      else {
        tilt = tiltTarget;
        slide = slideTarget;
      }
    }

    /* The rule arrives first and sharp, then the material settles onto it.
       That order is the sentence: a rule, and then something with depth
       lying across it. */
    groundMat.uniforms.uRuleA.value = ruleAlpha * Math.min(settle * 2.2, 1);
    const body = Math.max((settle - 0.1) / 0.9, 0);
    groundMat.uniforms.uShadowA.value = 0.032 * shadowScale * body;
    paneMat.uniforms.uOpacity.value = body;
    paneMat.uniforms.uThick.value = geoState.thick * body;
    paneMat.uniforms.uRuleA.value = ruleAlpha;

    placePane(settle);
    renderer.render(scene, camera);

    if (moving) request();
  }

  /* ---- inputs ---- */
  function onPointerMove(ev: PointerEvent): void {
    if (!pointerLive || ev.pointerType !== 'mouse') return;
    pointer = { x: ev.clientX, y: ev.clientY };
    applyPointer();
  }

  function applyPointer(): void {
    if (!pointer) return;
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    /* Read across the field, not across the window: -1 at the boundary
       hairline, +1 at the container edge, and clamped, so a pointer anywhere
       in the headline's own row moves the material by a bounded amount and a
       pointer past the field does not keep pushing. */
    const nx = Math.max(-1, Math.min(1, ((pointer.x - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((pointer.y - r.top) / r.height) * 2 - 1));
    tiltTarget = TILT_REST + TILT_SWING * ny;
    slideTarget = SLIDE_SWING * nx;
    request();
  }

  function onPointerLeave(): void {
    pointer = null;
    tiltTarget = TILT_REST;
    slideTarget = 0;
    request();
  }

  /* The bounded field is what the pointer is read against, so the listener
     goes on the row that CONTAINS the field rather than on the document. */
  const field = host.closest<HTMLElement>('.hero__floor') ?? host;

  /* WHETHER THE LISTENERS ARE ON IS NOT THE SAME QUESTION AS WHETHER THE
     POINTER IS LIVE, AND CONFLATING THE TWO LEAKED THE WHOLE SCENE.
     `pointerLive` is a live reading of (hover: hover) and (pointer: fine),
     so it flips whenever the media query does. dispose() used to gate the
     removeEventListener calls on it, which meant that if the query went
     false at any point after mount, the two listeners stayed bound to
     .hero__floor for the life of the document, and their closures held the
     renderer, the scene, both materials and both geometries with them.
     Measured over CDP with DOMDebugger.getEventListeners on .hero__floor:
     ["pointerleave","pointermove"] before, and the same two still there
     after pagehide once touch emulation had flipped the query, against an
     empty list on the path where it had not. This records what was BOUND. */
  let pointerBound = false;
  if (pointerLive) {
    field.addEventListener('pointermove', onPointerMove, { passive: true });
    field.addEventListener('pointerleave', onPointerLeave, { passive: true });
    pointerBound = true;
  }

  const onFine = (): void => {
    pointerLive = fine.matches;
    if (!pointerLive) onPointerLeave();
  };
  fine.addEventListener('change', onFine);

  /* ---- state changes ---- */
  const ro = new ResizeObserver((entries) => {
    const box = entries[0];
    const w = Math.round(box.contentRect.width);
    const h = Math.round(box.contentRect.height);
    /* Only when the box has ACTUALLY changed. A ResizeObserver fires for a
       great many things that are not a new size. */
    if (w === W && h === H) return;
    if (w < 120 || h < 120) return;
    W = w;
    H = h;
    solveGeometry();
    layout();
    request();
  });
  ro.observe(host);

  const io = new IntersectionObserver(
    (entries) => {
      const now = entries[0]?.isIntersecting ?? false;
      if (now === visible) return;
      visible = now;
      if (visible) {
        /* Resume from wherever the settle actually got to rather than
           replaying it. */
        settleFrom = settle;
        settleStart = 0;
        request();
      } else if (queued) {
        cancelAnimationFrame(raf);
        queued = false;
      }
    },
    { threshold: 0 }
  );
  io.observe(host);

  const onVisibility = (): void => {
    if (document.hidden) {
      if (queued) {
        cancelAnimationFrame(raf);
        queued = false;
      }
    } else {
      settleFrom = settle;
      settleStart = 0;
      request();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  /* The room. Both doors: the switch writes data-theme, the system writes
     nothing at all, so both are watched and both re-read the same tokens. */
  const reread = (): void => {
    const next = readTokens(host);
    ink.set(next.ink[0], next.ink[1], next.ink[2]);
    ruleInk.set(next.rule[0], next.rule[1], next.rule[2]);
    accent.set(next.accent[0], next.accent[1], next.accent[2]);
    lift.set(next.spec[0], next.spec[1], next.spec[2]);
    specAlpha = next.specA;
    shadowScale = next.shadowA;
    paneMat.uniforms.uSpecA.value = specAlpha;
    ruleAlpha = next.rule[3];
    request();
  };
  const themeObserver = new MutationObserver(reread);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  const room = window.matchMedia('(prefers-color-scheme: dark)');
  room.addEventListener('change', reread);

  /* ---- the context ---- */
  /* A LOST CONTEXT IS NOT AN EMPTY FIELD. preventDefault is what allows the
     browser to give the context back at all, and until it does the static
     drawing in index.html comes forward again — the same composition, drawn
     rather than rendered, which is exactly the state a machine with no WebGL
     has been in all along. Nothing is announced and nothing is blank. */
  const onLost = (ev: Event): void => {
    ev.preventDefault();
    lost = true;
    if (queued) {
      cancelAnimationFrame(raf);
      queued = false;
    }
    delete host.dataset.optic;
  };

  /* ONLY WHEN IT IS GENUINELY BACK. three rebuilds its own programs on this
     event; all this has to do is confirm the context is alive, restate the
     size, and ask for the one frame that redraws the scene. */
  const onRestored = (): void => {
    if (disposed) return;
    const gl = renderer.getContext();
    if (!gl || gl.isContextLost()) return;
    lost = false;
    host.dataset.optic = 'live';
    layout();
    request();
  };
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  layout();

  /* THE PROGRAM COMPILE GOES OFF THE MAIN THREAD WHERE THE DRIVER ALLOWS IT.
     compileAsync uses KHR_parallel_shader_compile when the context has it,
     which is the one part of bringing a renderer up that does not have to be
     paid for in a blocking task. Where the extension is missing it behaves
     as the synchronous compile did, so this is a saving and never a cost.
     The first frame is asked for afterwards either way, so nothing renders
     against a program that is not linked. */
  const compile = (renderer as WebGLRenderer & {
    compileAsync?: (s: Scene, c: PerspectiveCamera) => Promise<unknown>;
  }).compileAsync;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  if (compile && parallel) {
    compile.call(renderer, scene, camera).then(
      () => { if (!disposed) request(); },
      () => { if (!disposed) request(); }
    );
  } else {
    request();
  }

  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (queued) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      room.removeEventListener('change', reread);
      fine.removeEventListener('change', onFine);
      document.removeEventListener('visibilitychange', onVisibility);
      if (pointerBound) {
        field.removeEventListener('pointermove', onPointerMove);
        field.removeEventListener('pointerleave', onPointerLeave);
        pointerBound = false;
      }
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      ground.geometry.dispose();
      pane.geometry.dispose();
      groundMat.dispose();
      paneMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
