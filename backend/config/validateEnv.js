const WEAK_SECRETS = new Set([
  "",
  "change_this_to_a_long_random_secret",
  "secret",
  "jwt_secret",
]);

function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const errors = [];

  const required = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key] || String(process.env[key]).trim() === "") {
      errors.push(`${key} is required`);
    }
  }

  const jwtSecret = process.env.JWT_SECRET || "";
  const minSecretLength = isProduction ? 32 : 16;
  if (jwtSecret.length < minSecretLength) {
    errors.push(
      `JWT_SECRET must be at least ${minSecretLength} characters`
    );
  }
  if (WEAK_SECRETS.has(jwtSecret.trim())) {
    errors.push("JWT_SECRET must not use a default or placeholder value");
  }

  if (isProduction) {
    if (!process.env.CLIENT_ORIGIN) {
      errors.push("CLIENT_ORIGIN is required in production");
    }
    if (!process.env.PAYSTACK_SECRET_KEY) {
      errors.push("PAYSTACK_SECRET_KEY is required in production");
    }
    if (!process.env.PAYSTACK_PUBLIC_KEY) {
      errors.push("PAYSTACK_PUBLIC_KEY is required in production");
    }
  } else if (!process.env.CLIENT_ORIGIN) {
    console.warn(
      "Warning: CLIENT_ORIGIN not set. Using default local dev origins."
    );
  }

  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_PUBLIC_KEY) {
    console.warn(
      "Warning: Paystack keys not set. Online payments will be unavailable."
    );
  }

  if (!process.env.PAYSTACK_CURRENCY) {
    process.env.PAYSTACK_CURRENCY = "GHS";
  }

  if (errors.length > 0) {
    console.error("Environment validation failed:");
    errors.forEach((msg) => console.error(`  - ${msg}`));
    process.exit(1);
  }
}

module.exports = validateEnv;
