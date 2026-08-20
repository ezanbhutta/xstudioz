/* ============================================================
   XStudioz — the measurement layer

   THE PREMISE
   On a brand manual's clearspace page the drawing is to scale and the
   number printed beside the dimension line is the truth about that
   drawing, not a caption somebody typed underneath it. This module holds
   the site to the same contract. Every figure it prints is read off the
   live document with getBoundingClientRect, so a dimension line can never
   claim 40 while the gap it spans is 62.

   That contract is the entire reason the concept is worth building. A
   drawn-on dimension line with a hardcoded number is set dressing, and an
   identity studio shipping set dressing about measurement would be making
   exactly the argument it is trying not to make.

   WHAT IT NEVER DOES
   It never reads geometry on scroll. Scrolling does not change the
   distance between two elements, it changes where both of them are in the
   viewport, so a scroll handler here would burn a frame budget to
   recompute numbers that did not move. Every rect is converted into the
   coordinate space of its stage before it is used, which makes scroll
   cancel out exactly and costs nothing.

   WHEN IT DOES READ
     - on ResizeObserver, which is the only signal that actually fires when
       the geometry changes, including the pane-resize case where the
       window resize event does not
     - once on fonts.ready, because type metrics move every edge on the page
     - at the completion of a displacement, via settle()

   Between those points a displacement drives the figures with
   projectBetween(), which interpolates between two states that were both
   really measured with probe(). An interpolated figure is an estimate; the
   settle() at the end is the correction back to truth.

   UNITS
   A manual expresses clearspace in the mark's own units: "4W" means four
   times the width of the logotype, whatever size it happens to be printed
   at. So the element carrying [data-unit-w] publishes its measured width
   as --w onto the stage, and --clearspace derives from it in CSS. Change
   the mark's size and every clearance in the document follows, because
   they are all expressed in it rather than in pixels that were once
   correct.
   ============================================================ */

type Axis = 'x' | 'y';

interface Dim {
  el: HTMLElement;
  out: HTMLElement;
  from: HTMLElement;
  to: HTMLElement;
  axis: Axis;
  /* 'px' prints device pixels, 'W' prints the gap in mark widths, which is
     how a real clearspace page is annotated. */
  unit: 'px' | 'W';
  /* the last figure printed, so a displacement can interpolate away from a
     number that is actually on screen rather than from zero */
  value: number;
}

interface Stage {
  el: HTMLElement;
  dims: Dim[];
  unitEl: HTMLElement | null;
}

const stages: Stage[] = [];
let observer: ResizeObserver | null = null;

/* When a displacement is driving the figures, the live pass must not fight
   it. Everything still recomputes at the end via settle(). */
let driving = false;

/* ------------------------------------------------------------
   Reading
   ------------------------------------------------------------ */

/* The gap between two elements along one axis, in stage coordinates.
   Signed: negative means the pair overlaps, which is a real state on this
   site rather than an error, because the ending is the document failing to
   allocate the clearspace it asks for everywhere else. */
function gap(a: DOMRect, b: DOMRect, axis: Axis): number {
  if (axis === 'x') {
    return a.left <= b.left ? b.left - a.right : a.left - b.right;
  }
  return a.top <= b.top ? b.top - a.bottom : a.top - b.bottom;
}

interface Reading {
  dim: Dim;
  x: number;
  y: number;
  len: number;
  px: number;
}

/* One batched read per stage. Every rect for the stage is taken before a
   single style is written, so the pass is read-all-then-write-all and never
   interleaves the two. */
function readStage(stage: Stage): { readings: Reading[]; w: number } {
  const origin = stage.el.getBoundingClientRect();
  const w = stage.unitEl ? stage.unitEl.getBoundingClientRect().width : 0;

  const readings = stage.dims.map((dim) => {
    const a = dim.from.getBoundingClientRect();
    const b = dim.to.getBoundingClientRect();
    const px = gap(a, b, dim.axis);

    /* The line spans the gap itself, positioned in stage space, so the
       drawing and the number describe the same thing by construction. */
    let x: number;
    let y: number;
    let len: number;

    if (dim.axis === 'x') {
      const left = Math.min(a.right, b.right);
      x = left - origin.left;
      len = Math.abs(px);
      /* centred on whichever vertical band the two share */
      const top = Math.max(a.top, b.top);
      const bottom = Math.min(a.bottom, b.bottom);
      y = (bottom > top ? (top + bottom) / 2 : (a.top + b.top) / 2) - origin.top;
    } else {
      const top = Math.min(a.bottom, b.bottom);
      y = top - origin.top;
      len = Math.abs(px);
      const left = Math.max(a.left, b.left);
      const right = Math.min(a.right, b.right);
      x = (right > left ? (left + right) / 2 : (a.left + b.left) / 2) - origin.left;
    }

    return { dim, x, y, len, px };
  });

  return { readings, w };
}

