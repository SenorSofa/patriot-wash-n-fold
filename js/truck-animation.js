/* ============================================================
   PATRIOT WASH N FOLD — Truck Drive-Across Animation
   Triggers when the truck section scrolls into view.
   Creates soap bubble trail as the truck drives across.
   ============================================================ */

(function() {
  'use strict';

  let hasPlayed = false;

  function initTruckAnimation() {
    const section  = document.getElementById('truck-drive-section');
    const truck    = document.getElementById('truck-animated');
    const bubbleCt = document.getElementById('bubble-trail');

    if (!section || !truck || !bubbleCt) return;

    // Observe when section enters viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasPlayed) {
          hasPlayed = true;
          playTruckAnimation(truck, bubbleCt);
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(section);
  }

  function playTruckAnimation(truck, bubbleCt) {
    // Reset position
    truck.style.left = '-260px';
    truck.style.transform = 'translateX(0)';

    // Small delay before starting
    setTimeout(() => {
      const vw = window.innerWidth;
      const duration = 3200; // ms
      const startTime = performance.now();
      const totalDistance = vw + 320;

      // Animate truck position
      function animateTruck(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-in-out cubic
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const x = eased * totalDistance;
        truck.style.transform = `translateX(${x}px)`;

        // Spawn bubbles while truck is on screen
        if (progress > 0.05 && progress < 0.92) {
          const truckX = -260 + x;
          const truckRight = truckX + 220; // right edge of truck

          // Spawn a bubble every ~120ms
          if (Math.random() < 0.25) {
            spawnBubble(bubbleCt, truckRight, 60);
          }
        }

        if (progress < 1) {
          requestAnimationFrame(animateTruck);
        } else {
          // Reset for next scroll (optional — remove if you want it to play only once)
          setTimeout(() => {
            truck.style.transform = 'translateX(0)';
            truck.style.left = '-260px';
            // Clear bubbles
            bubbleCt.innerHTML = '';
            hasPlayed = false;
          }, 1500);
        }
      }

      requestAnimationFrame(animateTruck);
    }, 300);
  }

  function spawnBubble(container, x, yBase) {
    const bubble = document.createElement('div');
    bubble.className = 'soap-bubble';

    const size = 8 + Math.random() * 18; // 8–26px
    const duration = 1.8 + Math.random() * 1.4; // 1.8–3.2s
    const xOffset = (Math.random() - 0.5) * 30;

    bubble.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x + xOffset}px;
      bottom: ${yBase + Math.random() * 20}px;
      --duration: ${duration}s;
      animation-duration: ${duration}s;
    `;

    container.appendChild(bubble);

    // Remove after animation
    setTimeout(() => {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
    }, duration * 1000 + 100);
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTruckAnimation);
  } else {
    initTruckAnimation();
  }

})();
