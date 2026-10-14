import type { HelpArticle, Language } from "./models";

const content: Record<Language, Pick<HelpArticle, "title" | "content">[]> = {
  "zh-CN": [
    {
      title: "设备使用帮助",
      content: "保持设备通风。控制结果以设备回报为准。",
    },
    {
      title: "常见问题",
      content: "配网时请使用 2.4 GHz Wi-Fi，清洁前关闭电源。",
    },
  ],
  "zh-TW": [
    {
      title: "裝置使用說明",
      content: "保持裝置通風。控制結果以裝置回報為準。",
    },
    {
      title: "常見問題",
      content: "配網時請使用 2.4 GHz Wi-Fi，清潔前關閉電源。",
    },
  ],
  en: [
    {
      title: "Device help",
      content:
        "Keep the device ventilated. Confirm control through device reports.",
    },
    {
      title: "FAQ",
      content:
        "Use 2.4 GHz Wi-Fi for setup and turn off power before cleaning.",
    },
  ],
};

export function mockDeviceHelp(language: Language): HelpArticle[] {
  return content[language].map((article, index) => ({
    id: `help_mock_${index + 1}`,
    ...article,
  }));
}
