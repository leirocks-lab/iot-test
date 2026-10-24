import { describe, expect, it } from "vitest";
import { provisionAddresses } from "./provision-urls";

const urls = {
  certificationURL: "http://device.test/cert",
  activationURL: "http://device.test/activate",
  bindingURL: "http://device.test/bind",
  otaURL: "http://device.test/ota",
};

describe("PAIR-04 device service URL policy", () => {
  it("rejects HTTP in every environment", () => {
    for (const environment of ["development", "preview", "production", undefined])
      expect(() => provisionAddresses(urls, environment)).toThrow("有效HTTPS地址");
  });
  it("accepts HTTPS in every environment", () => {
    const secure = Object.fromEntries(
      Object.entries(urls).map(([key, value]) => [key, value.replace("http:", "https:")]),
    );
    for (const environment of ["development", "preview", "production", undefined])
      expect(provisionAddresses(secure, environment)).toEqual(Object.values(secure));
  });
  it("rejects missing, malformed and padded addresses even in development", () => {
    const secure = Object.fromEntries(
      Object.entries(urls).map(([key, value]) => [key, value.replace("http:", "https:")]),
    );
    for (const bindingURL of [
      "",
      "https://",
      " https://device.test/bind",
      "ftp://device.test/bind",
    ])
      expect(() => provisionAddresses({ ...secure, bindingURL }, "development")).toThrow();
  });
});
