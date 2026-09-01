export const ADMIN_EMAILS = [
  'esraamomentsstore@gmail.com',
  'ahmed.morgan2009@gmail.com',
];

export function isAllowedAdmin(email: string | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
