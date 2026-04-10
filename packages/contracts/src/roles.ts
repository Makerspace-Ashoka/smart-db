export const smartDbRoles = {
  admin: "smartdb.admin",
  labeler: "smartdb.labeler",
  viewer: "smartdb.viewer",
} as const;

export type SmartDbRole = (typeof smartDbRoles)[keyof typeof smartDbRoles];

export function hasSmartDbRole(
  roles: readonly string[],
  requiredRole: SmartDbRole,
): boolean {
  return roles.includes(requiredRole);
}
