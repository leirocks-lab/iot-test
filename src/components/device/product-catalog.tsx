import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState, Linking, StyleSheet, View } from "react-native";
import { productCatalogOptions } from "../../config/product-catalog";
import type { Product } from "../../services/models";
import {
  ProductCatalogFlow,
  catalogPairingIssue,
  catalogProducts,
} from "../../services/product-catalog";
import { productParameterRows } from "../../services/product-data";
import type { RowanService } from "../../services/rowan";
import { useApp } from "../../ui/context";
import {
  Busy,
  Button,
  Card,
  ErrorText,
  Label,
  styles,
  useAction,
} from "../../ui/kit";

interface ProductCatalogProps {
  service: RowanService;
  disabled: boolean;
  onChoose: (product: Product) => void;
}

function ProductImage({ source, name }: { source?: string; name: string }) {
  const [failedSource, setFailedSource] = useState("");
  if (!source || !source.startsWith("https://") || failedSource === source) {
    return <Label muted>暂无产品图片</Label>;
  }
  return (
    <Image
      source={source}
      accessibilityLabel={name}
      contentFit="contain"
      recyclingKey={source}
      style={catalogStyles.image}
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

/** Basic catalog interaction. Final visual design remains a separate acceptance step. */
export function ProductCatalog({
  service,
  disabled,
  onChoose,
}: ProductCatalogProps) {
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
  const language = settings?.language ?? service.language;
  const sessionRevision = service.sessionRevision;

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
      ) {
        void catalog.start();
      }
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

  const products = catalogProducts(state.products.value ?? [], state.filter);
  const detail = state.detail.value;
  const pairingIssue = detail ? catalogPairingIssue(detail) : "";
  const locked = disabled || !state.active || action.busy;
  const useProduct = () =>
    void action.run(async () => {
      const selected = await catalog.confirmSelection();
      if (selected && focused.current) onChoose(selected);
    });
  const openBuyLink = () =>
    void action.run(async () => {
      const link = catalog.buyLink;
      if (link && focused.current) await Linking.openURL(link);
    });

  return (
    <>
      <Label large>Find your device</Label>
      <View style={styles.row}>
        <Button
          title="Recommended"
          secondary={state.filter.kind !== "recommended"}
          disabled={locked}
          onPress={() => void catalog.filter({ kind: "recommended" })}
        />
        <Button
          title="手动产品"
          secondary={state.filter.kind !== "manual"}
          disabled={locked}
          onPress={() => void catalog.filter({ kind: "manual" })}
        />
      </View>
      {state.categories.loading && <Busy />}
      <ErrorText error={state.categories.error} />
      {!!state.categories.error && (
        <Button
          title="重新加载品类"
          secondary
          disabled={locked}
          onPress={() => void catalog.loadCategories()}
        />
      )}
      <View style={styles.row}>
        {state.categories.value?.map((category) => (
          <Button
            key={category.value}
            title={category.name}
            secondary={
              state.filter.kind !== "category" ||
              state.filter.value !== category.value
            }
            disabled={locked}
            onPress={() =>
              void catalog.filter({ kind: "category", value: category.value })
            }
          />
        ))}
      </View>
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
          <Card>
            <Label muted>
              {state.filter.kind === "recommended"
                ? "暂无推荐产品，可查看手动产品"
                : "当前品类暂无产品"}
            </Label>
          </Card>
        )}
      {products.map((product) => (
        <Card key={product.id}>
          <ProductImage source={product.image} name={product.name} />
          <Label large>{product.name}</Label>
          {!!product.modelName && <Label muted>{product.modelName}</Label>}
          <Button
            title="Select product"
            secondary={state.selectedID !== product.id}
            disabled={locked}
            onPress={() => void catalog.select(product.id)}
          />
        </Card>
      ))}
      {state.detail.loading && <Busy />}
      <ErrorText error={state.detail.error} />
      {state.selectedID && state.detail.error && (
        <Button
          title="重新加载产品详情"
          secondary
          disabled={locked || state.detail.loading}
          onPress={() => void catalog.select(state.selectedID!)}
        />
      )}
      {detail && (
        <Card>
          <ProductDetails product={detail} />
          <ErrorText error={pairingIssue} />
          <ErrorText error={action.error} />
          <Button
            title="使用此产品"
            disabled={
              locked ||
              state.detail.loading ||
              !!state.detail.error ||
              !!pairingIssue
            }
            onPress={useProduct}
          />
          {!!catalog.buyLink && (
            <Button
              title="Shop"
              secondary
              disabled={locked}
              onPress={openBuyLink}
            />
          )}
          <Button
            title="返回产品选择"
            secondary
            disabled={locked}
            onPress={() => catalog.clearSelection()}
          />
        </Card>
      )}
    </>
  );
}

const catalogStyles = StyleSheet.create({
  image: { height: 160, width: "100%" },
});
