(function () {
    if (typeof window === "undefined" || typeof window.fetch !== "function" || typeof window.FormData === "undefined") {
        return;
    }

    const forms = document.querySelectorAll("[data-lead-form]");
    if (!forms.length) {
        return;
    }

    forms.forEach((form) => {
        const messageContainer = form.querySelector("[data-form-message]");
        const submitButton = form.querySelector("[data-cta='lead-form']");

        if (!messageContainer || !submitButton) {
            return;
        }

        const originalButtonText = submitButton.textContent;
        const loadingText = submitButton.getAttribute("data-loading-text") || "Skickar...";
        const successMessage = form.dataset.successMessage ||
            "Tack! Vi har mottagit din förfrågan och återkommer inom kort.";
        const errorMessage = form.dataset.errorMessage ||
            "Oj! Något gick fel. Försök igen eller mejla oss direkt.";
        const fileErrorMessage = form.dataset.fileErrorMessage ||
            "Bifoga max 3 bilder i jpg, png eller webp. Varje bild får vara högst 1,5 MB och totalt högst 3 MB.";
        const maxFiles = Number(form.dataset.maxFiles || 3);
        const maxFileSize = Number(form.dataset.maxFileSize || 1572864);
        const maxTotalFileSize = Number(form.dataset.maxTotalFileSize || 3145728);
        const allowedFileTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

        let isSubmitting = false;
        let hideTimeoutId = null;

        const hideMessage = () => {
            if (hideTimeoutId) {
                clearTimeout(hideTimeoutId);
                hideTimeoutId = null;
            }
            messageContainer.style.display = "none";
            messageContainer.className = "form-message";
            messageContainer.textContent = "";
        };

        const showMessage = (type, text) => {
            if (hideTimeoutId) {
                clearTimeout(hideTimeoutId);
                hideTimeoutId = null;
            }
            messageContainer.textContent = text;
            messageContainer.className = `form-message form-message--${type}`;
            messageContainer.style.display = "block";

            if (type === "success") {
                hideTimeoutId = window.setTimeout(() => {
                    hideMessage();
                }, 8000);
            }
        };

        const setLoading = (isLoading) => {
            if (isLoading) {
                submitButton.disabled = true;
                submitButton.textContent = loadingText;
                submitButton.classList.add("is-loading");
            } else {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                submitButton.classList.remove("is-loading");
            }
        };

        const validateFiles = () => {
            const fileInputs = form.querySelectorAll("input[type='file']");
            const files = [];

            fileInputs.forEach((input) => {
                if (input.files) {
                    files.push(...Array.from(input.files));
                }
            });

            if (!files.length) {
                return null;
            }

            if (files.length > maxFiles) {
                return fileErrorMessage;
            }

            let totalSize = 0;
            for (const file of files) {
                totalSize += file.size;
                if (!allowedFileTypes.has(file.type) || file.size > maxFileSize || totalSize > maxTotalFileSize) {
                    return fileErrorMessage;
                }
            }

            return null;
        };

        const handleSubmit = async (event) => {
            event.preventDefault();
            if (isSubmitting) {
                return;
            }

            isSubmitting = true;
            setLoading(true);
            hideMessage();

            try {
                const fileValidationError = validateFiles();
                if (fileValidationError) {
                    throw new Error(fileValidationError);
                }

                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: form.method || "POST",
                    headers: {
                        Accept: "application/json",
                    },
                    body: formData,
                });

                let payload = null;
                try {
                    payload = await response.json();
                } catch (parseError) {
                    payload = null;
                }

                if (!response.ok || (payload && payload.success === false)) {
                    const serverMessage = response.status < 500 && payload && payload.message ? payload.message : null;
                    const fallbackMessage = response.status >= 500 ? errorMessage : `Servern svarade med ${response.status}`;
                    throw new Error(serverMessage || fallbackMessage);
                }

                showMessage("success", payload && payload.message ? payload.message : successMessage);
                form.reset();
                form.querySelectorAll("input[type='file']").forEach((input) => {
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                });
            } catch (error) {
                console.error("Lead form submission failed", error);
                showMessage("error", error && error.message ? error.message : errorMessage);
            } finally {
                setLoading(false);
                isSubmitting = false;
            }
        };

        form.addEventListener("submit", handleSubmit);
    });
})();
