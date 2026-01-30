(function () {
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-file-upload]").forEach((wrapper) => {
      const input = wrapper.querySelector(".lead-form__file-input");
      const preview = wrapper.querySelector("[data-file-preview]");
      if (!input || !preview) {
        return;
      }

      const updatePreview = () => {
        const { files } = input;
        if (!files || files.length === 0) {
          preview.textContent = "Inga filer valda";
          return;
        }
        if (files.length === 1) {
          preview.textContent = files[0].name;
          return;
        }
        preview.textContent = files.length + " filer valda";
      };

      input.addEventListener("change", updatePreview);
    });
  });
})();
