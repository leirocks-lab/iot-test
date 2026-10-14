import type {
  Language,
  Product,
  ProductCategory,
  ProductGroup,
} from "./models";

const mockNames: Record<string, Record<Language, string>> = {
  WineCooler: { "zh-CN": "酒柜", "zh-TW": "酒櫃", en: "Wine cooler" },
  Dehumidifier: { "zh-CN": "除湿机", "zh-TW": "除濕機", en: "Dehumidifier" },
};

/** Explicit development content; these translations are not a production catalog. */
export function mockProductCategories(
  products: Product[],
  language: Language,
): ProductCategory[] {
  return [...new Set(products.map((product) => product.category))].map(
    (value) => ({
      value,
      name: mockNames[value]?.[language] ?? value,
    }),
  );
}

export function mockProductGroups(products: Product[]): ProductGroup[] {
  return [...new Set(products.map((product) => product.category))].map(
    (category) => ({
      category,
      categoryName: mockNames[category],
      products: products.filter((product) => product.category === category),
    }),
  );
}

export function mockProductDetail(
  product: Product,
  language: Language,
): Product {
  const introduction: Record<Language, string> = {
    "zh-CN": "ROWAN 智能家居设备 · Mock 产品，仅用于开发验证。",
    "zh-TW": "ROWAN 智慧家居裝置 · Mock 產品，僅用於開發驗證。",
    en: "ROWAN smart home device. Mock product for development validation only.",
  };
  return {
    ...product,
    images: product.image ? [product.image] : [],
    parameters: [{ key: "model", value: product.modelName }],
    introduction: introduction[language],
  };
}
