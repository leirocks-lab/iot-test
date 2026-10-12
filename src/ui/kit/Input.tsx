import { Image } from "expo-image";
import { isValidElement, useState, type ReactElement } from "react";
import {
  Pressable,
  TextInput,
  View,
  type ImageSourcePropType,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useColors } from "../context";

export type PrefixIcon = ImageSourcePropType | ReactElement;

export type InputProps = TextInputProps & {
  prefixIcon?: PrefixIcon;
  clearable?: boolean;
};

const iconSize = 22;
const clearIcon = require("../../../assets/images/input-clear.png");
const hiddenPasswordIcon = require("../../../assets/images/password-hidden.png");
const showPasswordIcon = require("../../../assets/images/password-show.png");

export function Input({
  style,
  prefixIcon,
  clearable = false,
  secureTextEntry = false,
  value,
  onChangeText,
  onFocus,
  onBlur,
  editable = true,
  ...props
}: InputProps) {
  const colors = useColors();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(value);
  const hasTrailingAction =
    (clearable && hasValue && editable) || secureTextEntry;
  const containerStyle: ViewStyle = {
    minHeight: 48,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
  };

  return (
    <View
      style={[
        containerStyle,
        style as ViewStyle,
        focused && { borderWidth: 1, borderColor: "#CCCCCC" },
      ]}
    >
      {prefixIcon ? (
        isValidElement(prefixIcon) ? (
          <View style={{ width: iconSize, height: iconSize, marginRight: 10 }}>
            {prefixIcon}
          </View>
        ) : (
          <Image
            source={prefixIcon}
            contentFit="contain"
            style={{ width: iconSize, height: iconSize, marginRight: 10 }}
            accessibilityIgnoresInvertColors
          />
        )
      ) : null}
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        editable={editable}
        underlineColorAndroid="transparent"
        secureTextEntry={secureTextEntry && !passwordVisible}
        placeholderTextColor={colors.font.subtitle2}
        style={[
          {
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
            minHeight: 48,
            paddingHorizontal: 0,
            fontSize: 16,
          },
          style,
        ]}
      />
      {hasTrailingAction ? (
        <View
          style={{
            flexShrink: 0,
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 4,
          }}
        >
          {clearable && hasValue && editable ? (
            <Pressable
              accessibilityLabel="清除输入"
              hitSlop={8}
              onPress={() => onChangeText?.("")}
              style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}
            >
              <Image
                source={clearIcon}
                contentFit="contain"
                style={{ width: iconSize, height: iconSize }}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ) : null}
          {secureTextEntry ? (
            <Pressable
              accessibilityLabel={passwordVisible ? "隐藏密码" : "显示密码"}
              hitSlop={8}
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={{
                width: 30,
                height: 30,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: clearable && hasValue ? 4 : 0,
              }}
            >
              <Image
                source={passwordVisible ? showPasswordIcon : hiddenPasswordIcon}
                contentFit="contain"
                style={{ width: iconSize, height: iconSize }}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
