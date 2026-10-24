import { Input } from "@/ui/kit/Input";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Page } from "../ui/kit";

const regions = [
  "美国",
  "美国",
  "美国（当前）",
  "美国",
  "巴哈马",
  "巴林",
  "库克群岛",
  "库拉索",
  "多米尼克",
  "多多多",
  "中国大陆",
  "中国台北",
  "中国香港",
  "中国澳门",
  "中非共和国",
];
export default function Region() {
  const params = useLocalSearchParams<{ selected?: string }>();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => regions.filter((name) => name.includes(query)), [query]);
  const choose = (name: string) =>
    router.replace({
      pathname: "/auth/register",
      params: {
        region: name === "美国（当前）" ? "US" : name,
        regionName: name.replace("（当前）", ""),
      },
    });
  return (
    <Page title="国家或地区" back>
      <View style={{ gap: 10 }}>
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 9,
            minHeight: 46,
            justifyContent: "center",
          }}
        >
          <Input
            autoFocus
            placeholder="请输入国家或地区名称"
            value={query}
            onChangeText={setQuery}
            style={{ fontSize: 16 }}
          />
        </View>
        {filtered.length === 0 ? (
          <Text style={{ color: "#999", padding: 16 }}>暂无匹配结果</Text>
        ) : (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              paddingVertical: 4,
            }}
          >
            {filtered.map((name, i) => (
              <Pressable
                key={`${name}-${i}`}
                onPress={() => choose(name)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 13,
                  flexDirection: "row",
                }}
              >
                <Text style={{ fontSize: 16, flex: 1 }}>{name}</Text>
                {(name === "美国（当前）" ||
                  (params.selected === "US" && name === "美国" && i === 0)) && (
                  <Text style={{ color: "#1677aa" }}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}
