// ============================================
// loaderScript.js - MODIFIED FOR AUTH INTEGRATION
// Changes:
// - Added dispatch of custom event "headerLoaded" after header is loaded
// - Added callback support to notify when both header and footer are done
// ============================================

async function loadComponent(id, file) {
    const el = document.getElementById(id);
    if (!el) return false;

    try {
        const res = await fetch(file);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        el.innerHTML = html;
        if (id === "footer") {
            const yearEl = document.getElementById("footer-year");
            if (yearEl) yearEl.textContent = new Date().getFullYear();
        }
        if (id === "header") {
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent("headerLoaded"));
            }, 50);
        }
        return true;
    } catch (err) {
        console.error("Failed to load component:", file, err);
        return false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadComponent("header", "/components/header.html");
    loadComponent("footer", "/components/footer.html");

    const yearEl = document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});
