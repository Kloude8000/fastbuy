(function () {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const meta = document.querySelector('meta[name="api-base-url"]');
  const metaUrl = meta?.content?.trim();
  const defaultProduction = "https://fastbuy-iewu.onrender.com";

  window.API_BASE_URL =
    window.API_BASE_URL ||
    metaUrl ||
    (isLocal ? "http://localhost:5000" : defaultProduction);
})();
