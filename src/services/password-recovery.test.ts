import { expect, it } from "vitest";
import type { HttpRequest } from "../lib/core";
import { RowanService } from "./rowan";
import { MemoryStorage } from "./memory-storage";

it("uses the entered email, forget purpose and current language across recovery without a demo account", async () => {
  const requests: HttpRequest[] = [];
  const service = new RowanService(
    {
      async request<T>(request: HttpRequest) {
        requests.push(request);
        return { status: 200, data: { success: true, code: 0, data: {} } as T, headers: {} };
      },
    },
    new MemoryStorage(),
  );
  await service.sendCaptcha("actual-user@example.test", "forget");
  await service.checkCaptcha("actual-user@example.test", "issued-code");
  await service.resetPassword("actual-user@example.test", "changed-test-password", "issued-code");
  expect(requests[0]).toMatchObject({
    method: "GET",
    path: "/api/app/captcha",
    query: { account: "actual-user@example.test", captchaType: "forget", language: "zh-CN" },
  });
  expect(requests[1].path).toContain("issued-code");
  expect(requests[2]).toMatchObject({
    method: "PATCH",
    path: "/api/app/user/password",
    body: { account: "actual-user@example.test", captcha: "issued-code" },
  });
  expect(service.session).toBeNull();
});
