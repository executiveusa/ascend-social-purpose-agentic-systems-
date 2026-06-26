// P0-6: Role-based access control.
// Roles, permissions, tenant boundary enforcement, and youth/finance visibility.

export const ROLES = [
  'owner',
  'executive_director',
  'program_director',
  'staff',
  'board_member',
  'volunteer_manager',
  'finance',
  'read_only'
];

// Permission matrix: what each role can do.
// 'approve:red' requires a signer role (owner, executive_director, finance).
export const PERMISSIONS = {
  owner: ['read', 'write', 'approve:orange', 'approve:red', 'manage:tenants', 'view:youth', 'view:finance', 'view:board'],
  executive_director: ['read', 'write', 'approve:orange', 'approve:red', 'view:youth', 'view:finance', 'view:board'],
  program_director: ['read', 'write', 'approve:orange', 'view:youth', 'view:board'],
  staff: ['read', 'write', 'approve:orange'],
  board_member: ['read', 'view:board'],
  volunteer_manager: ['read', 'write', 'view:volunteer'],
  finance: ['read', 'write', 'approve:red', 'view:finance', 'view:board'],
  read_only: ['read']
};

export function isValidRole(role) {
  return ROLES.includes(role);
}

export function can(user, permission) {
  if (!user || !user.role) return false;
  const perms = PERMISSIONS[user.role] || [];
  return perms.includes(permission);
}

export function assertCan(user, permission) {
  if (!can(user, permission)) {
    throw new Error(`Role '${user?.role}' lacks permission '${permission}'.`);
  }
  return true;
}

// Tenant boundary: a user from tenant A cannot access tenant B's data.
export function assertTenantAccess(user, tenantId) {
  if (!user || !user.tenantId) throw new Error('User has no tenant.');
  if (user.tenantId !== tenantId) {
    throw new Error(`Tenant boundary violation: user '${user.tenantId}' cannot access tenant '${tenantId}'.`);
  }
  return true;
}

// Visibility rules for sensitive lanes.
// - Youth notes: only owner, executive_director, program_director.
// - Finance records: only owner, executive_director, finance.
// - Board notes: owner, executive_director, program_director, finance, board_member.
export function canViewLane(user, lane) {
  if (!user) return false;
  if (lane === 'youth') return can(user, 'view:youth');
  if (lane === 'finance') return can(user, 'view:finance');
  if (lane === 'board') return can(user, 'view:board');
  return can(user, 'read');
}

export function filterByRole(items, user, laneOf) {
  return items.filter((item) => canViewLane(user, laneOf(item)));
}

// Approval gate: staff cannot approve red actions.
export function canApproveAction(user, risk) {
  if (risk === 'red') return can(user, 'approve:red');
  if (risk === 'orange') return can(user, 'approve:orange');
  return true;
}
