export type BrandId = 'rowan';

export type AppEnvironment = 'development' | 'preview' | 'production';

export interface BrandConfig {
  readonly id: BrandId;
  readonly displayName: string;
  readonly slug: string;
  readonly scheme: string;
  readonly baseIdentifier: string;
  readonly themeId: string;
}

export interface AppIdentity {
  readonly brandId: BrandId;
  readonly environment: AppEnvironment;
  readonly name: string;
  readonly slug: string;
  readonly scheme: string;
  readonly themeId: string;
  readonly androidPackage: string;
  readonly iosBundleIdentifier: string;
}

const DEFAULT_BRAND: BrandId = 'rowan';
const DEFAULT_ENVIRONMENT: AppEnvironment = 'development';

const rowanBrand: BrandConfig = Object.freeze({
  id: 'rowan',
  displayName: 'ROWAN',
  slug: 'rowan-iot',
  scheme: 'rowan',
  baseIdentifier: 'com.rowan.iot',
  themeId: 'rowan',
});

const identifierSuffix: Readonly<Record<AppEnvironment, string>> = Object.freeze({
  development: '.dev',
  preview: '.preview',
  production: '',
});

export function getBrandConfig(brandId?: string): BrandConfig {
  const resolvedBrand = brandId || DEFAULT_BRAND;

  if (resolvedBrand !== DEFAULT_BRAND) {
    throw new Error(`Unknown APP_BRAND: ${resolvedBrand}`);
  }

  return rowanBrand;
}

export function getAppEnvironment(value?: string): AppEnvironment {
  const resolvedEnvironment = value || DEFAULT_ENVIRONMENT;

  if (
    resolvedEnvironment !== 'development' &&
    resolvedEnvironment !== 'preview' &&
    resolvedEnvironment !== 'production'
  ) {
    throw new Error(`Unknown APP_ENV: ${resolvedEnvironment}`);
  }

  return resolvedEnvironment;
}

export function getAppIdentity(brandId?: string, environment?: string): AppIdentity {
  const brand = getBrandConfig(brandId);
  const resolvedEnvironment = getAppEnvironment(environment);
  const applicationIdentifier = `${brand.baseIdentifier}${identifierSuffix[resolvedEnvironment]}`;

  return Object.freeze({
    brandId: brand.id,
    environment: resolvedEnvironment,
    name: brand.displayName,
    slug: brand.slug,
    scheme: brand.scheme,
    themeId: brand.themeId,
    androidPackage: applicationIdentifier,
    iosBundleIdentifier: applicationIdentifier,
  });
}
