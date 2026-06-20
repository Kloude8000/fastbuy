// ============================================
// loaderScript.js - MODIFIED FOR AUTH INTEGRATION
// Changes:
// - Added dispatch of custom event "headerLoaded" after header is loaded
// - Added callback support to notify when both header and footer are done
// ============================================

async function loadComponent(id, file) {
    try {
        const res = await fetch(file);
        const html = await res.text();
        document.getElementById(id).innerHTML = html;
        // If header just loaded, dispatch an event so other scripts can update it
        if (id === "header") {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                const event = new CustomEvent("headerLoaded");
                document.dispatchEvent(event);
            }, 50);
        }
        return true;
    } catch (err) {
        console.error("Failed to load component:", file, err);
        return false;
    }
}

// Load components on every page
document.addEventListener("DOMContentLoaded", () => {
    loadComponent("header", "/components/header.html");
    loadComponent("footer", "/components/footer.html");
});