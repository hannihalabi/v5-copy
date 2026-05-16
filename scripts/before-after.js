(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function interpolateStops(stops, progress) {
    if (progress <= 0) return stops[0].value;
    if (progress >= 1) return stops[stops.length - 1].value;

    for (let index = 0; index < stops.length - 1; index += 1) {
      const current = stops[index];
      const next = stops[index + 1];

      if (progress >= current.at && progress <= next.at) {
        const segmentProgress = (progress - current.at) / (next.at - current.at);
        return current.value + (next.value - current.value) * segmentProgress;
      }
    }

    return stops[stops.length - 1].value;
  }

  function initBeforeAfter(compare) {
    const stage = compare.querySelector(".before-after-compare__stage");
    const range = compare.querySelector("[data-before-after-range]");

    if (!stage || !range) {
      return;
    }

    const setPosition = (value) => {
      const numericValue = clamp(Number(value) || 50, 0, 100);
      const roundedValue = Math.round(numericValue);

      stage.style.setProperty("--before-after-position", `${numericValue}%`);
      range.setAttribute(
        "aria-valuetext",
        `${roundedValue}% före, ${100 - roundedValue}% efter`
      );
    };

    const updateFromRange = () => {
      setPosition(range.value);
    };

    let hintTimeoutId = null;
    let hintRafId = null;
    let hintObserver = null;
    let hintHasPlayed = false;
    let isDragging = false;
    let activePointerId = null;
    let userHasInteracted = false;

    const stopHintAnimation = () => {
      if (hintTimeoutId !== null) {
        window.clearTimeout(hintTimeoutId);
        hintTimeoutId = null;
      }
      if (hintRafId !== null) {
        window.cancelAnimationFrame(hintRafId);
        hintRafId = null;
      }
    };

    const stopHintObserver = () => {
      if (hintObserver) {
        hintObserver.disconnect();
        hintObserver = null;
      }
    };

    const markInteracted = () => {
      if (userHasInteracted) return;
      userHasInteracted = true;
      stopHintAnimation();
      stopHintObserver();
    };

    range.addEventListener("input", () => {
      markInteracted();
      updateFromRange();
    });
    range.addEventListener("change", () => {
      markInteracted();
      updateFromRange();
    });

    range.addEventListener("keydown", markInteracted);

    const updateFromClientX = (clientX) => {
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const offsetX = clamp(clientX - rect.left, 0, rect.width);
      const nextValue = (offsetX / rect.width) * 100;

      range.value = String(nextValue);
      setPosition(nextValue);
    };

    const endDrag = (event) => {
      if (!isDragging) {
        return;
      }
      if (event && activePointerId !== null && event.pointerId !== activePointerId) {
        return;
      }

      if (activePointerId !== null) {
        try {
          stage.releasePointerCapture(activePointerId);
        } catch (error) {
          // Ignore release errors when pointer capture is already gone.
        }
      }
      isDragging = false;
      activePointerId = null;
    };

    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      markInteracted();
      isDragging = true;
      activePointerId = event.pointerId;
      stage.setPointerCapture?.(activePointerId);
      updateFromClientX(event.clientX);
      range.focus();
      event.preventDefault();
    });

    stage.addEventListener("pointermove", (event) => {
      if (!isDragging || event.pointerId !== activePointerId) {
        return;
      }
      updateFromClientX(event.clientX);
    });

    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("lostpointercapture", endDrag);

    stage.addEventListener("click", (event) => {
      if (isDragging) {
        return;
      }
      markInteracted();
      updateFromClientX(event.clientX);
      range.focus();
    });

    setPosition(range.value);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (!prefersReducedMotion.matches) {
      const animationStops = [
        { at: 0, value: 50 },
        { at: 0.3, value: 62 },
        { at: 0.65, value: 38 },
        { at: 1, value: 50 },
      ];
      const totalDuration = 1800;

      const startHintAnimation = () => {
        if (userHasInteracted || hintHasPlayed) {
          return;
        }
        hintHasPlayed = true;

        stopHintAnimation();
        hintTimeoutId = window.setTimeout(() => {
          if (userHasInteracted) return;

          const animationStart = performance.now();

          const runHint = (now) => {
            if (userHasInteracted) return;

            const progress = clamp((now - animationStart) / totalDuration, 0, 1);
            const value = interpolateStops(animationStops, progress);

            range.value = String(value);
            setPosition(value);

            if (progress < 1) {
              hintRafId = window.requestAnimationFrame(runHint);
              return;
            }

            hintRafId = null;
            setPosition(50);
            range.value = "50";
          };

          hintRafId = window.requestAnimationFrame(runHint);
        }, 450);
      };

      if ("IntersectionObserver" in window) {
        hintObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return;
              }
              startHintAnimation();
              stopHintObserver();
            });
          },
          {
            threshold: 0.4,
          }
        );
        hintObserver.observe(compare);
      } else {
        startHintAnimation();
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-before-after]").forEach((compare) => {
      initBeforeAfter(compare);
    });
  });
})();
