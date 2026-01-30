(function () {
  function initHeroVideo() {
    const primaryIntro = document.querySelector("[data-hero-intro-primary]");
    const desktopIntro = document.querySelector("[data-hero-desktop-intro]");
    const mainVideo = document.querySelector("[data-hero-main]");

    if (!primaryIntro || !desktopIntro || !mainVideo) {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 900px)");
    let desktopListenersAdded = false;

    const hideAllDesktopVideos = () => {
      desktopIntro.classList.remove("is-visible");
      mainVideo.classList.remove("is-visible");
    };
    const showDesktopIntro = () => {
      hideAllDesktopVideos();
      desktopIntro.classList.add("is-visible");
    };
    const showMainDesktopVideo = () => {
      hideAllDesktopVideos();
      mainVideo.classList.add("is-visible");
    };

    const playDesktopIntro = () => {
      showDesktopIntro();
      desktopIntro.loop = false;
      desktopIntro.currentTime = 0;
      mainVideo.pause();
      desktopIntro.play().catch(() => {});
    };

    const playMainVideo = () => {
      showMainDesktopVideo();
      mainVideo.loop = false;
      mainVideo.currentTime = 0;
      desktopIntro.pause();
      mainVideo.play().catch(() => {});
    };

    const handleDesktopIntroEnded = () => {
      playMainVideo();
    };

    const handleMainVideoEnded = () => {
      playDesktopIntro();
    };

    const enableDesktopLoop = () => {
      if (!desktopListenersAdded) {
        desktopIntro.addEventListener("ended", handleDesktopIntroEnded);
        mainVideo.addEventListener("ended", handleMainVideoEnded);
        desktopListenersAdded = true;
      }
    };

    const disableDesktopLoop = () => {
      if (desktopListenersAdded) {
        desktopIntro.removeEventListener("ended", handleDesktopIntroEnded);
        mainVideo.removeEventListener("ended", handleMainVideoEnded);
        desktopListenersAdded = false;
      }
    };

    const showMobileIntro = () => {
      disableDesktopLoop();
      desktopIntro.pause();
      mainVideo.pause();
      hideAllDesktopVideos();
      primaryIntro.classList.add("is-visible");
      primaryIntro.loop = true;
      primaryIntro.preload = "metadata";
      primaryIntro.play().catch(() => {});
    };

    const startDesktopSequence = () => {
      primaryIntro.pause();
      primaryIntro.classList.remove("is-visible");
      enableDesktopLoop();
      playDesktopIntro();
    };

    const setMode = () => {
      if (desktopQuery.matches) {
        startDesktopSequence();
      } else {
        showMobileIntro();
      }
    };

    setMode();

    const handleMediaChange = () => {
      setMode();
    };

    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", handleMediaChange);
    } else if (typeof desktopQuery.addListener === "function") {
      desktopQuery.addListener(handleMediaChange);
    }
  }

  document.addEventListener("DOMContentLoaded", initHeroVideo);
})();
