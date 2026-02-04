const GUIDE_VIEWER_PDFJS_VERSION = "3.11.174";
const GUIDE_VIEWER_PDFJS_PATH = "/scripts/pdfjs";

(function initGuideViewer() {
  const viewerElements = document.querySelectorAll("[data-guide-viewer]");
  if (!viewerElements.length) {
    return;
  }

  const loadPdfJs = () => {
    if (window.pdfjsLib) {
      return Promise.resolve(window.pdfjsLib);
    }
    if (window.__pdfjsLoading) {
      return window.__pdfjsLoading;
    }
    window.__pdfjsLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.src = `${GUIDE_VIEWER_PDFJS_PATH}/pdf.min.js`;
      script.onload = () => {
        if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${GUIDE_VIEWER_PDFJS_PATH}/pdf.worker.min.js`;
        }
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js"));
      document.head.appendChild(script);
    });
    return window.__pdfjsLoading;
  };

  const showLoadError = (viewerEl, message) => {
    const loadingEl = viewerEl.querySelector("[data-guide-loading]");
    const prevBtn = viewerEl.querySelector("[data-guide-prev]");
    const nextBtn = viewerEl.querySelector("[data-guide-next]");
    if (loadingEl) {
      loadingEl.textContent = message;
    }
    if (prevBtn) {
      prevBtn.disabled = true;
    }
    if (nextBtn) {
      nextBtn.disabled = true;
    }
  };

  loadPdfJs()
    .then(() => {
      viewerElements.forEach((viewerEl) => {
        const pdfUrl = viewerEl.dataset.pdf;
        const canvasContainer = viewerEl.querySelector(".guide-preview__canvas");
        const canvas = canvasContainer ? canvasContainer.querySelector("canvas") : null;
        const loadingEl = viewerEl.querySelector("[data-guide-loading]");
        const statusEl = viewerEl.querySelector("[data-guide-page-status]");
        const prevBtn = viewerEl.querySelector("[data-guide-prev]");
        const nextBtn = viewerEl.querySelector("[data-guide-next]");
        const fallbackTotalPages = parseInt(viewerEl.dataset.totalPages || "0", 10);
        let totalPages = fallbackTotalPages > 0 ? fallbackTotalPages : 1;

        if (!pdfUrl || !window.pdfjsLib || !canvas || !canvasContainer) {
          showLoadError(viewerEl, "Kan inte visa guiden just nu.");
          return;
        }

        const ctx = canvas.getContext("2d");
        let pdfDoc = null;
        let currentPage = 1;
        let pendingPage = null;
        let isRendering = false;
        let resizeTimeout;

        const updateStatus = () => {
          if (statusEl) {
            statusEl.textContent = `Sida ${currentPage} / ${totalPages}`;
          }
        };

        const updateButtons = () => {
          if (prevBtn) {
            prevBtn.disabled = currentPage <= 1 || isRendering;
          }
          if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages || isRendering;
          }
        };

        const finalizeRender = () => {
          isRendering = false;
          if (loadingEl) {
            loadingEl.hidden = true;
          }
          updateStatus();
          updateButtons();
          if (pendingPage !== null) {
            const queuedPage = pendingPage;
            pendingPage = null;
            renderPage(queuedPage);
          }
        };

        const renderPage = (pageNumber) => {
          if (!pdfDoc) {
            return;
          }

          isRendering = true;
          if (loadingEl) {
            loadingEl.hidden = false;
          }

          pdfDoc
            .getPage(pageNumber)
            .then((page) => {
              const containerWidth = canvasContainer.clientWidth || 1;
              const unscaledViewport = page.getViewport({ scale: 1 });
              const cssScale = containerWidth / unscaledViewport.width;
              const deviceScale = window.devicePixelRatio || 1;
              const viewport = page.getViewport({ scale: cssScale * deviceScale });

              canvas.height = viewport.height;
              canvas.width = viewport.width;
              canvas.style.width = `${viewport.width / deviceScale}px`;
              canvas.style.height = `${viewport.height / deviceScale}px`;

              const renderContext = {
                canvasContext: ctx,
                viewport,
              };

              return page.render(renderContext).promise;
            })
            .then(finalizeRender)
            .catch((error) => {
              console.error("Guide PDF render error", error);
              if (loadingEl) {
                loadingEl.hidden = false;
                loadingEl.textContent = "Kunde inte visa guiden.";
              }
              if (prevBtn) {
                prevBtn.disabled = true;
              }
              if (nextBtn) {
                nextBtn.disabled = true;
              }
            });
        };

        const queueRender = (pageNumber) => {
          if (isRendering) {
            pendingPage = pageNumber;
            return;
          }
          renderPage(pageNumber);
        };

        if (prevBtn) {
          prevBtn.addEventListener("click", () => {
            if (currentPage <= 1) {
              return;
            }
            currentPage -= 1;
            queueRender(currentPage);
            updateButtons();
          });
        }

        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            if (currentPage >= totalPages) {
              return;
            }
            currentPage += 1;
            queueRender(currentPage);
            updateButtons();
          });
        }

        window.addEventListener("resize", () => {
          if (!pdfDoc) {
            return;
          }
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            queueRender(currentPage);
          }, 200);
        });

        updateStatus();
        updateButtons();

        window.pdfjsLib
          .getDocument(pdfUrl)
          .promise.then((doc) => {
            pdfDoc = doc;
            totalPages = doc.numPages || totalPages;
            updateStatus();
            updateButtons();
            renderPage(currentPage);
          })
          .catch((error) => {
            console.error("Guide PDF load error", error);
            if (loadingEl) {
              loadingEl.hidden = false;
              loadingEl.textContent = "Kunde inte ladda guiden.";
            }
            if (prevBtn) {
              prevBtn.disabled = true;
            }
            if (nextBtn) {
              nextBtn.disabled = true;
            }
          });
      });
    })
    .catch((error) => {
      console.error("Guide PDF load error", error);
      viewerElements.forEach((viewerEl) => {
        showLoadError(viewerEl, "Kunde inte ladda guiden.");
      });
    });
})();
