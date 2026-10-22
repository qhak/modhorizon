export type VerifiedAccountUser = { id: string; email: string };

export function confirmedAccountUser(user: { id: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean } | null): VerifiedAccountUser | null {
  if (!user || user.is_anonymous || !user.email || !user.email_confirmed_at) return null;
  return { id: user.id, email: user.email };
}

export function safeAccountReturn(value: string | null | undefined): string {
  // Keep redirects to the two product destinations; never accept arbitrary origins.
  return value === "/pricing" || value === "/" ? value : "/account";
}

export function validPassword(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}
