(function () {
  function initCarousel(carousel) {
    const track = carousel.querySelector(".pricing-carousel__track");
    const viewport = carousel.querySelector(".pricing-carousel__viewport");
    const prevBtn = carousel.querySelector("[data-carousel-prev]");
    const nextBtn = carousel.querySelector("[data-carousel-next]");

    if (!track || !viewport || !prevBtn || !nextBtn) {
      return;
    }

    const slides = Array.from(track.querySelectorAll("[data-carousel-slide]"));
    const autoplayIntervalAttr = parseInt(
      carousel.getAttribute("data-carousel-interval"),
      10
    );
    const baseInterval = Number.isFinite(autoplayIntervalAttr)
      ? autoplayIntervalAttr
      : 6500;
    const autoplayInterval = Math.round(baseInterval * 1.5);
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    let autoplayTimer = null;

    const updateButtons = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const tolerance = 4;
      prevBtn.disabled = track.scrollLeft <= tolerance;
      nextBtn.disabled = track.scrollLeft >= maxScroll - tolerance;
    };

    const getStep = () => Math.max(viewport.clientWidth * 0.85, 1);

    const scrollByStep = (direction) => {
      track.scrollBy({
        left: direction * getStep(),
        behavior: "smooth",
      });
    };

    const scrollForward = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 0) return;
      const tolerance = 4;
      if (track.scrollLeft >= maxScroll - tolerance) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByStep(1);
      }
    };

    const canAutoplay = () =>
      !desktopQuery.matches && track.scrollWidth > track.clientWidth + 5;

    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (!canAutoplay() || autoplayInterval <= 0 || slides.length <= 1) return;
      autoplayTimer = window.setInterval(scrollForward, autoplayInterval);
    };

    const restartAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    prevBtn.addEventListener("click", () => {
      scrollByStep(-1);
      restartAutoplay();
    });
    nextBtn.addEventListener("click", () => {
      scrollByStep(1);
      restartAutoplay();
    });

    track.addEventListener("scroll", () => {
      window.requestAnimationFrame(updateButtons);
    });

    track.addEventListener("pointerdown", stopAutoplay);
    track.addEventListener("pointerup", startAutoplay);
    track.addEventListener("pointercancel", startAutoplay);
    track.addEventListener("touchstart", stopAutoplay, { passive: true });
    track.addEventListener("touchend", startAutoplay);

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(updateButtons);
      resizeObserver.observe(track);
      resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", updateButtons);
    }

    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", startAutoplay);
    } else if (typeof desktopQuery.addListener === "function") {
      desktopQuery.addListener(startAutoplay);
    }

    updateButtons();
    startAutoplay();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll("[data-pricing-carousel]")
      .forEach((carousel) => initCarousel(carousel));
  });
})();
