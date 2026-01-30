(function () {
  function initGallery(gallery) {
    const track = gallery.querySelector(".media-gallery__track");
    const viewport = gallery.querySelector(".media-gallery__viewport");
    const prevBtn = gallery.querySelector("[data-gallery-prev]");
    const nextBtn = gallery.querySelector("[data-gallery-next]");

    if (!track || !viewport) {
      return;
    }

    const slides = Array.from(track.querySelectorAll("[data-gallery-slide]"));
    const datasetStart = Number(gallery.dataset.galleryStart);
    const startIndex = Number.isFinite(datasetStart)
      ? Math.max(0, Math.min(datasetStart, slides.length - 1))
      : Math.min(1, Math.max(0, slides.length - 1));

    const updateButtons = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const tolerance = 4;
      if (prevBtn) {
        prevBtn.disabled = track.scrollLeft <= tolerance;
      }
      if (nextBtn) {
        nextBtn.disabled =
          track.scrollLeft >= maxScroll - tolerance || maxScroll <= 0;
      }
    };

    const centerSlide = (element, behavior = "auto") => {
      if (!element) return;
      const slideRect = element.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const delta =
        slideRect.left -
        viewportRect.left -
        (viewportRect.width - slideRect.width) / 2;
      const targetScroll = track.scrollLeft + delta;
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      track.scrollTo({
        left: Math.min(Math.max(targetScroll, 0), maxScroll),
        behavior,
      });
    };

    const centerStartSlide = (behavior = "auto") => {
      const targetIndex = Math.min(startIndex, slides.length - 1);
      centerSlide(slides[targetIndex], behavior);
    };

    const scheduleCenterStartSlide = (behavior = "auto") => {
      requestAnimationFrame(() => centerStartSlide(behavior));
    };

    const getStep = () => Math.max(viewport.clientWidth * 0.85, 1);

    const scrollByStep = (direction) => {
      track.scrollBy({
        left: direction * getStep(),
        behavior: "smooth",
      });
    };

    const findActiveIndex = () => {
      const viewportRect = viewport.getBoundingClientRect();
      let nearestIndex = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const rect = slide.getBoundingClientRect();
        const distance = Math.abs(rect.left - viewportRect.left);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = index;
        }
      });

      return nearestIndex;
    };

    const syncVideos = () => {
      const activeIndex = findActiveIndex();
      slides.forEach((slide, index) => {
        const video = slide.querySelector("video");
        if (!video) return;
        if (index === activeIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      });
    };

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        scrollByStep(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        scrollByStep(1);
      });
    }

    track.addEventListener("scroll", () => {
      updateButtons();
      syncVideos();
    });

    const handleResize = () => {
      updateButtons();
      syncVideos();
      scheduleCenterStartSlide();
    };

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(track);
      resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", handleResize);
    }

    updateButtons();
    syncVideos();
    scheduleCenterStartSlide();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-gallery]").forEach((gallery) => {
      initGallery(gallery);
    });
  });
})();
