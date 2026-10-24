import { X509Certificate } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AndroidConfig, type ConfigPlugin, withAndroidManifest, withDangerousMod } from 'expo/config-plugins';

const expectedFingerprint = 'F0:92:33:43:78:59:35:1D:6B:39:01:D0:11:69:21:42:40:EA:07:DD:08:C6:A2:89:10:2F:C3:9E:29:8C:6F:A1';
const networkConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="@raw/rowan_dev_backend_cert" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

/** Development-environment trust for the currently verified backend certificate. */
const withDevBackendCertificate: ConfigPlugin<{ enabled: boolean }> = (config, { enabled }) => {
  config = withAndroidManifest(config, mod => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    if (enabled) application.$['android:networkSecurityConfig'] = '@xml/rowan_dev_network_security_config';
    else if (application.$['android:networkSecurityConfig'] === '@xml/rowan_dev_network_security_config')
      delete application.$['android:networkSecurityConfig'];
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    if (mod.modRequest.introspect) return mod;
    const resources = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const xmlPath = path.join(resources, 'xml', 'rowan_dev_network_security_config.xml');
    const pemPath = path.join(resources, 'raw', 'rowan_dev_backend_cert.pem');
    if (!enabled) {
      await Promise.all([rm(xmlPath, { force: true }), rm(pemPath, { force: true })]);
      return mod;
    }
    const certificatePath = path.join(mod.modRequest.projectRoot, 'certs', 'rowan-dev-backend.pem');
    const pem = await readFile(certificatePath, 'utf8');
    const certificate = new X509Certificate(pem);
    if (certificate.fingerprint256 !== expectedFingerprint || certificate.checkIP('47.107.80.36') !== '47.107.80.36' ||
        Date.now() < Date.parse(certificate.validFrom) || Date.now() > Date.parse(certificate.validTo)) {
      throw new Error('开发后台证书与已核对指纹不一致，请重新确认后构建');
    }
    const xml = path.join(resources, 'xml');
    const raw = path.join(resources, 'raw');
    await Promise.all([mkdir(xml, { recursive: true }), mkdir(raw, { recursive: true })]);
    await Promise.all([
      writeFile(xmlPath, networkConfig),
      copyFile(certificatePath, pemPath),
    ]);
    return mod;
  }]);
};

export default withDevBackendCertificate;
