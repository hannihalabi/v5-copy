(function () {
  function applyImmediateReveal(elements) {
    elements.forEach((el) => el.classList.add("is-visible"));
  }

  function initViewportAnimations() {
    const animatedElements = document.querySelectorAll("[data-animate]");
    if (!animatedElements.length) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
      applyImmediateReveal(animatedElements);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    animatedElements.forEach((element) => {
      observer.observe(element);
    });

    prefersReducedMotion.addEventListener("change", () => {
      if (prefersReducedMotion.matches) {
        applyImmediateReveal(animatedElements);
        observer.disconnect();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initViewportAnimations);
})();
