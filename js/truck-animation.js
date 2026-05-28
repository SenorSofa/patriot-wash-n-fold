/* ============================================================
   PATRIOT WASH N FOLD — Truck Animation v4
   Truck faces RIGHT. Drives in from LEFT. Stops center.
   Bag drops from the BACK = LEFT side of truck.
   Truck drives off to the RIGHT.
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

  function runSequence(truck, bag, bubbleCt, section) {
    const vw     = window.innerWidth;
    const truckW = Math.min(240, vw * 0.50);
    // Stop position: center-ish of screen
    const stopX  = Math.round(vw * 0.38);

    truck.style.width     = truckW + 'px';
    truck.style.left      = (-truckW - 30) + 'px'; // off-screen LEFT
    truck.style.transform = 'none';                 // faces right naturally

    phaseIn(truck, bag, bubbleCt, section, vw, truckW, stopX);
  }

  /* Phase 1: Drive in from LEFT → stop at stopX */
  function phaseIn(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    const startX   = -(parseInt(truck.style.width) + 30);
    const duration = 2200;
    const start    = performance.now();
    let   lastBub  = 0;

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3); // ease-out
      const x = startX + (stopX - startX) * e;
      truck.style.left = x + 'px';

      // Bubbles trail from the BACK = LEFT side of truck (x position)
      if (now - lastBub > 110) {
        lastBub = now;
        spawnBubble(bubbleCt, x - 8, 50);
      }

      if (t < 1) requestAnimationFrame(tick);
      else {
        truck.style.left = stopX + 'px';
        phaseLurch(truck, bag, bubbleCt, section, vw, truckW, stopX);
      }
    }
    requestAnimationFrame(tick);
  }

  /* Phase 2: Lurch stop — nose dips, rear lifts */
  function phaseLurch(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    const overshoot = 16;
    const maxTilt   = 3.5; // degrees — nose dips (clockwise since facing right)

    animateMulti(160, 'easeOut', (p) => {
      truck.style.left      = (stopX + overshoot * p) + 'px';
      truck.style.transform = `rotate(${maxTilt * p}deg)`;
    }, () => {
      animateMulti(260, 'spring', (p) => {
        const x   = (stopX + overshoot) - overshoot * 1.05 * p;
        const deg = maxTilt * (1 - p);
        truck.style.left      = x + 'px';
        truck.style.transform = `rotate(${deg}deg)`;
      }, () => {
        truck.style.left      = stopX + 'px';
        truck.style.transform = 'rotate(0deg)';
        setTimeout(() => phaseDropBag(truck, bag, bubbleCt, section, vw, truckW, stopX), 200);
      });
    });
  }

  /* Phase 3: Drop bag from BACK (LEFT side) of truck */
  function phaseDropBag(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    setTimeout(() => {
      if (bag) {
        const sectionEl = document.getElementById('truck-drive-section');
        const sH = sectionEl ? sectionEl.offsetHeight : 160;
        const bagW = Math.round(truckW * 0.28);

        // Back of truck = LEFT edge = stopX
        const bagX = stopX - bagW * 0.5;

        bag.style.width   = bagW + 'px';
        bag.style.left    = bagX + 'px';
        bag.style.bottom  = (sH - 35) + 'px';
        bag.style.display = 'block';
        bag.style.opacity = '1';
        bag.style.transform = 'rotate(8deg)';

        dropBag(bag, sH, () => {
          setTimeout(() => phaseLaunch(truck, bag, bubbleCt, section, vw, truckW, stopX), 700);
        });
      } else {
        setTimeout(() => phaseLaunch(truck, bag, bubbleCt, section, vw, truckW, stopX), 500);
      }
    }, 350);
  }

  function dropBag(bag, sH, cb) {
    const endBottom = 12;
    animateMulti(280, 'easeIn', (p) => {
      bag.style.bottom    = ((sH - 35) - ((sH - 35) - endBottom - 10) * p) + 'px';
      bag.style.transform = `rotate(${8 - 14 * p}deg)`;
    }, () => {
      animateMulti(120, 'easeOut', (p) => {
        bag.style.bottom    = (endBottom - 10 + 22 * (1 - p)) + 'px';
        bag.style.transform = `rotate(${-6 + 6 * p}deg)`;
      }, () => {
        animateMulti(90, 'easeOut', (p) => {
          bag.style.bottom    = (endBottom + 12 - 12 * p) + 'px';
          bag.style.transform = 'rotate(0deg)';
        }, () => {
          bag.style.bottom = endBottom + 'px';
          cb();
        });
      });
    });
  }

  /* Phase 4: Launch RIGHT — front wheels lift briefly */
  function phaseLaunch(truck, bag, bubbleCt, section, vw, truckW, stopX) {
    const liftDeg = 3.5; // front lifts = counter-clockwise (negative) when facing right

    animateMulti(160, 'easeOut', (p) => {
      truck.style.transform = `rotate(${-liftDeg * p}deg)`;
    }, () => {
      const endX    = vw + truckW + 40;
      const launchStart = performance.now();
      const duration    = 1500;
      let   lastBub     = 0;

      function launchTick(now) {
        const t = Math.min((now - launchStart) / duration, 1);
        const e = t * t; // ease-in: accelerate
        const x = stopX + (endX - stopX) * e;
        const rotT = Math.min(t / 0.3, 1);
        const deg  = -liftDeg * (1 - rotT);
        truck.style.left      = x + 'px';
        truck.style.transform = `rotate(${deg}deg)`;

        // Bubbles from back (LEFT side = x position)
        if (now - lastBub > 90) {
          lastBub = now;
          spawnBubble(bubbleCt, x - 8, 50);
        }

        if (t < 1) requestAnimationFrame(launchTick);
        else phaseEnd(truck, bag, bubbleCt, section, vw, truckW);
      }
      requestAnimationFrame(launchTick);
    });
  }

  /* Phase 5: End — fade bag, reset */
  function phaseEnd(truck, bag, bubbleCt, section, vw, truckW) {
    if (bag) {
      bag.style.transition = 'opacity 1.2s ease';
      bag.style.opacity    = '0';
      setTimeout(() => {
        bag.style.display    = 'none';
        bag.style.transition = '';
        bag.style.opacity    = '1';
      }, 1300);
    }
    setTimeout(() => {
      truck.style.left      = (-truckW - 30) + 'px';
      truck.style.transform = 'none';
      if (bubbleCt) bubbleCt.innerHTML = '';
      hasPlayed = false;
      if (observerRef) observerRef.observe(section);
    }, 2000);
  }

  /* Utility: animate over time */
  function animateMulti(duration, easing, onUpdate, onComplete) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      let e;
      if (easing === 'easeIn')  e = t * t;
      else if (easing === 'easeOut') e = 1 - (1 - t) * (1 - t);
      else if (easing === 'spring')  e = springEase(t);
      else e = t;
      onUpdate(e);
      if (t < 1) requestAnimationFrame(tick);
      else if (onComplete) onComplete();
    }
    requestAnimationFrame(tick);
  }

  function springEase(t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -8 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

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
