import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useApp, useColors } from "../ui/context";
import { Busy, ErrorText, Page, useAction } from "../ui/kit";

const recommendations = ["书房", "儿童房", "餐厅", "阳台", "浴室", "地下室"];

export default function AddRoom() {
  const { runtime } = useApp();
  const colors = useColors();
  const action = useAction();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const valid = Boolean(name.trim()) && name.trim().length <= 20;
  const submit = () => {
    if (!valid || !runtime) return;
    void action.run(async () => {
      await runtime.service.createRoom(name.trim());
      router.back();
    });
  };
  return (
    <Page
      title="添加房间"
      action={
        <Pressable
          disabled={!valid || action.busy}
          onPress={submit}
          style={{ padding: 8 }}
        >
          <Text
            style={{
              color: valid ? colors.font.primary : colors.font.subtitle2,
              fontSize: 16,
            }}
          >
            确认
          </Text>
        </Pressable>
      }
    >
      {action.busy && <Busy />}
      <ErrorText error={action.error} />
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.font.title,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            房间名称
          </Text>
          <Text style={{ color: colors.font.subtitle2, fontSize: 13 }}>
            {name.length}/20
          </Text>
        </View>
        <View
          style={{
            height: 48,
            borderRadius: 10,
            backgroundColor: colors.background.invert,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
          }}
        >
          <TextInput
            value={name}
            maxLength={20}
            onChangeText={(value) => {
              setName(value);
              setSelected(null);
            }}
            placeholder="请输入房间名称"
            placeholderTextColor={colors.font.subtitle2}
            style={{ flex: 1, fontSize: 16, color: colors.font.title }}
          />
          <Image
            source={require("../../assets/images/edit-icon.png")}
            style={{ width: 20, height: 20, opacity: 0.55 }}
          />
        </View>
      </View>
      <Text
        style={{
          color: colors.font.title,
          fontSize: 16,
          fontWeight: "600",
          marginTop: 18,
        }}
      >
        推荐名称
      </Text>
      <View
        style={{
          backgroundColor: colors.background.invert,
          paddingHorizontal: 18,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {recommendations.map((item) => {
          const active = selected === item;
          return (
            <Pressable
              key={item}
              onPress={() => {
                setSelected(item);
                setName(item);
              }}
              style={{
                minHeight: 46,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: active ? colors.font.primary : colors.font.title,
                  fontSize: 16,
                }}
              >
                {item}
              </Text>
              {active && (
                <Image
                  source={require("../../assets/images/multiple-choice-selected.png")}
                  style={{ width: 22, height: 22 }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}