/* ------------------------------------------------------------
   Writing
   ------------------------------------------------------------ */

function print(dim: Dim, px: number, w: number): void {
  dim.value = px;
  if (dim.unit === 'W' && w > 0) {
    const n = px / w;
    /* One decimal, and a bare integer when it lands on one, because "4W"
       is the notation a manual uses and "4.0W" is the notation a
       spreadsheet uses. */
    const s = Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1);
    dim.out.textContent = `${s}W`;
  } else {
    dim.out.textContent = `${Math.round(px)}`;
  }
}

function writeStage(stage: Stage, readings: Reading[], w: number): void {
  if (w > 0) {
    stage.el.style.setProperty('--w', `${w}`);
    /* Also on the root, and this is not belt and braces. A custom property
       that uses var() is substituted against the element it is DECLARED on,
       not the element it is read on, so --clearspace declared on :root
       resolves :root's --w and never sees a value published further down the
       tree. Publishing the unit at the root is what makes the derived
       clearspace track the real mark instead of silently keeping its
       fallback, which measured 88px while the mark was 137 wide. */
    document.documentElement.style.setProperty('--w', `${w}`);
  }
  for (const r of readings) {
    const s = r.dim.el.style;
    s.setProperty('--dim-x', `${r.x}px`);
    s.setProperty('--dim-y', `${r.y}px`);
    s.setProperty('--dim-len', `${r.len}px`);
    print(r.dim, r.px, w);
  }
}

/* ------------------------------------------------------------
   The live pass
   ------------------------------------------------------------ */

export function measure(): void {
  if (driving) return;
  /* Read every stage first, then write every stage. Two stages on one page
     would otherwise interleave a write with the next stage's read and force
     a synchronous layout between them. */
  const passes = stages.map((stage) => ({ stage, ...readStage(stage) }));
  for (const p of passes) writeStage(p.stage, p.readings, p.w);
}

/* Hold the live pass off while something else is driving the figures, and
   release it again. The hero's pinned track needs this because a scrubbed
   timeline owns the numbers for as long as the reader is inside it, and a
   ResizeObserver firing mid-scrub would overwrite them with the rest state.

   It must always be released. settle() and the refresh handler both call
   suspend(false) unconditionally, so a track that exits without reaching
   progress 0 cannot leave measure() locked out for the rest of the session. */
export function suspend(on: boolean): void {
  driving = on;
}

/* Called at the completion of a displacement. The figures were interpolated
   while it ran, which is an estimate; this is the correction back to truth. */
export function settle(): void {
  driving = false;
  measure();
}

/* ------------------------------------------------------------
   Displacement support

   Nothing on this site animates its own arrival. Things move because a
   neighbour needed room, which means the honest figure during a movement is
   the one that interpolates between two states that were both really
   measured. probe() applies the end state, reads it, and puts it back
   before anything can paint, so the target numbers are measured rather
   than predicted.
   ------------------------------------------------------------ */

export function probe(apply: () => void, revert: () => void): number[][] {
  apply();
  const targets = stages.map((stage) => readStage(stage).readings.map((r) => r.px));
  revert();
  return targets;
}

/* Drive the printed figures between two probed states. t is 0 to 1.

   This takes BOTH endpoints rather than just the destination, and that is
   the whole point. The first version of this function interpolated from
   dim.value toward the target, and print() assigns dim.value, so each call
   moved a fraction of the REMAINING distance: the figure converged on the
   target asymptotically instead of being a function of t, and it could
   never travel backwards, because every call moved it toward the same end.
   Under a reversible scrub the printed figures desynced from the lines they
   belong to on the first scroll back, and stayed wrong. On a site whose
   entire argument is that the drawing and the number agree, that is the one
   defect that cannot ship.

   Written this way the result is a pure function of t, so it is exact at
   every frame, reversible, and identical whether it is called once or a
   hundred times at the same position. The line geometry is driven from the
   same interpolated value by whatever is performing the displacement, which
   is what keeps the drawing and the figure in step under any easing. */
export function projectBetween(from: number[][], to: number[][], t: number): void {
  driving = true;
  stages.forEach((stage, i) => {
    const w = parseFloat(stage.el.style.getPropertyValue('--w')) || 0;
    const a = from[i];
    const b = to[i];
    if (!a || !b) return;
    stage.dims.forEach((dim, j) => {
      const p0 = a[j];
      const p1 = b[j];
      if (p0 === undefined || p1 === undefined) return;
      print(dim, p0 + (p1 - p0) * t, w);
    });
  });
}

/* ------------------------------------------------------------
   Wiring
   ------------------------------------------------------------ */

