/* ============================================================
   PATRIOT WASH N FOLD — Truck Animation
   Sequence:
   1. Truck drives in from the RIGHT (facing left, moving left)
   2. Abrupt lurching stop at center
   3. Back door swings open (CSS transform)
   4. Laundry bag plops out and bounces
   5. Truck drives off to the LEFT
   6. Bag sits on the ground briefly, then fades
   7. Reset after a pause
   ============================================================ */

(function () {
  'use strict';

  let hasPlayed = false;

  function init() {
    const section   = document.getElementById('truck-drive-section');
    const truck     = document.getElementById('truck-animated');
    const door      = document.getElementById('truck-door');
    const bag       = document.getElementById('truck-bag-drop');
    const bubbleCt  = document.getElementById('bubble-trail');

    if (!section || !truck) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasPlayed) {
          hasPlayed = true;
          runSequence(truck, door, bag, bubbleCt, section);
          observer.disconnect();
        }
      });
    }, { threshold: 0.4 });

    observer.observe(section);
  }

  function runSequence(truck, door, bag, bubbleCt, section) {
    const vw = window.innerWidth;
    const truckW = Math.min(220, vw * 0.45);
    const stopX = vw * 0.42; // stop at ~42% from left = roughly center-left

    // ── Phase 1: Drive in from right ──────────────────────────
    // Truck starts off-screen right, faces LEFT (scaleX(-1) already in CSS)
    // We move it from right edge to stopX

    const startX = vw + 20;
    truck.style.width = truckW + 'px';
    truck.style.left  = startX + 'px';
    truck.style.transform = 'translateX(0)';

    const driveInDuration = 2000; // ms
    const driveInStart = performance.now();

    let bubbleTimer = 0;

    function phaseIn(now) {
      const elapsed  = now - driveInStart;
      const progress = Math.min(elapsed / driveInDuration, 1);
      // Ease-out: fast start, slow near stop
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentX = startX - (startX - stopX) * eased;
      truck.style.left = currentX + 'px';

      // Bubble trail from the BACK of the truck (right side since truck faces left)
      bubbleTimer += now - (bubbleTimer === 0 ? now - 16 : bubbleTimer);
      if (elapsed - bubbleTimer > 120) {
        bubbleTimer = elapsed;
        spawnBubble(bubbleCt, currentX + truckW + 5, 55);
      }

      if (progress < 1) {
        requestAnimationFrame(phaseIn);
      } else {
        // ── Phase 2: Lurch stop ──────────────────────────────
        lurchStop(truck, stopX, truckW, door, bag, bubbleCt, vw);
      }
    }

    requestAnimationFrame(phaseIn);
  }

  function lurchStop(truck, stopX, truckW, door, bag, bubbleCt, vw) {
    // Overshoot forward (left) then bounce back
    const overshoot = 28;
    const lurchDuration = 180;
    const bounceDuration = 140;

    // Lurch forward
    animateValue(0, -overshoot, lurchDuration, 'linear', (v) => {
      truck.style.left = (stopX + v) + 'px';
    }, () => {
      // Bounce back
      animateValue(-overshoot, 8, bounceDuration, 'easeOut', (v) => {
        truck.style.left = (stopX + v) + 'px';
      }, () => {
        // Settle
        animateValue(8, 0, 100, 'easeOut', (v) => {
          truck.style.left = (stopX + v) + 'px';
        }, () => {
          // ── Phase 3: Door opens ──────────────────────────
          openDoorAndDropBag(truck, door, bag, bubbleCt, stopX, truckW, vw);
        });
      });
    });
  }

  function openDoorAndDropBag(truck, door, bag, bubbleCt, stopX, truckW, vw) {
    if (door) {
      door.style.transition = 'transform 0.4s ease-out';
      door.style.transformOrigin = 'left center';
      door.style.transform = 'perspective(200px) rotateY(-55deg)';
    }

    // After door opens, drop the bag
    setTimeout(() => {
      if (bag) {
        // Position bag at the back of the truck (left side since truck faces left)
        const bagLeft = stopX - 10;
        const sectionH = truck.closest
          ? truck.closest('#truck-drive-section').offsetHeight
          : 160;
        const groundY = sectionH - 52; // ground level

        bag.style.display = 'block';
        bag.style.left = bagLeft + 'px';
        bag.style.bottom = (sectionH - 30) + 'px'; // start at truck bed height
        bag.style.opacity = '1';

        // Plop down with bounce
        dropBag(bag, groundY, sectionH, () => {
          // ── Phase 4: Truck drives off left ──────────────
          setTimeout(() => {
            driveOff(truck, door, bag, bubbleCt, stopX, truckW, vw);
          }, 600);
        });
      } else {
        setTimeout(() => {
          driveOff(truck, door, bag, bubbleCt, stopX, truckW, vw);
        }, 400);
      }
    }, 500);
  }

  function dropBag(bag, groundY, sectionH, cb) {
    const startBottom = sectionH - 30;
    const endBottom   = 14; // resting on ground
    const fallDuration = 320;

    animateValue(startBottom, endBottom + 18, fallDuration * 0.6, 'easeIn', (v) => {
      bag.style.bottom = v + 'px';
    }, () => {
      // Bounce
      animateValue(endBottom + 18, endBottom - 8, 120, 'easeOut', (v) => {
        bag.style.bottom = v + 'px';
      }, () => {
        animateValue(endBottom - 8, endBottom, 100, 'easeOut', (v) => {
          bag.style.bottom = v + 'px';
        }, cb);
      });
    });
  }

  function driveOff(truck, door, bag, bubbleCt, stopX, truckW, vw) {
    // Close door first
    if (door) {
      door.style.transition = 'transform 0.25s ease-in';
      door.style.transform = 'perspective(200px) rotateY(0deg)';
    }

    setTimeout(() => {
      const endX = -truckW - 40;
      const driveOffDuration = 1600;
      const start = performance.now();
      const startPos = stopX;

      let bubbleTimer2 = 0;

      function phaseOut(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / driveOffDuration, 1);
        // Ease-in: accelerate away
        const eased = progress * progress;

        const currentX = startPos - (startPos - endX) * eased;
        truck.style.left = currentX + 'px';

        if (elapsed - bubbleTimer2 > 100) {
          bubbleTimer2 = elapsed;
          spawnBubble(bubbleCt, currentX + truckW + 5, 55);
        }

        if (progress < 1) {
          requestAnimationFrame(phaseOut);
        } else {
          // Fade bag out
          if (bag) {
            bag.style.transition = 'opacity 1.2s ease';
            bag.style.opacity = '0';
            setTimeout(() => { bag.style.display = 'none'; }, 1300);
          }
          // Reset after pause so it can play again on next scroll
          setTimeout(() => {
            truck.style.left = (vw + 20) + 'px';
            if (door) door.style.transform = '';
            if (bubbleCt) bubbleCt.innerHTML = '';
            hasPlayed = false;
            // Re-observe
            const section = document.getElementById('truck-drive-section');
            if (section) {
              const obs2 = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                  if (e.isIntersecting && !hasPlayed) {
                    hasPlayed = true;
                    runSequence(truck, door, bag, bubbleCt, section);
                    obs2.disconnect();
                  }
                });
              }, { threshold: 0.4 });
              obs2.observe(section);
            }
          }, 2500);
        }
      }

      requestAnimationFrame(phaseOut);
    }, 300);
  }

  /* ── Utility: animate a value over time ────────────────────── */
  function animateValue(from, to, duration, easing, onUpdate, onComplete) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      let e;
      if (easing === 'easeIn')  e = t * t;
      else if (easing === 'easeOut') e = 1 - (1 - t) * (1 - t);
      else e = t; // linear
      onUpdate(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(tick);
      else if (onComplete) onComplete();
    }
    requestAnimationFrame(tick);
  }

  /* ── Bubble spawner ─────────────────────────────────────────── */
  function spawnBubble(container, x, yBase) {
    if (!container) return;
    const bubble = document.createElement('div');
    bubble.className = 'soap-bubble';
    const size     = 7 + Math.random() * 16;
    const duration = 1.6 + Math.random() * 1.4;
    const xOff     = (Math.random() - 0.5) * 24;
    bubble.style.cssText = `
      width:${size}px; height:${size}px;
      left:${x + xOff}px;
      bottom:${yBase + Math.random() * 16}px;
      --duration:${duration}s;
      animation-duration:${duration}s;
    `;
    container.appendChild(bubble);
    setTimeout(() => { if (bubble.parentNode) bubble.parentNode.removeChild(bubble); }, duration * 1000 + 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
