import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const mobileRoot = join(repositoryRoot, 'apps', 'mobile');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertCommandWiring() {
  const rootPackage = readJson(join(repositoryRoot, 'package.json'));
  const mobilePackage = readJson(join(mobileRoot, 'package.json'));
  const requiredRootScripts = [
    'dev',
    'android',
    'ios',
    'prebuild',
    'lint',
    'typecheck',
    'test',
    'doctor',
    'verify:config',
    'verify',
  ];
  const requiredMobileScripts = ['dev', 'android', 'ios', 'prebuild', 'export:android'];

  for (const script of requiredRootScripts) {
    assert(rootPackage.scripts?.[script], `Missing root script: ${script}`);
  }

  for (const script of requiredMobileScripts) {
    assert(mobilePackage.scripts?.[script], `Missing mobile script: ${script}`);
  }

  assert(
    !mobilePackage.scripts?.['reset-project'],
    'Generated reset-project command must be removed from the mobile package',
  );

  assert(
    rootPackage.scripts.verify.includes('pnpm run doctor'),
    'Root verify script must invoke the package script with: pnpm run doctor',
  );
}

const requireFromMobile = createRequire(join(mobileRoot, 'package.json'));
const expoCli = requireFromMobile.resolve('expo/bin/cli');

function createBuildEnvironment(overrides = {}) {
  const environment = {
    ...process.env,
    CI: '1',
    EXPO_NO_DOTENV: '1',
    ...overrides,
  };

  delete environment.APP_BRAND;
  delete environment.APP_ENV;

  return { ...environment, ...overrides };
}

function executeExpoConfig(overrides = {}) {
  return spawnSync(process.execPath, [expoCli, 'config', '--type', 'public', '--json'], {
    cwd: mobileRoot,
    encoding: 'utf8',
    env: createBuildEnvironment(overrides),
  });
}

function readExpoConfig(overrides = {}) {
  const result = executeExpoConfig(overrides);

  assert(
    result.status === 0,
    `Expo config failed: ${(result.stderr || result.stdout).trim()}`,
  );

  return JSON.parse(result.stdout);
}

function assertConfigFailure(overrides, expectedMessage) {
  const result = executeExpoConfig(overrides);
  const output = `${result.stdout}\n${result.stderr}`;

  assert(result.status !== 0, `Expected Expo config to fail with: ${expectedMessage}`);
  assert(output.includes(expectedMessage), `Missing configuration error: ${expectedMessage}`);
}

function assertIdentity(config, expectedIdentifier, expectedEnvironment) {
  assert(
    config.android?.package === expectedIdentifier,
    `Expected Android package ${expectedIdentifier}, received ${config.android?.package}`,
  );
  assert(
    config.ios?.bundleIdentifier === expectedIdentifier,
    `Expected iOS bundle identifier ${expectedIdentifier}, received ${config.ios?.bundleIdentifier}`,
  );
  assert(
    config.extra?.environment === expectedEnvironment,
    `Expected environment ${expectedEnvironment}, received ${config.extra?.environment}`,
  );
}

function main() {
  assertCommandWiring();

  const defaultConfig = readExpoConfig();
  assertIdentity(defaultConfig, 'com.rowan.iot.dev', 'development');

  assertConfigFailure({ APP_BRAND: 'other' }, 'Unknown APP_BRAND: other');
  assertConfigFailure({ APP_ENV: 'staging' }, 'Unknown APP_ENV: staging');

  const variants = [
    ['development', 'com.rowan.iot.dev'],
    ['preview', 'com.rowan.iot.preview'],
    ['production', 'com.rowan.iot'],
  ].map(([environment, identifier]) => {
    const config = readExpoConfig({ APP_BRAND: 'rowan', APP_ENV: environment });
    assertIdentity(config, identifier, environment);
    return config;
  });

  assert(
    new Set(variants.map((config) => config.android.package)).size === 3,
    'Android application identifiers must be unique',
  );
  assert(
    new Set(variants.map((config) => config.ios.bundleIdentifier)).size === 3,
    'iOS bundle identifiers must be unique',
  );

  for (const config of [defaultConfig, ...variants]) {
    assert(!config.extra?.eas?.projectId, 'EAS project ID must remain optional');
    assert(!config.updates?.url, 'EAS Update must not be enabled');
    assert(!config.runtimeVersion, 'EAS runtime version must not be configured');
  }

  console.log('App configuration verified: defaults, failures, variants, and EAS independence.');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Configuration verification failed: ${message}`);
  process.exitCode = 1;
}