function resolve(el: HTMLElement, attr: string, scope: ParentNode): HTMLElement | null {
  const sel = el.getAttribute(attr);
  if (!sel) return null;
  return scope.querySelector<HTMLElement>(sel);
}

export function initMeasure(root: ParentNode = document): void {
  const hosts = root.querySelectorAll<HTMLElement>('[data-stage]');
  if (!hosts.length) return;

  /* ResizeObserver rather than the resize event. This is not a preference:
     the resize event does not fire for an element whose box changes because
     an ancestor changed, and it does not fire at all in an embedded pane
     that is resized by its host. ResizeObserver reports both, and it
     delivers from the layout pipeline, so the value read in the callback is
     already settled. */
  observer ||= new ResizeObserver(() => measure());

  hosts.forEach((el) => {
    const stage: Stage = {
      el,
      dims: [],
      unitEl: el.querySelector<HTMLElement>('[data-unit-w]'),
    };

    el.querySelectorAll<HTMLElement>('[data-dim]').forEach((dimEl) => {
      const from = resolve(dimEl, 'data-dim-from', el) || resolve(dimEl, 'data-dim-from', document);
      const to = resolve(dimEl, 'data-dim-to', el) || resolve(dimEl, 'data-dim-to', document);
      if (!from || !to) return;

      const axis: Axis = dimEl.getAttribute('data-dim') === 'y' ? 'y' : 'x';
      stage.dims.push({
        el: dimEl,
        out: dimEl.querySelector<HTMLElement>('[data-dim-out]') || dimEl,
        from,
        to,
        axis,
        unit: dimEl.getAttribute('data-dim-unit') === 'W' ? 'W' : 'px',
        value: 0,
      });

      observer!.observe(from);
      observer!.observe(to);
    });

    if (stage.unitEl) observer!.observe(stage.unitEl);
    observer!.observe(el);
    stages.push(stage);
  });

  measure();

  /* Type metrics move every edge on the page, so the first pass above is
     provisional until the real font is in. */
  document.fonts?.ready.then(() => measure());
}

/* project() drives the printed figures TOWARD a probed target and is a lerp,
   so calling it every frame of a scrub compounds and calling it while the
   reader scrolls backwards cannot walk the number back. A scrubbed
   displacement needs the absolute figure at a given progress.

   anchor() takes the baseline the displacement starts from, once. span()
   prints base + (target - base) * t, which is exact for a linear tween and
   reversible, and it does it without touching the layout. Both states it
   interpolates between were really measured, so the figure in flight is an
   honest interpolation of two truths rather than a guess, and settle() puts
   it back on the measurement when the displacement lands. */

export function anchor(): number[][] {
  return stages.map((stage) => stage.dims.map((dim) => dim.value));
}

export function span(base: number[][], targets: number[][], t: number): void {
  driving = true;
  stages.forEach((stage, i) => {
    const w = parseFloat(stage.el.style.getPropertyValue('--w')) || 0;
    const from = base[i];
    const to = targets[i];
    if (!from || !to) return;
    stage.dims.forEach((dim, j) => {
      const a = from[j];
      const b = to[j];
      if (a === undefined || b === undefined) return;
      print(dim, a + (b - a) * t, w);
    });
  });
}

/* ------------------------------------------------------------
   The unit, on a page with no stage

   An interior page has no construction plate, no dimension lines and no
   [data-stage], and it should not have. But it still expresses its
   clearances in the mark's own width, because that is the whole argument:
   "4W" is a number a manual can state anywhere, and 88px is a number that
   was correct once.

   So this reads exactly one width and publishes exactly one property. No
   dimension lines, no stage registration, no read-all-then-write-all pass,
   no scroll anything. Roughly the cost of one getBoundingClientRect per
   resize.
   ------------------------------------------------------------ */

let unitObserver: ResizeObserver | null = null;

export function initUnit(sel = '[data-unit-w]'): void {
  /* A document with a stage already publishes --w from the mark that stage
     is drawing about, and two writers on one custom property is how a value
     starts flickering between two truths. The stage wins, unconditionally,
     because its mark is the one the figures are being read against. */
  if (document.querySelector('[data-stage]')) return;

  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return;

  const write = (): void => {
    const w = el.getBoundingClientRect().width;
    /* Zero means the element is display:none or not laid out yet. Writing it
       would collapse every clearance on the page to nothing, so the previous
       value — or the token's fallback — stands. */
    if (w > 0) document.documentElement.style.setProperty('--w', `${w}`);
  };

  /* Same reasoning as initMeasure: the resize event does not fire for an
     element whose box changed because an ancestor did, and does not fire at
     all in an embedded pane resized by its host. */
  unitObserver ||= new ResizeObserver(write);
  unitObserver.observe(el);

  write();
  document.fonts?.ready.then(write);
}
