/* ============================================================
   PATRIOT WASH N FOLD — Truck Animation v3
   Animation Expert: Kai (Motion Design & Physics Simulation)

   Sequence:
   1. Truck drives in from RIGHT (facing left) with bubbles
   2. Realistic lurch stop: front dips, rear wheels briefly lift
   3. Back door swings open (the right side, which is the rear)
   4. Bag drops from the BACK (right side) of truck, bounces
   5. Door closes
   6. Truck launches left: front wheels lift briefly (wheelie)
   7. Truck exits screen left
   8. Bag fades, reset

   Physics notes from Kai:
   - Lurch: when braking hard, weight transfers FORWARD.
     Front dips down, rear lifts. We simulate this with
     a rotation (clockwise tilt) + slight forward overshoot.
   - Launch: weight transfers BACKWARD.
     Front lifts, rear squats. Counter-clockwise tilt.
   - Both are subtle — 3-5deg max. Real, not cartoon.
   ============================================================ */

(function () {
  'use strict';

  let hasPlayed = false;
  let observerRef = null;

  function init() {
    const section  = document.getElementById('truck-drive-section');
    const truck    = document.getElementById('truck-animated');
    const bag      = document.getElementById('truck-bag-drop');
    const bubbleCt = document.getElementById('bubble-trail');
    if (!section || !truck) return;

    observerRef = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasPlayed) {
          hasPlayed = true;
          runSequence(truck, bag, bubbleCt, section);
        }
      });
    }, { threshold: 0.35 });

    observerRef.observe(section);
  }

  /* ── Main sequence orchestrator ──────────────────────────── */
  function runSequence(truck, bag, bubbleCt, section) {
    const vw      = window.innerWidth;
    const truckW  = Math.min(240, vw * 0.50);
    const stopX   = Math.round(vw * 0.38); // stop ~38% from left

    // Set truck size and starting position (off-screen right)
    truck.style.width     = truckW + 'px';
    truck.style.left      = (vw + 30) + 'px';
    truck.style.transform = 'scaleX(-1)'; // face left
    truck.style.transformOrigin = 'center bottom';

    // Phase 1: Drive in
    phaseDriverIn(truck, bag, bubbleCt, section, vw, truckW, stopX);
  }

  /* ── Phase 1: Drive in from right ──────────────────────────── */
  function phaseDriverIn(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    const startX    = vw + 30;
    const duration  = 2200;
    const start     = performance.now();
    let   lastBubble = 0;

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out cubic: fast start, decelerates
      const e = 1 - Math.pow(1 - t, 3);
      const x = startX - (startX - stopX) * e;
      truck.style.left = x + 'px';

      // Bubble trail from rear (right side of truck since it faces left)
      if (now - lastBubble > 110) {
        lastBubble = now;
        spawnBubble(bubbleCt, x + truckW + 4, 50);
      }

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        truck.style.left = stopX + 'px';
        phaseLurch(truck, bag, bubbleCt, section, vw, truckW, stopX);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ── Phase 2: Realistic lurch stop ─────────────────────────── */
  /* Weight transfers forward: front dips, rear lifts.
     Simulate with: small forward overshoot + clockwise tilt (truck faces left,
     so scaleX(-1) means clockwise in screen space = nose down).
     We use CSS transform on the truck element directly. */
  function phaseLurch(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    const overshoot   = 18;   // px forward overshoot
    const maxTilt     = 4;    // degrees nose-down
    const lurchMs     = 160;  // time to overshoot
    const settleMs    = 280;  // time to settle back

    // Step A: overshoot + tilt forward
    animateMulti(lurchMs, 'easeOut', (p) => {
      const x   = stopX - overshoot * p;
      const deg = maxTilt * p;
      truck.style.left      = x + 'px';
      // scaleX(-1) already applied; we add rotate on top
      truck.style.transform = `scaleX(-1) rotate(${deg}deg)`;
    }, () => {
      // Step B: bounce back and settle
      animateMulti(settleMs, 'spring', (p) => {
        // Spring: overshoot slightly past neutral then settle
        const springP = springEase(p);
        const x   = (stopX - overshoot) + overshoot * 1.08 * springP;
        const deg = maxTilt * (1 - springP);
        truck.style.left      = x + 'px';
        truck.style.transform = `scaleX(-1) rotate(${deg}deg)`;
      }, () => {
        truck.style.left      = stopX + 'px';
        truck.style.transform = 'scaleX(-1) rotate(0deg)';
        // Short pause then open door
        setTimeout(() => phaseOpenDoor(truck, bag, bubbleCt, section, vw, truckW, stopX), 200);
      });
    });
  }

  /* ── Phase 3: Open back door, drop bag ─────────────────────── */
  /* The truck faces left. Its BACK is on the RIGHT side.
     The bag should drop from x = stopX + truckW (right edge of truck). */
  function phaseOpenDoor(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    // We don't have a separate door element — simulate with a brief truck
    // body "opening" effect (slight scale-x expand on right side) then bag appears.
    // Simple approach: just wait a beat then drop the bag from the back.

    setTimeout(() => {
      if (bag) {
        const sectionEl = document.getElementById('truck-drive-section');
        const sH = sectionEl ? sectionEl.offsetHeight : 160;

        // Position bag at the BACK of the truck (right side = stopX + truckW)
        const bagW   = Math.round(truckW * 0.28);
        const bagX   = stopX + truckW - bagW * 0.6; // right edge of truck
        const startB = sH - 40; // truck bed height (near top of section)

        bag.style.width   = bagW + 'px';
        bag.style.left    = bagX + 'px';
        bag.style.bottom  = startB + 'px';
        bag.style.display = 'block';
        bag.style.opacity = '1';
        bag.style.transform = 'rotate(-8deg)';

        dropBag(bag, startB, () => {
          // Door "closes" — just a short pause
          setTimeout(() => phaseLaunch(truck, bag, bubbleCt, section, vw, truckW, stopX), 700);
        });
      } else {
        setTimeout(() => phaseLaunch(truck, bag, bubbleCt, section, vw, truckW, stopX), 500);
      }
    }, 350);
  }

  /* ── Bag drop with bounce ───────────────────────────────────── */
  function dropBag(bag, startBottom, cb) {
    const endBottom = 12;
    const fallMs    = 280;
    const bounce1Ms = 130;
    const bounce2Ms = 90;

    // Fall
    animateMulti(fallMs, 'easeIn', (p) => {
      bag.style.bottom    = (startBottom - (startBottom - endBottom - 12) * p) + 'px';
      bag.style.transform = `rotate(${-8 + 14 * p}deg)`;
    }, () => {
      // First bounce
      animateMulti(bounce1Ms, 'easeOut', (p) => {
        bag.style.bottom    = (endBottom - 12 + 22 * (1 - p)) + 'px';
        bag.style.transform = `rotate(${6 - 6 * p}deg)`;
      }, () => {
        // Settle
        animateMulti(bounce2Ms, 'easeOut', (p) => {
          bag.style.bottom    = (endBottom + 10 - 10 * p) + 'px';
          bag.style.transform = `rotate(${0}deg)`;
        }, () => {
          bag.style.bottom    = endBottom + 'px';
          bag.style.transform = 'rotate(0deg)';
          cb();
        });
      });
    });
  }

  /* ── Phase 4: Launch left with front-wheel lift ─────────────── */
  /* Weight transfers backward on hard acceleration.
     Front lifts (counter-clockwise tilt since truck faces left). */
  function phaseLaunch(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    const liftDeg   = -4;   // front lifts = counter-clockwise (negative)
    const liftMs    = 180;
    const driveMs   = 1500;
    const endX      = -(truckW + 40);
    let   lastBubble = 0;

    // Step A: front wheel lift
    animateMulti(liftMs, 'easeOut', (p) => {
      truck.style.transform = `scaleX(-1) rotate(${liftDeg * p}deg)`;
    }, () => {
      // Step B: accelerate off screen while settling rotation
      const launchStart = performance.now();
      function launchTick(now) {
        const t = Math.min((now - launchStart) / driveMs, 1);
        const e = t * t; // ease-in: accelerate
        const x = stopX - (stopX - endX) * e;
        // Rotation settles back to 0 in first 30% of drive
        const rotT = Math.min(t / 0.3, 1);
        const deg  = liftDeg * (1 - rotT);
        truck.style.left      = x + 'px';
        truck.style.transform = `scaleX(-1) rotate(${deg}deg)`;

        if (now - lastBubble > 90) {
          lastBubble = now;
          spawnBubble(bubbleCt, x + truckW + 4, 50);
        }

        if (t < 1) {
          requestAnimationFrame(launchTick);
        } else {
          phaseEnd(truck, bag, bubbleCt, section, vw);
        }
      }
      requestAnimationFrame(launchTick);
    });
  }

  /* ── Phase 5: End — fade bag, reset ────────────────────────── */
  function phaseEnd(truck, bag, bubbleCt, section, vw) {
    if (bag) {
      bag.style.transition = 'opacity 1.2s ease';
      bag.style.opacity    = '0';
      setTimeout(() => {
        bag.style.display     = 'none';
        bag.style.transition  = '';
        bag.style.opacity     = '1';
      }, 1300);
    }

    setTimeout(() => {
      // Reset truck
      truck.style.left      = (vw + 30) + 'px';
      truck.style.transform = 'scaleX(-1)';
      if (bubbleCt) bubbleCt.innerHTML = '';
      hasPlayed = false;

      // Re-observe for next scroll
      if (observerRef) observerRef.observe(section);
    }, 2000);
  }

  /* ── Utility: animate over time ─────────────────────────────── */
  function animateMulti(duration, easing, onUpdate, onComplete) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      let e;
      switch (easing) {
        case 'easeIn':  e = t * t; break;
        case 'easeOut': e = 1 - (1 - t) * (1 - t); break;
        case 'spring':  e = springEase(t); break;
        default:        e = t;
      }
      onUpdate(e);
      if (t < 1) requestAnimationFrame(tick);
      else if (onComplete) onComplete();
    }
    requestAnimationFrame(tick);
  }

  /* Spring ease: overshoots slightly then settles */
  function springEase(t) {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -8 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  /* ── Bubble spawner ──────────────────────────────────────────── */
  function spawnBubble(container, x, yBase) {
    if (!container) return;
    const b = document.createElement('div');
    b.className = 'soap-bubble';
    const size = 6 + Math.random() * 15;
    const dur  = 1.5 + Math.random() * 1.2;
    const xOff = (Math.random() - 0.5) * 22;
    b.style.cssText = `width:${size}px;height:${size}px;left:${x+xOff}px;bottom:${yBase+Math.random()*14}px;--duration:${dur}s;animation-duration:${dur}s;`;
    container.appendChild(b);
    setTimeout(() => { if (b.parentNode) b.parentNode.removeChild(b); }, dur * 1000 + 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
