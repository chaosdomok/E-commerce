export const PASSWORD_MIN_LENGTH = 8;

export type PasswordValidation =
  | { valid: true }
  | { valid: false; error: string };

export function validatePassword(password: string): PasswordValidation {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`,
    };
  }
  if (!/[\p{L}]/u.test(password) || !/\d/.test(password)) {
    return {
      valid: false,
      error: 'Hasło musi zawierać co najmniej jedną literę i jedną cyfrę.',
    };
  }
  return { valid: true };
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): PasswordValidation {
  const strength = validatePassword(password);
  if (!strength.valid) return strength;
  if (password !== confirmation) {
    return { valid: false, error: 'Podane hasła nie są takie same.' };
  }
  return { valid: true };
}
