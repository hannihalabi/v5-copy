const recoCarousel = document.querySelector("[data-reco-carousel]");

if (recoCarousel) {
  const slides = Array.from(
    recoCarousel.querySelectorAll("[data-reco-slide]")
  );

  if (slides.length > 1) {
    let activeIndex = slides.findIndex((slide) =>
      slide.classList.contains("is-visible")
    );

    if (activeIndex === -1) {
      activeIndex = 0;
      slides[0].classList.add("is-visible");
    }

    const rotateSlide = () => {
      slides[activeIndex].classList.remove("is-visible");
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex].classList.add("is-visible");
    };

    setInterval(rotateSlide, 3000);
  }
}
