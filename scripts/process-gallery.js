(function () {
  function setupLightbox() {
    const element = document.querySelector("[data-lightbox]");
    if (!element) return null;

    const image = element.querySelector("[data-lightbox-image]");
    const closeBtn = element.querySelector("[data-lightbox-close]");

    const toggleBodyScroll = (disable) => {
      document.body.classList.toggle("no-scroll", disable);
    };

    const open = (src, alt) => {
      if (!image) return;
      image.src = src;
      image.alt = alt || "";
      element.classList.add("is-visible");
      element.setAttribute("aria-hidden", "false");
      toggleBodyScroll(true);
    };

    const close = () => {
      if (image) {
        image.removeAttribute("src");
      }
      element.classList.remove("is-visible");
      element.setAttribute("aria-hidden", "true");
      toggleBodyScroll(false);
    };

    const handleKey = (event) => {
      if (event.key === "Escape" && element.classList.contains("is-visible")) {
        close();
      }
    };

    element.addEventListener("click", (event) => {
      if (event.target === element) {
        close();
      }
    });

    closeBtn?.addEventListener("click", close);
    document.addEventListener("keydown", handleKey);

    return {
      open,
      close,
    };
  }

  function initCarousel(wrapper, lightbox) {
    const track = wrapper.querySelector(".process-gallery__grid");
    if (!track) return;

    const items = Array.from(track.querySelectorAll(".process-gallery__item"));
    if (!items.length) return;

    items.forEach((item) => item.removeAttribute("hidden"));
    wrapper.querySelector("[data-gallery-more]")?.setAttribute("hidden", "");

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const autoplayInterval = 3200;
    let autoplayTimer = null;

    const getGap = () => {
      const style = window.getComputedStyle(track);
      return parseFloat(style.columnGap || style.gap) || 0;
    };

    const getStep = () => {
      const first = items[0];
      const rect = first.getBoundingClientRect();
      return rect.width + getGap();
    };

    const moveNext = () => {
      const step = getStep();
      const maxScroll = track.scrollWidth - track.clientWidth;
      const tolerance = 4;
      if (step <= 0 || maxScroll <= tolerance) return;

      const nextLeft = track.scrollLeft + step;
      track.scrollTo({
        left: nextLeft >= maxScroll - tolerance ? 0 : nextLeft,
        behavior: "smooth",
      });
    };

    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const startAutoplay = () => {
      if (prefersReducedMotion.matches || items.length <= 1) {
        stopAutoplay();
        return;
      }
      stopAutoplay();
      autoplayTimer = window.setInterval(moveNext, autoplayInterval);
    };

    const centerSlide = (element, behavior = "auto") => {
      if (!element) return;
      const scrollValue =
        element.offsetLeft +
        element.offsetWidth / 2 -
        track.clientWidth / 2;
      track.scrollTo({
        left: Math.max(0, scrollValue),
        behavior,
      });
    };

    const datasetStart = Number(wrapper.dataset.galleryStart);
    const startIndex = Number.isFinite(datasetStart)
      ? Math.max(0, Math.min(datasetStart, items.length - 1))
      : 0;

    const centerStartSlide = () => {
      centerSlide(items[startIndex], "auto");
    };

    track.addEventListener("pointerenter", stopAutoplay);
    track.addEventListener("pointerleave", startAutoplay);
    track.addEventListener("touchstart", stopAutoplay, { passive: true });
    track.addEventListener("touchend", startAutoplay);

    const handleResize = () => {
      startAutoplay();
      centerStartSlide();
    };

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(track);
    } else {
      window.addEventListener("resize", handleResize);
    }

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", startAutoplay);
    } else if (typeof prefersReducedMotion.addListener === "function") {
      prefersReducedMotion.addListener(startAutoplay);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    const updateAspectFromImage = (img, item) => {
      const applyAspect = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
          return;
        }
        item.style.setProperty(
          "--process-gallery-aspect",
          `${img.naturalWidth} / ${img.naturalHeight}`
        );
      };

      if (img.complete) {
        applyAspect();
      } else {
        img.addEventListener("load", applyAspect, { once: true });
      }
    };

    items.forEach((item) => {
      const img = item.querySelector("img");
      if (!img) return;
      updateAspectFromImage(img, item);
      item.style.cursor = "pointer";
      item.addEventListener("click", () => {
        const src = img.currentSrc || img.src;
        if (src && lightbox?.open) {
          lightbox.open(src, img.alt);
        }
      });
    });

    track.scrollTo({ left: 0 });
    centerStartSlide();
    startAutoplay();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const lightbox = setupLightbox();
    document.querySelectorAll("[data-gallery-grid]").forEach((grid) => {
      initCarousel(grid, lightbox);
    });
  });
})();
