import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const workflowUrl = new URL('../../../.github/workflows/deploy-swissgroceries-staging.yml', import.meta.url);
const monitoringUrl = new URL('../../../.github/workflows/monitor-swissgroceries-staging.yml', import.meta.url);
const rollbackUrl = new URL('../../../.github/workflows/disable-swissgroceries-staging.yml', import.meta.url);
const canaryUrl = new URL('../../../.github/workflows/canary-swissgroceries-staging.yml', import.meta.url);
const activationUrl = new URL('../../../.github/workflows/activate-swissgroceries-canary.yml', import.meta.url);

test('le deploiement distant exige un accord de licence explicite', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /license_approved:/);
  assert.match(workflow, /inputs\.license_approved != true/);
  assert.match(workflow, /needs: licence-gate/);
  assert.match(workflow, /environment: swissgroceries-staging/);
});

test('la surveillance est inactive par defaut et ferme Supabase apres quatre echecs', async () => {
  const workflow = await readFile(monitoringUrl, 'utf8');

  assert.match(workflow, /cron: '2-59\/5 \* \* \* \*'/);
  assert.match(workflow, /SWISS_GROCERIES_MONITORING_ENABLED == 'true'/);
  assert.match(workflow, /environment: swissgroceries-staging-ops/);
  assert.match(workflow, /https:\/\/\*\.run\.app/);
  assert.doesNotMatch(workflow, /GCP_DEPLOY_SERVICE_ACCOUNT/);
  assert.match(workflow, /for attempt in 1 2 3 4/);
  assert.match(workflow, /steps\.readiness-probe\.outcome == 'failure'/);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_ENABLED=false/);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_MODE=off/);
  assert.doesNotMatch(workflow, /SWISS_GROCERIES_SERVER_ENABLED=true/);
  assert.match(workflow, /run: exit 1/);
});

test('le rollback manuel exige une confirmation et ne peut jamais activer le service', async () => {
  const workflow = await readFile(rollbackUrl, 'utf8');

  assert.match(workflow, /test "\$CONFIRMATION" = "DESACTIVER"/);
  assert.match(workflow, /needs: confirmation/);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_ENABLED=false/);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_MODE=off/);
  assert.doesNotMatch(workflow, /SWISS_GROCERIES_SERVER_ENABLED=true/);
  assert.doesNotMatch(workflow, /functions deploy/);
});

test('le canary exige la licence, ne change aucun flag et ne conserve que les agregats', async () => {
  const workflow = await readFile(canaryUrl, 'utf8');

  assert.match(workflow, /inputs\.license_approved != true/);
  assert.match(workflow, /needs: licence-gate/);
  assert.match(workflow, /environment: swissgroceries-staging/);
  assert.match(workflow, /npm --prefix services\/swissgroceries-gateway run canary/);
  assert.match(workflow, /CANARY_REPORT_PATH="\$GITHUB_WORKSPACE\/canary-summary\.json"/);
  assert.match(workflow, /path: canary-summary\.json/);
  assert.doesNotMatch(workflow, /SWISS_GROCERIES_SERVER_ENABLED/);
  assert.doesNotMatch(workflow, /supabase secrets set/);
  assert.doesNotMatch(workflow, /functions deploy/);
});

test('le staging est borne et utilise une image immuable en region suisse', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /REGION: europe-west6/);
  assert.match(workflow, /:\$\{GITHUB_SHA\}/);
  assert.doesNotMatch(workflow, /IMAGE=.*:latest/);
  assert.match(workflow, /--concurrency 4/);
  assert.match(workflow, /--min 0/);
  assert.match(workflow, /--max 2/);
  assert.match(workflow, /--timeout 75s/);
});

test('l activation canary exige toutes les preuves et une cohorte secrete bornee', async () => {
  const workflow = await readFile(activationUrl, 'utf8');

  assert.match(workflow, /license_approved:/);
  assert.match(workflow, /technical_canary_passed:/);
  assert.match(workflow, /field_benchmark_passed:/);
  assert.match(workflow, /test "\$CONFIRMATION" = "ACTIVER CANARY"/);
  assert.match(workflow, /secrets\.SWISS_GROCERIES_CANARY_USER_IDS/);
  assert.match(workflow, /count < 1 \|\| count > 10/);
  assert.match(workflow, /environment: swissgroceries-staging/);
});

test('l activation deploie fermee avant le canary et reste sure pour une ancienne revision', async () => {
  const workflow = await readFile(activationUrl, 'utf8');
  const deployIndex = workflow.indexOf('supabase functions deploy swissgroceries');
  const canaryIndex = workflow.indexOf('SWISS_GROCERIES_SERVER_MODE=canary');

  assert.ok(deployIndex >= 0 && canaryIndex > deployIndex);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_ENABLED=false/);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_MODE=off/);
  assert.doesNotMatch(workflow, /SWISS_GROCERIES_SERVER_ENABLED=true/);
  assert.doesNotMatch(workflow, /SWISS_GROCERIES_SERVER_MODE=on/);
});

test('les secrets restent geres a distance et le coupe-circuit reste ferme', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /google-github-actions\/auth@v3/);
  assert.match(workflow, /workload_identity_provider:/);
  assert.match(workflow, /--set-secrets "GATEWAY_API_KEY=\$\{GATEWAY_SECRET\}:latest"/);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_ENABLED=false/);
  assert.match(workflow, /SWISS_GROCERIES_SERVER_MODE=off/);
  assert.doesNotMatch(workflow, /SWISS_GROCERIES_SERVER_ENABLED=true/);
  assert.match(workflow, /supabase functions deploy swissgroceries/);
});
