import { describe, expect, it } from 'vitest';
import { ROLES, PERMISSIONS, can, assertCan, assertTenantAccess, canViewLane, canApproveAction, isValidRole } from '../src/rbac.js';

describe('role-based access control', () => {
  it('exposes the full role set', () => {
    expect(ROLES).toEqual(['owner', 'executive_director', 'program_director', 'staff', 'board_member', 'volunteer_manager', 'finance', 'read_only']);
  });

  it('board cannot see private youth notes', () => {
    const board = { role: 'board_member', tenantId: 'asc3nd' };
    expect(canViewLane(board, 'youth')).toBe(false);
    expect(canViewLane(board, 'board')).toBe(true);
  });

  it('volunteer manager cannot view finance records', () => {
    const vm = { role: 'volunteer_manager', tenantId: 'asc3nd' };
    expect(canViewLane(vm, 'finance')).toBe(false);
    expect(canViewLane(vm, 'volunteer')).toBe(true);
  });

  it('staff cannot approve red grant/legal/financial actions', () => {
    const staff = { role: 'staff', tenantId: 'asc3nd' };
    expect(canApproveAction(staff, 'red')).toBe(false);
    expect(canApproveAction(staff, 'orange')).toBe(true);
  });

  it('owner and executive_director can approve red actions', () => {
    expect(canApproveAction({ role: 'owner', tenantId: 'asc3nd' }, 'red')).toBe(true);
    expect(canApproveAction({ role: 'executive_director', tenantId: 'asc3nd' }, 'red')).toBe(true);
    expect(canApproveAction({ role: 'finance', tenantId: 'asc3nd' }, 'red')).toBe(true);
  });

  it('tenant A cannot access tenant B', () => {
    const userA = { role: 'owner', tenantId: 'tenant-a' };
    expect(() => assertTenantAccess(userA, 'tenant-b')).toThrow(/Tenant boundary violation/);
    expect(() => assertTenantAccess(userA, 'tenant-a')).not.toThrow();
  });

  it('read_only can read but not write', () => {
    const ro = { role: 'read_only', tenantId: 'asc3nd' };
    expect(can(ro, 'read')).toBe(true);
    expect(can(ro, 'write')).toBe(false);
    expect(can(ro, 'approve:orange')).toBe(false);
  });

  it('program_director can view youth but not finance', () => {
    const pd = { role: 'program_director', tenantId: 'asc3nd' };
    expect(canViewLane(pd, 'youth')).toBe(true);
    expect(canViewLane(pd, 'finance')).toBe(false);
  });

  it('assertCan throws on missing permission', () => {
    const staff = { role: 'staff', tenantId: 'asc3nd' };
    expect(() => assertCan(staff, 'approve:red')).toThrow(/lacks permission/);
    expect(() => assertCan(staff, 'write')).not.toThrow();
  });

  it('isValidRole rejects unknown roles', () => {
    expect(isValidRole('owner')).toBe(true);
    expect(isValidRole('superadmin')).toBe(false);
  });
});
