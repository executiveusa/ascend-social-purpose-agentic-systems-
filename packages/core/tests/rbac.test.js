import { describe, expect, it } from 'vitest';
import { ROLES, can, assertCan, assertTenantAccess, canViewLane, canApproveAction, isValidRole } from '../src/rbac.js';

describe('role-based access control v0.6', () => {
  it('exposes the new role set', () => {
    expect(ROLES).toEqual([
      'owner',
      'operator',
      'programs',
      'comms',
      'grants',
      'board',
      'reviewer',
      'readonly'
    ]);
  });

  it('board cannot see private youth notes', () => {
    const boardUser = { role: 'board', tenantId: 'asc3nd' };
    expect(canViewLane(boardUser, 'youth')).toBe(false);
    expect(canViewLane(boardUser, 'board')).toBe(true);
  });

  it('programs can view youth but comms cannot', () => {
    const progUser = { role: 'programs', tenantId: 'asc3nd' };
    const commsUser = { role: 'comms', tenantId: 'asc3nd' };
    expect(canViewLane(progUser, 'youth')).toBe(true);
    expect(canViewLane(commsUser, 'youth')).toBe(false);
  });

  it('operator cannot approve red actions by default', () => {
    const operatorUser = { role: 'operator', tenantId: 'asc3nd' };
    expect(canApproveAction(operatorUser, 'red')).toBe(false);
    expect(canApproveAction(operatorUser, 'orange')).toBe(true);
  });

  it('owner can approve red actions', () => {
    expect(canApproveAction({ role: 'owner', tenantId: 'asc3nd' }, 'red')).toBe(true);
  });

  it('tenant A cannot access tenant B', () => {
    const userA = { role: 'owner', tenantId: 'tenant-a' };
    expect(() => assertTenantAccess(userA, 'tenant-b')).toThrow(/Tenant boundary violation/);
    expect(() => assertTenantAccess(userA, 'tenant-a')).not.toThrow();
  });

  it('readonly can read but not write/approve', () => {
    const ro = { role: 'readonly', tenantId: 'asc3nd' };
    expect(can(ro, 'tenant.read')).toBe(true);
    expect(can(ro, 'agents.manage')).toBe(false);
    expect(can(ro, 'approvals.approve.orange')).toBe(false);
  });

  it('assertCan throws on missing permission', () => {
    const operatorUser = { role: 'operator', tenantId: 'asc3nd' };
    expect(() => assertCan(operatorUser, 'approvals.approve.red')).toThrow(/lacks permission/);
    expect(() => assertCan(operatorUser, 'tenant.read')).not.toThrow();
  });

  it('isValidRole matches expected list', () => {
    expect(isValidRole('owner')).toBe(true);
    expect(isValidRole('operator')).toBe(true);
    expect(isValidRole('superadmin')).toBe(false);
  });
});
