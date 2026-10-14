import type { ProductCatalogOptions } from "../services/product-catalog";

/** Populate only after the backend/configuration owner supplies the deployment values. */
export const productCatalogOptions: ProductCatalogOptions = {
  // No production purchase origin or catalog brand ID has been supplied.
  trustedBuyOrigins: [],
};
