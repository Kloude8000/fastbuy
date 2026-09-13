document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = document.getElementById("contactMessageBox");
    const submitBtn = form.querySelector('button[type="submit"]');
    const name = document.getElementById("contactName")?.value.trim();
    const email = document.getElementById("contactEmail")?.value.trim();
    const message = document.getElementById("contactMessage")?.value.trim();

    if (!name || !email || !message) {
      if (box) {
        box.className = "message error";
        box.textContent = "Please fill in all fields.";
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/contact`, {
        method: "POST",
        redirectOn401: false,
        body: JSON.stringify({ name, email, message }),
      });
      const data = await response.json();

      if (response.ok) {
        if (box) {
          box.className = "message success";
          box.textContent =
            data.message ||
            "Thanks for reaching out! We will reply within one business day.";
        }
        form.reset();
      } else if (box) {
        box.className = "message error";
        box.textContent = data.message || "Failed to send message. Please try again.";
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) return;
      if (box) {
        box.className = "message error";
        box.textContent = "Network error. Please try again later.";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send message";
      }
    }
  });
});
