import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { productCatalogOptions } from "../../config/product-catalog";
import type { Product } from "../../services/models";
import {
  ProductCatalogFlow,
  catalogPairingIssue,
  catalogProducts,
  trustedBuyLink,
} from "../../services/product-catalog";
import { productParameterRows } from "../../services/product-data";
import type { RowanService } from "../../services/rowan";
import { useApp } from "../../ui/context";
import { Busy, Button, ErrorText, Label, useAction } from "../../ui/kit";
import { ProductThumbnail } from "./product-thumbnail";

function ProductImage({ source, name }: { source?: string; name: string }) {
  const [failedSource, setFailedSource] = useState("");
  if (!source?.startsWith("https://") || failedSource === source) {
    return <ProductThumbnail name={name} style={catalogStyles.detailImage} />;
  }
  return (
    <Image
      source={source}
      accessibilityLabel={name}
      contentFit="contain"
      recyclingKey={source}
      style={catalogStyles.detailImage}
      onError={() => setFailedSource(source)}
    />
  );
}

export function ProductDetails({ product }: { product: Product }) {
  const parameterRows = productParameterRows(product.parameters);
  const configTypes =
    product.configTypes ?? (product.configType ? [product.configType] : []);
  const images = product.images ?? (product.image ? [product.image] : []);
  return (
    <>
      <Label large>{product.name}</Label>
      {!!product.modelName && <Label muted>{product.modelName}</Label>}
      {images.length ? (
        images.map((source, index) => (
          <ProductImage
            key={`${source}-${index}`}
            source={source}
            name={product.name}
          />
        ))
      ) : (
        <ProductImage name={product.name} />
      )}
      {!!product.seriesName && <Label>{`系列：${product.seriesName}`}</Label>}
      <Label>{`连接方式：${product.connectType || "未提供"}`}</Label>
      <Label>{`配网方式：${configTypes.join(" / ") || "未提供"}`}</Label>
      <Label>{`云平台：${product.cloudPlatform || "未提供"}`}</Label>
      <Label>{`蓝牙配网：${product.bluetooth === undefined ? "未提供" : product.bluetooth ? "支持" : "不支持"}`}</Label>
      <Label large>产品参数</Label>
      {parameterRows.length ? (
        parameterRows.map((row, index) => (
          <Label
            key={`${row.name}-${index}`}
          >{`${row.name}：${row.value}`}</Label>
        ))
      ) : (
        <Label muted>暂无产品参数</Label>
      )}
      <Label large>产品介绍</Label>
      <Label>{product.introduction || "暂无产品介绍"}</Label>
    </>
  );
}

