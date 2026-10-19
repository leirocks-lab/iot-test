import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const applicationRoot = repositoryRoot;

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
  assert(rootPackage.main === 'expo-router/entry', 'Root package must be the Expo Router application');
  assert(!Object.values(rootPackage.dependencies ?? {}).some((value) => value.startsWith('workspace:')), 'Workspace dependencies must be removed');
  const pnpmSettings = parse(readFileSync(join(repositoryRoot, 'pnpm-workspace.yaml'), 'utf8'));
  assert(!pnpmSettings.packages && !pnpmSettings.catalog && !pnpmSettings.catalogs, 'pnpm settings must not define a monorepo');
  const lock = parse(readFileSync(join(repositoryRoot, 'pnpm-lock.yaml'), 'utf8'));
  assert(Object.keys(lock.importers).length === 1 && lock.importers['.'], 'Lockfile must describe only the root application');
  assert(!existsSync(join(repositoryRoot, 'apps')) && !existsSync(join(repositoryRoot, 'packages')), 'Old monorepo directories must be removed');
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
  const requiredAppScripts = ['dev', 'android', 'ios', 'prebuild', 'export:android'];

  for (const script of requiredRootScripts) {
    assert(rootPackage.scripts?.[script], `Missing root script: ${script}`);
  }

  for (const script of requiredAppScripts) {
    assert(rootPackage.scripts?.[script], `Missing app script: ${script}`);
  }

  assert(
    !rootPackage.scripts?.['reset-project'],
    'Generated reset-project command must be removed from the application package',
  );

  assert(
    rootPackage.scripts.verify.includes('pnpm run doctor'),
    'Root verify script must invoke the package script with: pnpm run doctor',
  );
}

const requireFromApp = createRequire(join(applicationRoot, 'package.json'));
const expoCli = requireFromApp.resolve('expo/bin/cli');

function createBuildEnvironment(overrides = {}) {
  const environment = {
    ...process.env,
    CI: '1',
    EXPO_NO_DOTENV: '1',
    ...overrides,
  };

  for (const key of Object.keys(environment)) {
    if (key === 'APP_BRAND' || key === 'APP_ENV' || key.startsWith('ROWAN_')) delete environment[key];
  }

  return { ...environment, ...overrides };
}

function executeExpoConfig(overrides = {}, type = 'public') {
  return spawnSync(process.execPath, [expoCli, 'config', '--type', type, '--json'], {
    cwd: applicationRoot,
    encoding: 'utf8',
    env: createBuildEnvironment(overrides),
  });
}

function readExpoConfig(overrides = {}, type = 'public') {
  const result = executeExpoConfig(overrides, type);

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
  assertConfigFailure({ APP_ENV: '' }, 'Unknown APP_ENV:');

  assertConfigFailure({APP_ENV:'production',ROWAN_HTTP_MODE:'mock'},'Production requires real transports');
  assertConfigFailure({APP_ENV:'production',ROWAN_HTTP_MODE:'real',ROWAN_APP_API_BASE_URL:'http://insecure.invalid'},'HTTPS');
  assertConfigFailure({APP_ENV:'production',ROWAN_HTTP_MODE:'real',ROWAN_APP_API_BASE_URL:'https://api.example.invalid',ROWAN_IOT_API_BASE_URL:'http://iot.example.invalid'},'HTTPS');
  assertConfigFailure({APP_ENV:'preview',ROWAN_HTTP_MODE:'real',ROWAN_APP_API_BASE_URL:'http://user:password@example.invalid'},'无凭据');
  assertConfigFailure({APP_ENV:'preview',ROWAN_HTTP_MODE:'real',ROWAN_APP_API_BASE_URL:'http://api.example.invalid/app-api'},'/app-api');
  assertConfigFailure({ROWAN_INTEGRATION_PROFILE:'https://not-a-profile.invalid'},'ROWAN_INTEGRATION_PROFILE');
  const integrationConfig=readExpoConfig({ROWAN_INTEGRATION_PROFILE:'reviewed-fixture-v1',ROWAN_DEVICE_TOKEN:'public-test-sentinel'});
  assert(integrationConfig.extra?.integrationProfile==='reviewed-fixture-v1','Integration profile ID must reach public extra');
  assert(!integrationConfig.extra?.contracts&&!integrationConfig.extra?.deviceToken&&!JSON.stringify(integrationConfig).includes('public-test-sentinel'),'Public integration selection must not include contracts or device credentials');
  const variants = [
    ['development', 'com.rowan.iot.dev'],
    ['preview', 'com.rowan.iot.preview'],
    ['production', 'com.rowan.iot'],
  ].map(([environment, identifier]) => {
    const config = readExpoConfig({ APP_BRAND: 'rowan', APP_ENV: environment, ...(environment==='production'?{ROWAN_APP_API_BASE_URL:'https://api.example.invalid'}:{}) });
    assertIdentity(config, identifier, environment);
    return config;
  });

  for (const environment of ['development', 'preview']) {
    const config = readExpoConfig({ APP_ENV: environment, ROWAN_HTTP_MODE: 'real', ROWAN_APP_API_BASE_URL: 'http://api.example.invalid', ROWAN_IOT_API_BASE_URL: 'http://iot.example.invalid/iot' });
    assert(config.extra.httpMode === 'real' && config.extra.apiBaseUrl.startsWith('http://') && config.extra.iotApiBaseUrl.startsWith('http://'), `${environment} must support both real HTTP roots`);
  }

  for (const environment of ['development', 'preview', 'production']) {
    const config = readExpoConfig({ APP_ENV: environment, ...(environment === 'production' ? { ROWAN_APP_API_BASE_URL: 'https://api.example.invalid' } : {}) }, 'introspect');
    const expected = environment !== 'production';
    const application = config._internal.modResults.android.manifest.manifest.application[0];
    assert(application.$['android:usesCleartextTraffic'] === String(expected), `${environment} Android main manifest cleartext policy is wrong`);
    assert(!application.$['android:networkSecurityConfig'], 'A separate network security config must not silently override the environment policy');
    assert(config._internal.modResults.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads === expected, `${environment} iOS ATS policy is wrong`);
  }

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

  console.log('App configuration verified: defaults, failures, HTTP/HTTPS environments, Android manifest, iOS ATS, and EAS independence.');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Configuration verification failed: ${message}`);
  process.exitCode = 1;
}
