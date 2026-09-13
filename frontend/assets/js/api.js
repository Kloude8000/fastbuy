class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch(url, options = {}) {
  const { redirectOn401 = true, ...fetchOptions } = options;
  const baseHeaders = authHeaders();
  if (fetchOptions.body instanceof FormData) {
    delete baseHeaders["Content-Type"];
  }
  const headers = { ...baseHeaders, ...(fetchOptions.headers || {}) };

  const response = await fetch(url, { ...fetchOptions, headers });

  if (response.status === 401 && redirectOn401) {
    clearAuth();
    const onLoginPage = window.location.pathname.includes("/login.html");
    if (!onLoginPage) {
      window.location.href = "/pages/login.html";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (response.status === 429) {
    showToast("Too many requests. Please try again later.", "error");
    throw new ApiError("Rate limited", 429);
  }

  return response;
}
