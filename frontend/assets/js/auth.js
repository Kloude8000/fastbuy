function getAuthToken() {
  return (
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
}

function clearAuth() {
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("authToken");
}

function authHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

function requireAuth() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/pages/login.html";
    return false;
  }
  return true;
}

async function updateCartCount() {
  const cartCountEl = document.getElementById("cart-count");
  const cartIcon = document.getElementById("cartIconLink");
  if (!cartCountEl) return;

  const token = getAuthToken();
  if (!token) {
    cartCountEl.hidden = true;
    cartCountEl.textContent = "0";
    if (cartIcon) cartIcon.setAttribute("aria-label", "Cart");
    return;
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/api/cart`, {
      redirectOn401: false,
    });

    if (!response.ok) {
      cartCountEl.hidden = true;
      return;
    }

    const data = await response.json();
    const items = data.items || [];
    const count = items.reduce(
      (sum, item) => sum + (parseInt(item.quantity, 10) || 0),
      0
    );

    cartCountEl.textContent = count > 99 ? "99+" : String(count);
    cartCountEl.hidden = count === 0;
    if (cartIcon) {
      cartIcon.setAttribute(
        "aria-label",
        count === 0 ? "Cart" : `Cart, ${count} item${count === 1 ? "" : "s"}`
      );
    }
  } catch (err) {
    console.error("Failed to fetch cart count", err);
    cartCountEl.hidden = true;
  }
}

async function updateHeaderAuth() {
  const loginListItem = document.getElementById("loginListItem");
  const userListItem = document.getElementById("userListItem");
  const userDisplayName = document.getElementById("userDisplayName");
  const logoutLink = document.getElementById("logoutLink");
  const cartIcon = document.getElementById("cartIconLink");
  const adminLink = document.getElementById("adminLink");

  const token = getAuthToken();
  if (!token) {
    if (loginListItem) loginListItem.classList.remove("is-hidden");
    if (userListItem) userListItem.classList.remove("is-visible");
    if (cartIcon) cartIcon.href = "/pages/login.html";
    if (adminLink) adminLink.classList.add("is-hidden");
    await updateCartCount();
    return;
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/api/profile`, {
      redirectOn401: false,
    });

    if (response.ok) {
      const user = await response.json();
      if (userDisplayName) userDisplayName.textContent = `Hi, ${user.name}`;
      if (loginListItem) loginListItem.classList.add("is-hidden");
      if (userListItem) userListItem.classList.add("is-visible");
      if (cartIcon) cartIcon.href = "/pages/cart.html";

      if (adminLink) {
        adminLink.classList.toggle("is-hidden", user.role !== "admin");
      }

      if (logoutLink) {
        logoutLink.onclick = (e) => {
          e.preventDefault();
          clearAuth();
          window.location.reload();
        };
      }

      await updateCartCount();
    } else {
      clearAuth();
      if (loginListItem) loginListItem.classList.remove("is-hidden");
      if (userListItem) userListItem.classList.remove("is-visible");
      if (cartIcon) cartIcon.href = "/pages/login.html";
      if (adminLink) adminLink.classList.add("is-hidden");
      await updateCartCount();
    }
  } catch (err) {
    console.error("Failed to fetch user profile", err);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

function escapeAttr(str) {
  if (!str) return "";
  return String(str).replace(/[&"'<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === '"') return "&quot;";
    if (m === "'") return "&#39;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

function uploadUrl(filename) {
  return filename
    ? `${API_BASE_URL}/uploads/${filename}`
    : "https://via.placeholder.com/300x300?text=No+Image";
}

document.addEventListener("headerLoaded", async () => {
  if (document.getElementById("loginListItem")) {
    await updateHeaderAuth();
  }
});
