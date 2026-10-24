import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { ApiError } from "../services/models";
import type { MqttCredentials } from "./mqtt-connection";

const bytes = (value: string) => new TextEncoder().encode(value);
const hash = (value: string) => bytesToHex(sha256(bytes(value)));
const mac = (key: Uint8Array, value: string) => hmac(sha256, key, bytes(value));
const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

/** DEVICE-01's STS variant maps username/password to access-key ID/secret key.
 * AWS IoT signs the upgrade; STS credentials must not enter MQTT CONNECT auth.
 * See aws/aws-iot-device-sdk-js device/index.js prepareWebSocketUrl/signUrl.
 */
export function mqttConnectParameters(
  credentials: MqttCredentials,
  now = new Date(),
): {
  url: string;
  authentication: { username?: string; password?: string };
} {
  if (credentials.sessionToken === undefined) {
    return {
      url: credentials.host,
      authentication: { username: credentials.username, password: credentials.password },
    };
  }
  const url = new URL(credentials.host);
  const region = /^[a-z0-9-]+\.iot\.([a-z]{2}(?:-[a-z]+)+-\d)\.amazonaws\.com(?:\.cn)?$/.exec(
    url.hostname,
  )?.[1];
  if (
    !region ||
    url.protocol !== "wss:" ||
    url.port ||
    url.pathname !== "/mqtt" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    typeof credentials.sessionToken !== "string" ||
    !credentials.sessionToken.trim() ||
    !credentials.username ||
    !credentials.password ||
    !Number.isFinite(now.getTime())
  ) {
    throw new ApiError(503, "AWS STS连接参数不完整或目标不受支持");
  }
  const time = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = time.slice(0, 8);
  const scope = `${date}/${region}/iotdevicegateway/aws4_request`;
  const query = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${credentials.username}/${scope}`],
    ["X-Amz-Date", time],
    ["X-Amz-Expires", "900"],
    ["X-Amz-SignedHeaders", "host"],
  ]
    .map(([key, value]) => `${key}=${encode(value)}`)
    .join("&");
  const canonical = ["GET", "/mqtt", query, `host:${url.hostname}\n`, "host", hash("")].join("\n");
  let key = mac(bytes(`AWS4${credentials.password}`), date);
  for (const part of [region, "iotdevicegateway", "aws4_request"]) key = mac(key, part);
  const signature = bytesToHex(
    mac(key, ["AWS4-HMAC-SHA256", time, scope, hash(canonical)].join("\n")),
  );
  // AWS IoT's STS token is appended after calculating the signature, as in the AWS SDK.
  return {
    url: `${url.origin}/mqtt?${query}&X-Amz-Signature=${signature}&X-Amz-Security-Token=${encode(credentials.sessionToken)}`,
    authentication: {},
  };
}
