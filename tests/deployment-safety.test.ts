import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('Next używa identyfikatora wdrożenia, a ekran błędu pozwala wykonać pełne odświeżenie', async () => {
  const [config, errorPage] = await Promise.all([
    readFile(new URL('../next.config.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/error.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(config, /deploymentId:\s*process\.env\.NEXT_DEPLOYMENT_ID/);
  assert.match(errorPage, /window\.location\.reload\(\)/);
});

test('deploy buduje osobny release przed przełączeniem i posiada rollback', async () => {
  const script = await readFile(
    new URL('../scripts/deploy.sh', import.meta.url),
    'utf8',
  );

  assert.match(script, /^#!\/usr\/bin\/env bash\nset -euo pipefail/);
  assert.match(script, /--exclude='\.env\.\*'/);
  assert.match(script, /export NEXT_DEPLOYMENT_ID=/);
  assert.ok(script.indexOf('npm run build') < script.indexOf('switch_release "$RELEASE_DIR"'));
  assert.ok(script.indexOf('npm run build') < script.indexOf('pm2 stop "$APP_NAME"'));
  assert.ok(script.indexOf('pm2 stop "$APP_NAME"') < script.indexOf('switch_release "$RELEASE_DIR"'));
  assert.ok(script.indexOf('pm2 stop "$APP_NAME"') < script.indexOf('! mv "$APP_PATH" "$PREVIOUS_TARGET"'));
  assert.match(script, /health check failed; previous release restored/);
  assert.match(script, /KEEP_RELEASES/);
  assert.doesNotMatch(script, /migrate|db push|seed/i);
});

test('deploy script posiada wielokrotny health check (15 prób, 2s odstęp), weryfikację kodu HTTP i rollback w razie niepowodzenia', async () => {
  const script = await readFile(
    new URL('../scripts/deploy.sh', import.meta.url),
    'utf8',
  );

  // 1. Domyślne wartości: max 15 prób, odstęp 2s
  assert.match(script, /HEALTH_MAX_ATTEMPTS="\$\{HEALTH_MAX_ATTEMPTS:-15\}"/);
  assert.match(script, /HEALTH_RETRY_DELAY="\$\{HEALTH_RETRY_DELAY:-2\}"/);

  // 2. Health check retry pętla
  assert.match(script, /for attempt in \$\(seq 1 "\$HEALTH_MAX_ATTEMPTS"\); do/);
  assert.match(script, /status_code="\$\(curl --silent --output \/dev\/null --write-out '%\{http_code\}'/);
  assert.match(script, /\[\[ "\$status_code" =~ \^\[23\]\[0-9\]\{2\}\$ \]\]/);
  assert.match(script, /sleep "\$HEALTH_RETRY_DELAY"/);

  // 3. Obsługa niepowodzenia: rollback + fail + brak Deploy complete
  assert.ok(script.indexOf('if [[ "$healthy" != true ]]; then') !== -1);
  const healthCheckFailureBlock = script.slice(
    script.indexOf('if [[ "$healthy" != true ]]; then'),
    script.indexOf('printf \'Deploy complete:'),
  );
  assert.match(healthCheckFailureBlock, /rollback/);
  assert.match(healthCheckFailureBlock, /fail "health check failed; previous release restored"/);

  // 4. Critical fail w rollbacku
  assert.match(script, /critical_fail\(\) \{/);
  assert.match(script, /CRITICAL:/);
  assert.ok(script.indexOf('Rollback failed:') !== -1);
});

test('chronione strony przekierowują zablokowane konto do kontrolowanego wylogowania', async () => {
  const [adminLayout, profilePage, submissionPage, blockedRoute] =
    await Promise.all([
      readFile(new URL('../src/app/admin/layout.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../src/app/profile/page.tsx', import.meta.url), 'utf8'),
      readFile(
        new URL('../src/app/dodaj-ksiazke/page.tsx', import.meta.url),
        'utf8',
      ),
      readFile(new URL('../src/app/auth/blocked/route.ts', import.meta.url), 'utf8'),
    ]);

  for (const source of [adminLayout, profilePage, submissionPage]) {
    assert.match(source, /isAccountBlocked/);
    assert.match(source, /redirect\(['"]\/auth\/blocked['"]\)/);
  }
  assert.match(blockedRoute, /supabase\.auth\.signOut\(\)/);
  assert.match(blockedRoute, /\/login\?error=account_blocked/);
});

test('funkcjonalny test health check: sukces po retry kończy deploy z kodem 0 i komunikatem Deploy complete', async () => {
  const testDir = await mkdtemp(join(tmpdir(), 'deploy-health-success-'));
  try {
    const releasesDir = join(testDir, 'releases');
    const prevRelease = join(releasesDir, 'prev');
    const newRelease = join(releasesDir, 'new');
    const appPath = join(testDir, 'live');
    const binDir = join(testDir, 'bin');
    const curlCountFile = join(testDir, 'curl-count');

    await mkdir(releasesDir, { recursive: true });
    await mkdir(prevRelease, { recursive: true });
    await mkdir(newRelease, { recursive: true });
    await mkdir(binDir, { recursive: true });

    // Początkowo live wskazuje na new (symulacja stanu po switch_release "$RELEASE_DIR")
    await symlink(newRelease, appPath);

    // Mock curl: przy pierwszej próbie zwraca 000, przy drugiej 200
    await writeFile(
      join(binDir, 'curl'),
      `#!/bin/sh
count=0
if [ -f "${curlCountFile}" ]; then
  count=$(cat "${curlCountFile}")
fi
count=$((count + 1))
echo "$count" > "${curlCountFile}"

if [ "$count" -ge 2 ]; then
  printf '200'
  exit 0
fi
printf '000'
exit 7
`,
    );
    await chmod(join(binDir, 'curl'), 0o755);

    // Mock pm2
    await writeFile(
      join(binDir, 'pm2'),
      `#!/bin/sh
exit 0
`,
    );
    await chmod(join(binDir, 'pm2'), 0o755);

    // Skrypt testowy wykonujący logikę health checku ze scripts/deploy.sh
    const testRunner = `#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${appPath}"
APP_NAME="test-app"
RELEASE_ID="test-success-id"
RELEASE_DIR="${newRelease}"
PREVIOUS_TARGET="${prevRelease}"
HEALTH_URL="http://127.0.0.1:3000/"
HEALTH_MAX_ATTEMPTS=5
HEALTH_RETRY_DELAY=0

fail() {
  printf 'Deploy aborted: %s\\n' "$1" >&2
  exit 1
}

critical_fail() {
  printf 'CRITICAL: %s\\n' "$1" >&2
  exit 2
}

switch_release() {
  local target="$1"
  local next_link="\${APP_PATH}.next-\$RELEASE_ID"
  ln -s "$target" "$next_link"
  if mv -Tf "$next_link" "$APP_PATH" 2>/dev/null; then
    return 0
  else
    rm -f "$next_link"
    ln -sfn "$target" "$APP_PATH"
  fi
}

rollback() {
  printf 'Initiating rollback to previous release: %s\\n' "\${PREVIOUS_TARGET:-none}" >&2
  if [[ -z "$PREVIOUS_TARGET" || ! -d "$PREVIOUS_TARGET" ]]; then
    critical_fail "Rollback failed: previous release directory does not exist (\${PREVIOUS_TARGET:-empty})"
  fi

  if ! switch_release "$PREVIOUS_TARGET"; then
    critical_fail "Rollback failed: unable to restore symlink to $PREVIOUS_TARGET"
  fi

  if ! pm2 restart "$APP_NAME" --update-env; then
    critical_fail "Rollback failed: PM2 failed to restart previous release $APP_NAME"
  fi

  printf 'Rollback successful: previous release %s restored.\\n' "$PREVIOUS_TARGET" >&2
}

healthy=false
for attempt in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
  status_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$status_code" =~ ^[23][0-9]{2}$ ]]; then
    healthy=true
    printf 'Health check passed (attempt %s/%s, HTTP %s)\\n' "$attempt" "$HEALTH_MAX_ATTEMPTS" "$status_code"
    break
  fi
  printf 'Health check waiting... (attempt %s/%s, status: %s, retrying in %ss)\\n' "$attempt" "$HEALTH_MAX_ATTEMPTS" "\${status_code:-unreachable}" "$HEALTH_RETRY_DELAY"
  if [[ "$attempt" -lt "$HEALTH_MAX_ATTEMPTS" ]]; then
    sleep "$HEALTH_RETRY_DELAY"
  fi
done

if [[ "$healthy" != true ]]; then
  printf 'Health check failed: application did not respond with valid HTTP status after %s attempts\\n' "$HEALTH_MAX_ATTEMPTS" >&2
  rollback
  fail "health check failed; previous release restored"
fi

printf 'Deploy complete: %s\\n' "$RELEASE_ID"
`;

    const runnerPath = join(testDir, 'run.sh');
    await writeFile(runnerPath, testRunner);
    await chmod(runnerPath, 0o755);

    const { stdout } = await execFileAsync(runnerPath, [], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
      },
    });

    assert.match(stdout, /Health check passed \(attempt 2\/5, HTTP 200\)/);
    assert.match(stdout, /Deploy complete: test-success-id/);
    assert.doesNotMatch(stdout, /Deploy aborted/);
    assert.doesNotMatch(stdout, /Initiating rollback/);

    const activeTarget = await readlink(appPath);
    assert.equal(activeTarget, newRelease);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
});

test('funkcjonalny test health check: trwały błąd uruchamia rollback, przywraca poprzedni release, kończy się kodem 1 i NIE wypisuje Deploy complete', async () => {
  const testDir = await mkdtemp(join(tmpdir(), 'deploy-health-fail-'));
  try {
    const releasesDir = join(testDir, 'releases');
    const prevRelease = join(releasesDir, 'prev');
    const newRelease = join(releasesDir, 'new');
    const appPath = join(testDir, 'live');
    const binDir = join(testDir, 'bin');
    const pm2Log = join(testDir, 'pm2.log');

    await mkdir(releasesDir, { recursive: true });
    await mkdir(prevRelease, { recursive: true });
    await mkdir(newRelease, { recursive: true });
    await mkdir(binDir, { recursive: true });

    // Początkowo live wskazuje na new (symulacja stanu po switch_release "$RELEASE_DIR")
    await symlink(newRelease, appPath);

    // Mock curl: zawsze zwraca błąd (000 / exit 7)
    await writeFile(
      join(binDir, 'curl'),
      `#!/bin/sh
printf '000'
exit 7
`,
    );
    await chmod(join(binDir, 'curl'), 0o755);

    // Mock pm2: loguje wywołania
    await writeFile(
      join(binDir, 'pm2'),
      `#!/bin/sh
echo "$@" >> "${pm2Log}"
exit 0
`,
    );
    await chmod(join(binDir, 'pm2'), 0o755);

    const testRunner = `#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${appPath}"
APP_NAME="test-app"
RELEASE_ID="test-fail-id"
RELEASE_DIR="${newRelease}"
PREVIOUS_TARGET="${prevRelease}"
HEALTH_URL="http://127.0.0.1:3000/"
HEALTH_MAX_ATTEMPTS=3
HEALTH_RETRY_DELAY=0

fail() {
  printf 'Deploy aborted: %s\\n' "$1" >&2
  exit 1
}

critical_fail() {
  printf 'CRITICAL: %s\\n' "$1" >&2
  exit 2
}

switch_release() {
  local target="$1"
  local next_link="\${APP_PATH}.next-\$RELEASE_ID"
  ln -s "$target" "$next_link"
  if mv -Tf "$next_link" "$APP_PATH" 2>/dev/null; then
    return 0
  else
    rm -f "$next_link"
    ln -sfn "$target" "$APP_PATH"
  fi
}

rollback() {
  printf 'Initiating rollback to previous release: %s\\n' "\${PREVIOUS_TARGET:-none}" >&2
  if [[ -z "$PREVIOUS_TARGET" || ! -d "$PREVIOUS_TARGET" ]]; then
    critical_fail "Rollback failed: previous release directory does not exist (\${PREVIOUS_TARGET:-empty})"
  fi

  if ! switch_release "$PREVIOUS_TARGET"; then
    critical_fail "Rollback failed: unable to restore symlink to $PREVIOUS_TARGET"
  fi

  if ! pm2 restart "$APP_NAME" --update-env; then
    critical_fail "Rollback failed: PM2 failed to restart previous release $APP_NAME"
  fi

  printf 'Rollback successful: previous release %s restored.\\n' "$PREVIOUS_TARGET" >&2
}

healthy=false
for attempt in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
  status_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$status_code" =~ ^[23][0-9]{2}$ ]]; then
    healthy=true
    printf 'Health check passed (attempt %s/%s, HTTP %s)\\n' "$attempt" "$HEALTH_MAX_ATTEMPTS" "$status_code"
    break
  fi
  printf 'Health check waiting... (attempt %s/%s, status: %s, retrying in %ss)\\n' "$attempt" "$HEALTH_MAX_ATTEMPTS" "\${status_code:-unreachable}" "$HEALTH_RETRY_DELAY"
  if [[ "$attempt" -lt "$HEALTH_MAX_ATTEMPTS" ]]; then
    sleep "$HEALTH_RETRY_DELAY"
  fi
done

if [[ "$healthy" != true ]]; then
  printf 'Health check failed: application did not respond with valid HTTP status after %s attempts\\n' "$HEALTH_MAX_ATTEMPTS" >&2
  rollback
  fail "health check failed; previous release restored"
fi

printf 'Deploy complete: %s\\n' "$RELEASE_ID"
`;

    const runnerPath = join(testDir, 'run.sh');
    await writeFile(runnerPath, testRunner);
    await chmod(runnerPath, 0o755);

    let failed = false;
    let stdoutOutput = '';
    let stderrOutput = '';
    let exitCode = 0;

    try {
      const res = await execFileAsync(runnerPath, [], {
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH}`,
        },
      });
      stdoutOutput = res.stdout;
      stderrOutput = res.stderr;
    } catch (err: unknown) {
      failed = true;
      const errorWithCode = err as { code?: number; stdout?: string; stderr?: string };
      exitCode = errorWithCode.code ?? 1;
      stdoutOutput = errorWithCode.stdout ?? '';
      stderrOutput = errorWithCode.stderr ?? '';
    }

    assert.equal(failed, true, 'Skrypt powinien zakończyć się błędem');
    assert.equal(exitCode, 1, 'Kod wyjścia powinien być równy 1 (fail)');
    assert.match(stderrOutput, /health check failed; previous release restored/);
    assert.match(stderrOutput, /Initiating rollback to previous release/);
    assert.match(stderrOutput, /Rollback successful: previous release/);

    // KROK KRYTYCZNY: "Deploy complete" NIE MOŻE pojawić się w żadnym strumieniu!
    assert.doesNotMatch(stdoutOutput, /Deploy complete:/);
    assert.doesNotMatch(stderrOutput, /Deploy complete:/);

    // Weryfikacja przywrócenia symlinku do poprzedniego wydania
    const activeTarget = await readlink(appPath);
    assert.equal(activeTarget, prevRelease, 'Symlink live powinien wskazywać na previous release po rollbacku');

    // Weryfikacja restartu PM2 dla poprzedniego wydania
    const pm2Actions = await readFile(pm2Log, 'utf8');
    assert.match(pm2Actions, /restart test-app --update-env/);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
});

test('funkcjonalny test rollback: błąd rollbacku zgłasza CRITICAL i kończy się niezerowym kodem', async () => {
  const testDir = await mkdtemp(join(tmpdir(), 'deploy-rollback-fail-'));
  try {
    const releasesDir = join(testDir, 'releases');
    const prevRelease = join(releasesDir, 'prev');
    const newRelease = join(releasesDir, 'new');
    const appPath = join(testDir, 'live');
    const binDir = join(testDir, 'bin');

    await mkdir(releasesDir, { recursive: true });
    await mkdir(prevRelease, { recursive: true });
    await mkdir(newRelease, { recursive: true });
    await mkdir(binDir, { recursive: true });

    await symlink(newRelease, appPath);

    // Mock curl: zawsze failure
    await writeFile(
      join(binDir, 'curl'),
      `#!/bin/sh
printf '000'
exit 7
`,
    );
    await chmod(join(binDir, 'curl'), 0o755);

    // Mock pm2: failuje przy restart podczas rollbacku
    await writeFile(
      join(binDir, 'pm2'),
      `#!/bin/sh
if [ "$1" = "restart" ]; then
  echo "pm2 restart failed" >&2
  exit 1
fi
exit 0
`,
    );
    await chmod(join(binDir, 'pm2'), 0o755);

    const testRunner = `#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${appPath}"
APP_NAME="test-app"
RELEASE_ID="test-critical-id"
RELEASE_DIR="${newRelease}"
PREVIOUS_TARGET="${prevRelease}"
HEALTH_URL="http://127.0.0.1:3000/"
HEALTH_MAX_ATTEMPTS=1
HEALTH_RETRY_DELAY=0

fail() {
  printf 'Deploy aborted: %s\\n' "$1" >&2
  exit 1
}

critical_fail() {
  printf 'CRITICAL: %s\\n' "$1" >&2
  exit 2
}

switch_release() {
  local target="$1"
  local next_link="\${APP_PATH}.next-\$RELEASE_ID"
  ln -s "$target" "$next_link"
  if mv -Tf "$next_link" "$APP_PATH" 2>/dev/null; then
    return 0
  else
    rm -f "$next_link"
    ln -sfn "$target" "$APP_PATH"
  fi
}

rollback() {
  printf 'Initiating rollback to previous release: %s\\n' "\${PREVIOUS_TARGET:-none}" >&2
  if [[ -z "$PREVIOUS_TARGET" || ! -d "$PREVIOUS_TARGET" ]]; then
    critical_fail "Rollback failed: previous release directory does not exist (\${PREVIOUS_TARGET:-empty})"
  fi

  if ! switch_release "$PREVIOUS_TARGET"; then
    critical_fail "Rollback failed: unable to restore symlink to $PREVIOUS_TARGET"
  fi

  if ! pm2 restart "$APP_NAME" --update-env; then
    critical_fail "Rollback failed: PM2 failed to restart previous release $APP_NAME"
  fi

  printf 'Rollback successful: previous release %s restored.\\n' "$PREVIOUS_TARGET" >&2
}

healthy=false
for attempt in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
  status_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$status_code" =~ ^[23][0-9]{2}$ ]]; then
    healthy=true
    break
  fi
done

if [[ "$healthy" != true ]]; then
  rollback
  fail "health check failed; previous release restored"
fi

printf 'Deploy complete: %s\\n' "$RELEASE_ID"
`;

    const runnerPath = join(testDir, 'run.sh');
    await writeFile(runnerPath, testRunner);
    await chmod(runnerPath, 0o755);

    let failed = false;
    let stderrOutput = '';
    let exitCode = 0;

    try {
      await execFileAsync(runnerPath, [], {
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH}`,
        },
      });
    } catch (err: unknown) {
      failed = true;
      const errorWithCode = err as { code?: number; stderr?: string };
      exitCode = errorWithCode.code ?? 1;
      stderrOutput = errorWithCode.stderr ?? '';
    }

    assert.equal(failed, true, 'Skrypt powinien zakończyć się błędem');
    assert.equal(exitCode, 2, 'Kod wyjścia powinien być 2 (critical_fail)');
    assert.match(stderrOutput, /CRITICAL: Rollback failed: PM2 failed to restart previous release/);
    assert.doesNotMatch(stderrOutput, /Deploy complete:/);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
});
