import {
  ApiError,
  type Language,
  type Product,
  type ProductCategory,
  type ProductGroup,
  type ProductParameters,
} from "./models";

type ObjectValue = Record<string, unknown>;

function object(value: unknown): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(502, "产品响应结构不完整");
  }
  return value as ObjectValue;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new ApiError(502, "产品响应不是列表");
  }
  return value;
}

function text(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(502, `${field}格式不支持`);
  }
  return value;
}

function identifier(value: unknown): string {
  const result = text(value, "产品标识");
  if (!result) throw new ApiError(502, "产品响应缺少有效标识");
  return result;
}

function strings(value: unknown, field: string): string[] {
  // The Word field table uses a scalar; its example and deployed schema use arrays.
  if (typeof value === "string") return value ? [value] : [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ApiError(502, `${field}格式不支持`);
  }
  return [...value];
}

function boolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(502, `${field}格式不支持`);
  }
  return value;
}

function parameters(value: unknown): ProductParameters | undefined {
  if (value === undefined || value === null) return undefined;
  return Array.isArray(value) ? value.map((item) => ({ ...object(item) })) : { ...object(value) };
}

export function productCategories(value: unknown): ProductCategory[] {
  const seen = new Set<string>();
  return array(value).map((item) => {
    const wire = object(item);
    const stableValue = identifier(wire.value);
    const name = text(wire.name, "品类名称");
    if (name === undefined || seen.has(stableValue)) {
      throw new ApiError(502, "品类名称缺失或品类标识重复");
    }
    seen.add(stableValue);
    // PAIR-03 has already selected a name using Accept-Language on the server.
    return { name: name || stableValue, value: stableValue };
  });
}

export function productData(value: unknown, category = ""): Product {
  const wire = object(value);
  const productID = identifier(wire.id);
  const imagesValue = wire.images ?? wire.image;
  const images =
    imagesValue === undefined || imagesValue === null ? [] : strings(imagesValue, "产品图片");
  const configValue = wire.configTypes ?? wire.configType;
  const configTypes =
    configValue === undefined || configValue === null
      ? undefined
      : strings(configValue, "产品配网方式");
  const sort = wire.sort;
  if (sort !== undefined && sort !== null && (typeof sort !== "number" || !Number.isFinite(sort))) {
    throw new ApiError(502, "产品排序值格式不支持");
  }
  const bluetooth = boolean(wire.bluetooth, "蓝牙能力");
  const recommended = boolean(wire.recommended, "推荐标识");
  const detailParameters = parameters(wire.parameters);
  const introduction = wire.introduction === null ? null : text(wire.introduction, "产品介绍");

  return {
    id: productID,
    name: text(wire.name, "产品名称") || productID,
    category: text(wire.category, "产品品类") ?? category,
    seriesName: text(wire.seriesName, "产品系列") ?? "",
    modelName: text(wire.modelName, "产品型号") ?? "",
    image: images[0] ?? "",
    images,
    buyLink: text(wire.buyLink, "购买链接") ?? "",
    connectType: text(wire.connectType, "产品连接方式"),
    cloudPlatform: text(wire.cloudPlatform, "产品云平台"),
    ...(configTypes !== undefined ? { configTypes } : {}),
    ...(bluetooth !== undefined ? { bluetooth } : {}),
    ...(recommended !== undefined ? { recommended } : {}),
    ...(typeof sort === "number" ? { sort } : {}),
    ...(detailParameters !== undefined ? { parameters: detailParameters } : {}),
    ...(introduction !== undefined ? { introduction } : {}),
  };
}

export function productGroups(value: unknown): ProductGroup[] {
  const seen = new Set<string>();
  return array(value).map((item) => {
    const wire = object(item);
    const category = identifier(wire.category);
    let categoryName: ProductGroup["categoryName"];
    if (wire.categoryName !== undefined && wire.categoryName !== null) {
      const names = object(wire.categoryName);
      categoryName = {};
      for (const language of ["zh-CN", "zh-TW", "en"] as const) {
        const name = text(names[language], "品类翻译");
        if (name !== undefined) categoryName[language] = name;
      }
    }
    const products = array(wire.products).map((item) => {
      const product = productData(item, category);
      if (product.category !== category || seen.has(product.id)) {
        throw new ApiError(502, "产品品类不一致或产品标识重复");
      }
      seen.add(product.id);
      return product;
    });
    return { category, ...(categoryName ? { categoryName } : {}), products };
  });
}

export function productGroupName(group: ProductGroup, language: Language): string {
  return group.categoryName?.[language] || group.categoryName?.en || group.category;
}

export function productParameterRows(value?: ProductParameters): { name: string; value: string }[] {
  if (!value) return [];
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => {
    if (typeof entry.key === "string" && typeof entry.value === "string") {
      return [{ name: entry.key, value: entry.value }];
    }
    return Object.entries(entry).map(([name, value]) => ({
      name,
      value: typeof value === "string" ? value : (JSON.stringify(value) ?? ""),
    }));
  });
}
