(function () {
  function initProcessCarousel(root) {
    const viewport = root.querySelector("[data-process-viewport]");
    const slides = Array.from(root.querySelectorAll("[data-process-slide]"));
    const tabs = Array.from(root.querySelectorAll("[data-process-tab]"));

    if (!viewport || slides.length <= 1) {
      return;
    }

    let activeIndex = 0;
    let scrollRaf = null;

    const setActiveIndex = (index, { scroll = true } = {}) => {
      if (index < 0 || index >= slides.length) return;
      activeIndex = index;
      tabs.forEach((tab, tabIndex) => {
        const isActive = tabIndex === index;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
        tab.setAttribute("tabindex", isActive ? "0" : "-1");
      });
      if (scroll) {
        const target = slides[index];
        viewport.scrollTo({
          left: target.offsetLeft,
          behavior: "smooth",
        });
      }
    };

    const getClosestSlideIndex = () => {
      const viewportRect = viewport.getBoundingClientRect();
      let closest = 0;
      let minDistance = Infinity;
      slides.forEach((slide, index) => {
        const rect = slide.getBoundingClientRect();
        const distance = Math.abs(rect.left - viewportRect.left);
        if (distance < minDistance) {
          minDistance = distance;
          closest = index;
        }
      });
      return closest;
    };

    const handleScroll = () => {
      if (scrollRaf) {
        cancelAnimationFrame(scrollRaf);
      }
      scrollRaf = requestAnimationFrame(() => {
        const closestIndex = getClosestSlideIndex();
        if (closestIndex !== activeIndex) {
          setActiveIndex(closestIndex, { scroll: false });
        }
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        setActiveIndex(index, { scroll: true });
      });
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (activeIndex + direction + slides.length) % slides.length;
        const nextTab = tabs[nextIndex];
        if (nextTab) {
          nextTab.focus();
        }
        setActiveIndex(nextIndex, { scroll: true });
      });
    });

    const syncScrollToActive = () => {
      const currentSlide = slides[activeIndex];
      if (!currentSlide) return;
      viewport.scrollTo({
        left: currentSlide.offsetLeft,
        behavior: "auto",
      });
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", syncScrollToActive);

    setActiveIndex(0, { scroll: false });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll("[data-process-carousel]")
      .forEach((carousel) => initProcessCarousel(carousel));
  });
})();
