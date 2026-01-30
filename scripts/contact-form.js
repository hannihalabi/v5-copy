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

        const handleSubmit = async (event) => {
            event.preventDefault();
            if (isSubmitting) {
                return;
            }

            isSubmitting = true;
            setLoading(true);
            hideMessage();

            try {
                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: form.method || "POST",
                    headers: {
                        Accept: "application/json",
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`FormSubmit responded with ${response.status}`);
                }

                showMessage("success", successMessage);
                form.reset();
            } catch (error) {
                console.error("Lead form submission failed", error);
                showMessage("error", errorMessage);
            } finally {
                setLoading(false);
                isSubmitting = false;
            }
        };

        form.addEventListener("submit", handleSubmit);
    });
})();
