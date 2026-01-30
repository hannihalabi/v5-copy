(() => {
  const navToggle = document.querySelector("[data-blog-nav-toggle]");
  const nav = document.getElementById("blog-nav");

  if (!navToggle || !nav) {
    return;
  }

  const mobileQuery = window.matchMedia("(max-width: 720px)");

  const openMenu = () => {
    navToggle.setAttribute("aria-expanded", "true");
    nav.classList.add("is-open");
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    navToggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    if (restoreFocus) {
      navToggle.focus();
    }
  };

  const syncState = () => {
    if (!mobileQuery.matches) {
      closeMenu();
    }
  };

  navToggle.addEventListener("click", () => {
    const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest(".blog-header__link") &&
      mobileQuery.matches
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      navToggle.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu({ restoreFocus: true });
    }
  });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", syncState);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(syncState);
  }

  syncState();
})();
