import { Router } from 'express';
import { operatorAuth, requirePermission } from './auth-middleware.js';
import { getDashboardState } from './dashboard-state.js';
import { getOperatorEvents } from './events.js';
import { listArtifacts, getArtifact } from './artifacts.js';
import { listManagedAgents, getManagedAgent, provisionAgent, pauseAgent, resumeAgent, getAgentHealth } from './managed-agents.js';
import { createRun, listRuns, getRun } from './runs.js';
import { approveApproval, rejectApproval } from './approvals.js';
import { getBudget } from './budgets.js';
import { listModelUsage, getModelUsageSummary } from './model-usage.js';
import { listTraces, getTrace } from './traces.js';
import deploymentsRouter from './deployments.js';
import backupsRouter from './backups.js';

const router = Router();

const auth = operatorAuth();

router.get('/dashboard-state', auth, requirePermission('tenant.read'), getDashboardState);

router.get('/events', auth, requirePermission('events.read'), getOperatorEvents);

router.get('/artifacts', auth, requirePermission('artifacts.read'), listArtifacts);
router.get('/artifacts/:id', auth, requirePermission('artifacts.read'), getArtifact);

router.get('/managed-agents', auth, requirePermission('agents.read'), listManagedAgents);
router.get('/managed-agents/:id', auth, requirePermission('agents.read'), getManagedAgent);
router.post('/managed-agents/:id/provision', auth, requirePermission('agents.manage'), provisionAgent);
router.post('/managed-agents/:id/pause', auth, requirePermission('agents.manage'), pauseAgent);
router.post('/managed-agents/:id/resume', auth, requirePermission('agents.manage'), resumeAgent);
router.get('/managed-agents/:id/health', auth, requirePermission('agents.read'), getAgentHealth);

router.post('/runs', auth, requirePermission('runs.create'), createRun);
router.get('/runs', auth, requirePermission('runs.read'), listRuns);
router.get('/runs/:id', auth, requirePermission('runs.read'), getRun);

router.post('/approvals/:id/approve', auth, requirePermission('approvals.review'), approveApproval);
router.post('/approvals/:id/reject', auth, requirePermission('approvals.review'), rejectApproval);

router.get('/budgets', auth, requirePermission('budgets.read'), getBudget);

router.get('/model-usage', auth, requirePermission('budgets.read'), listModelUsage);
router.get('/model-usage/summary', auth, requirePermission('budgets.read'), getModelUsageSummary);

router.get('/traces', auth, requirePermission('events.read'), listTraces);
router.get('/traces/:id', auth, requirePermission('events.read'), getTrace);

router.use('/deployments', deploymentsRouter);
router.use('/backups', backupsRouter);

export default router;
