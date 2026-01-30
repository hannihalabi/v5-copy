document.addEventListener("DOMContentLoaded", function () {
    const lazyVideos = document.querySelectorAll("video.lazy-video");

    if ("IntersectionObserver" in window) {
        const videoObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (video) {
                if (video.isIntersecting) {
                    const videoElement = video.target;

                    // Move data-src to src
                    if (videoElement.dataset.src) {
                        videoElement.src = videoElement.dataset.src;
                    }

                    // Handle source elements inside video
                    const sources = videoElement.querySelectorAll("source");
                    sources.forEach(source => {
                        if (source.dataset.src) {
                            source.src = source.dataset.src;
                        }
                    });

                    videoElement.load();

                    // Attempt to play if it's an autoplay video
                    if (videoElement.hasAttribute("autoplay")) {
                        const playPromise = videoElement.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                console.log("Autoplay prevented or video not ready:", error);
                            });
                        }
                    }

                    videoElement.classList.remove("lazy-video");
                    observer.unobserve(videoElement);
                }
            });
        });

        lazyVideos.forEach(function (video) {
            videoObserver.observe(video);
        });
    } else {
        // Fallback for older browsers: load all immediately
        lazyVideos.forEach(function (videoElement) {
            if (videoElement.dataset.src) {
                videoElement.src = videoElement.dataset.src;
            }
            const sources = videoElement.querySelectorAll("source");
            sources.forEach(source => {
                if (source.dataset.src) {
                    source.src = source.dataset.src;
                }
            });
            videoElement.load();
        });
    }
});
