(function () {
  function initSequence(container) {
    const slides = Array.from(container.querySelectorAll("[data-sequence-step]"));
    if (slides.length <= 1) return;

    const dots = Array.from(container.querySelectorAll("[data-sequence-dot]"));
    const intervalAttr = parseInt(container.getAttribute("data-sequence-interval"), 10);
    const baseInterval = Number.isFinite(intervalAttr) ? intervalAttr : 7000;
    const interval = Math.max(Math.round(baseInterval * 1.35), baseInterval + 1500);
    let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
    let timerId = null;

    if (activeIndex < 0) activeIndex = 0;

    const setActive = (nextIndex) => {
      activeIndex = nextIndex;
      slides.forEach((slide, idx) => {
        slide.classList.toggle("is-active", idx === activeIndex);
      });
      dots.forEach((dot, idx) => {
        dot.classList.toggle("is-active", idx === activeIndex);
        dot.setAttribute("aria-pressed", idx === activeIndex ? "true" : "false");
      });
    };

    const next = () => {
      setActive((activeIndex + 1) % slides.length);
    };

    const clearTimer = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const startTimer = () => {
      if (interval <= 0) return;
      clearTimer();
      timerId = window.setInterval(next, interval);
    };

    dots.forEach((dot, idx) => {
      dot.addEventListener("click", () => {
        setActive(idx);
        startTimer();
      });
    });

    setActive(activeIndex);
    startTimer();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-sequence]").forEach(initSequence);
  });
})();
