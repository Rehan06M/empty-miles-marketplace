
export type AccountRole = "shipper" | "carrier";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(
  password: string
): string | undefined {
  if (password.length < 8) {
    return "Use at least 8 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Include at least one number.";
  }

  return undefined;
}

export function isAccountRole(
  value: string | null
): value is AccountRole {
  return value === "shipper" || value === "carrier";
}