export function ProductCatalog({
  service,
  disabled,
  onChoose,
  onProducts,
}: {
  service: RowanService;
  disabled: boolean;
  onChoose: (product: Product) => void;
  onProducts?: (products: Product[]) => void;
}) {
  const catalog = useMemo(
    () => new ProductCatalogFlow(service, productCatalogOptions),
    [service],
  );
  const state = useSyncExternalStore(
    catalog.subscribe,
    catalog.snapshot,
    catalog.snapshot,
  );
  const focused = useRef(false);
  const action = useAction();
  const { settings } = useApp();
  const insets = useSafeAreaInsets();
  const language = settings?.language ?? service.language;
  const sessionRevision = service.sessionRevision;
  const [gridWidth, setGridWidth] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (
        service.language !== language ||
        service.sessionRevision !== sessionRevision
      )
        return;
      focused.current = true;
      if (
        AppState.currentState !== "background" &&
        AppState.currentState !== "inactive"
      )
        void catalog.start();
      const subscription = AppState.addEventListener("change", (status) => {
        if (status === "active" && focused.current) void catalog.start();
        else catalog.stop();
      });
      return () => {
        focused.current = false;
        subscription.remove();
        catalog.stop();
      };
    }, [catalog, language, service, sessionRevision]),
  );

  useEffect(() => {
    if (state.products.value)
      onProducts?.(state.products.value.flatMap((group) => group.products));
  }, [onProducts, state.products.value]);

  const products = catalogProducts(state.products.value ?? [], {
    kind: "recommended",
  });
  const categories = state.categories.value ?? [];
  const categoryKeys = [
    ...new Set([
      ...categories.map((category) => category.value),
      ...products.map((product) => product.category),
    ]),
  ];
  const sections = categoryKeys
    .map((key) => ({
      key,
      name:
        categories.find((category) => category.value === key)?.name ||
        state.products.value?.find((group) => group.category === key)
          ?.categoryName?.[language] ||
        key,
      products: products.filter((product) => product.category === key),
    }))
    .filter((section) => section.products.length);
  const detail = state.detail.value;
  const pairingIssue = detail ? catalogPairingIssue(detail) : "";
  const locked = disabled || !state.active || action.busy;
  const useProduct = () =>
    void action.run(async () => {
      const selected = await catalog.confirmSelection();
      if (selected && focused.current) {
        catalog.clearSelection();
        onChoose(selected);
      }
    });
  const openBuyLink = (product: Product) =>
    void action.run(async () => {
      const link = trustedBuyLink(
        product.buyLink,
        productCatalogOptions.trustedBuyOrigins,
      );
      if (link && focused.current) await Linking.openURL(link);
    });

  return (
    <View
      style={catalogStyles.catalog}
      onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
    >
      {state.categories.loading && !state.products.value && <Busy />}
      <ErrorText error={state.categories.error} />
      {!!state.categories.error && (
        <Button
          title="重新加载品类"
          secondary
          disabled={locked}
          onPress={() => void catalog.loadCategories()}
        />
      )}
      {state.products.loading && <Busy />}
      <ErrorText error={state.products.error} />
      {!!state.products.error && (
        <Button
          title="重新加载产品"
          secondary
          disabled={locked}
          onPress={() => void catalog.loadProducts()}
        />
      )}
      {!state.products.loading &&
        !state.products.error &&
        state.products.value &&
        !products.length && (
          <Text style={catalogStyles.empty}>暂无推荐设备</Text>
        )}
      {sections.map((section) => (
        <View key={section.key} style={catalogStyles.section}>
          <Text style={catalogStyles.categoryTitle}>{section.name}：</Text>
          <View style={catalogStyles.grid}>
            {section.products.map((product) => {
              const buyLink = trustedBuyLink(
                product.buyLink,
                productCatalogOptions.trustedBuyOrigins,
              );
              return (
                <View
                  key={product.id}
                  style={[
                    catalogStyles.catalogCard,
                    { width: gridWidth ? (gridWidth - 20) / 3 : "31%" },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`查看 ${product.name}`}
                    disabled={locked}
                    onPress={() => void catalog.select(product.id)}
                    style={({ pressed }) => [
                      catalogStyles.product,
                      pressed && catalogStyles.pressed,
                      locked && catalogStyles.disabled,
                    ]}
                  >
                    <ProductThumbnail
                      source={product.image}
                      name={product.name}
                      style={catalogStyles.thumbnail}
                    />
                    <Text numberOfLines={1} style={catalogStyles.productName}>
                      {product.modelName || product.name}
                    </Text>
                    {!!product.seriesName && (
                      <Text numberOfLines={1} style={catalogStyles.series}>
                        {product.seriesName}
                      </Text>
                    )}
                    <View style={catalogStyles.connections}>
                      {product.connectType === "wifi" && (
                        <Svg
                          width={16}
                          height={16}
                          viewBox="0 0 24 24"
                          accessibilityLabel="Wi-Fi"
                        >
                          <Path
                            d="M2 8c5.5-5.3 14.5-5.3 20 0M5.5 11.5a9.3 9.3 0 0 1 13 0M9 15a4.3 4.3 0 0 1 6 0"
                            stroke="#777777"
                            strokeWidth={1.5}
                            fill="none"
                            strokeLinecap="round"
                          />
                          <Circle cx={12} cy={19} r={1.2} fill="#777777" />
                        </Svg>
                      )}
                      {product.bluetooth === true && (
                        <Image
                          source={require("../../../assets/images/bluetooth-gray.png")}
                          style={catalogStyles.bluetoothIcon}
                          contentFit="contain"
                          accessibilityLabel="蓝牙"
                        />
                      )}
                    </View>
                  </Pressable>
                  {!!buyLink && (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`购买 ${product.name}`}
                      disabled={locked}
                      onPress={() => openBuyLink(product)}
                      style={({ pressed }) => [
                        catalogStyles.shop,
                        pressed && catalogStyles.pressed,
                      ]}
                    >
                      <Text style={catalogStyles.shopText}>Shop</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      <Modal
        visible={!!state.selectedID}
        transparent
        animationType="slide"
        onRequestClose={() => catalog.clearSelection()}
      >
        <View style={catalogStyles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="关闭产品详情"
            onPress={() => catalog.clearSelection()}
          />
          <View
            style={[
              catalogStyles.detailsSheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={catalogStyles.sheetHeader}>
              <Text style={catalogStyles.sheetTitle}>产品详情</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="关闭产品详情"
                onPress={() => catalog.clearSelection()}
                style={catalogStyles.close}
              >
                <Text style={catalogStyles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={catalogStyles.detailsContent}>
              {state.detail.loading && <Busy />}
              <ErrorText error={state.detail.error} />
              {!!state.detail.error && (
                <Button
                  title="重新加载产品详情"
                  secondary
                  disabled={locked || state.detail.loading}
                  onPress={() => void catalog.select(state.selectedID!)}
                />
              )}
              {detail && (
                <>
                  <ProductDetails product={detail} />
                  <ErrorText error={pairingIssue} />
                </>
              )}
              <ErrorText error={action.error} />
            </ScrollView>
            <Button
              title="使用此产品"
              disabled={
                locked ||
                !detail ||
                state.detail.loading ||
                !!state.detail.error ||
                !!pairingIssue
              }
              onPress={useProduct}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const catalogStyles = StyleSheet.create({
  catalog: { width: "100%", gap: 20 },
  section: { gap: 14 },
  categoryTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#111111",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catalogCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.03)",
  },
  product: { alignItems: "center" },
  thumbnail: { width: "100%", height: 52, marginBottom: 12 },
  productName: {
    maxWidth: "100%",
    fontSize: 14,
    lineHeight: 20,
    color: "#333333",
  },
  series: {
    maxWidth: "100%",
    fontSize: 12,
    lineHeight: 18,
    color: "#999999",
    marginTop: 2,
  },
  connections: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 24,
    marginTop: 4,
  },
  bluetoothIcon: { width: 14, height: 14 },
  shop: {
    marginTop: 6,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  shopText: { fontSize: 14, color: "#1677C8", lineHeight: 20 },
  empty: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 22,
    color: "#999999",
    paddingVertical: 28,
  },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
  detailImage: { height: 160, width: "100%" },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  detailsSheet: {
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 17, fontWeight: "600", color: "#111111" },
  close: {
    position: "absolute",
    right: 0,
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 26, color: "#777777" },
  detailsContent: { gap: 14, paddingBottom: 20 },
});
