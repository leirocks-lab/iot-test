// Test-only HTTP replies for settings/member/unbind flow tests. No device simulator.
import type { HttpClient, HttpRequest, HttpResponse } from "../lib/core";
import type { Settings, Role } from "../services/models";
export { MemoryStorage } from "../services/memory-storage";
export const defaultSettings = (): Settings => ({
  language: "zh-CN",
  notification: true,
  theme: "system",
  wallpaper: null,
  homeLayout: "layout1",
  temperatureUnit: "C",
  measurementSystem: "metric",
});
type Member = { role: Role; nickname: string; roomID: string | null };
export class SettingsFixture {
  state = {
    accounts: [
      {
        rooms: [
          { id: "room_living", name: "Living room" },
          { id: "room_kitchen", name: "Kitchen" },
        ],
      },
    ],
    devices: [
      {
        id: "dev_wine",
        online: true,
        members: {
          user_demo: { role: "sa", nickname: "Living room cooler", roomID: "room_living" },
        } as Record<string, Member>,
      },
    ],
  };
  static async open(_storage?: unknown) {
    return new SettingsFixture();
  }
}
export class SettingsHttp implements HttpClient {
  constructor(private db: SettingsFixture) {}
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const { path, method } = req,
      body = (req.body ?? {}) as Record<string, string>;
    const reply = (data: unknown = {}, code = 0): HttpResponse<T> => ({
      status: 200,
      data: {
        success: code === 0,
        code,
        message:
          code === 1361
            ? "设备不存在"
            : code === 1362
              ? "当前账号没有绑定设备"
              : code === 1372
                ? "仅管理员可执行"
                : code
                  ? "fixture denial"
                  : "",
        data,
      } as T,
      headers: {},
    });
    if (path === "/api/app/session")
      return reply({
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
        expiresIn: 3600,
        tokenType: "bearer",
        userID: "user_demo",
        setting: defaultSettings(),
      });
    if (path === "/api/app/user/setting") return reply(defaultSettings());
    const device = this.db.state.devices[0],
      member = device.members.user_demo,
      rooms = this.db.state.accounts[0].rooms;
    const view = () => ({
      deviceNickname: member.nickname,
      bindingRole: member.role,
      bindingAt: "",
      online: device.online,
      device: { id: device.id, name: "Fixture device", mac: "aabbccddeeff" },
      product: { id: "fixture-product" },
    });
    if (path === "/api/app/devices")
      return reply(
        member
          ? [
              {
                room: {
                  id: member.roomID,
                  name: rooms.find((r) => r.id === member.roomID)?.name ?? "未分房",
                },
                devices: [view()],
              },
            ]
          : [],
      );
    if (path === "/api/app/user/locations")
      return reply(
        rooms.map((r) => ({
          ...r,
          version: 1,
          updatedAt: new Date(1000).toISOString(),
          deviceCount: r.id === member?.roomID ? 1 : 0,
        })),
      );
    if (!path.startsWith("/api/app/devices/"))
      throw new Error("Unconfigured fixture request: " + path);
    const [, suffix = ""] = path.slice("/api/app/devices/".length).split(/\/(.*)/s);
    if (path.split("/")[4] !== device.id)
      return reply({}, suffix === "users/self" ? 1361 : suffix === "users" ? 1351 : 1371);
    if (!member)
      return reply({}, suffix === "users/self" ? 1362 : suffix === "users" ? 1352 : 1372);
    if (suffix === "users/self" && method === "DELETE") {
      delete device.members.user_demo;
      return reply();
    }
    if (!suffix) {
      if (method === "PATCH") {
        if (member.role === "obs") return reply({}, 403);
        if (!body.nickname.trim() || body.nickname.length > 20) return reply({}, 400);
        member.nickname = body.nickname;
      }
      return reply(view());
    }
    if (suffix === "location") {
      if (method === "PUT") member.roomID = body.id || null;
      return reply(rooms.find((r) => r.id === member.roomID) ?? { id: null, name: "未分房" });
    }
    if (suffix === "users" && member.role !== "sa") return reply({}, 1372);
    if (suffix === "users")
      return reply(
        Object.entries(device.members).map(([userID, m]) => ({
          userID,
          bindingRole: m.role,
          nickname: null,
        })),
      );
    if (suffix.startsWith("users/") && method === "DELETE") {
      const target = decodeURIComponent(suffix.slice(6));
      if (member.role !== "sa") return reply({}, 1372);
      if (!device.members[target]) return reply({}, 1354);
      if (device.members[target].role !== "mbr") return reply({}, 1353);
      delete device.members[target];
      return reply();
    }
    throw new Error("Unconfigured fixture request: " + method + " " + path);
  }
}
