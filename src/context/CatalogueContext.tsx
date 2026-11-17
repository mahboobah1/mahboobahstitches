import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Collection, Product, Variant } from "../data/types";
import { api } from "../lib/api";

type Status = "loading" | "ready" | "error";

interface CatalogueValue {
  status: Status;
  collections: Collection[];
  /** Only collections that currently have at least one live product. */
  visibleCollections: Collection[];
  products: Product[];
  getProduct: (slug: string) => Product | undefined;
  getCollection: (slug: string) => Collection | undefined;
  getVariant: (variantId: string) => { product: Product; variant: Variant } | undefined;
}

const Ctx = createContext<CatalogueValue | null>(null);

/** The public catalogue, loaded once from /api/catalogue (one cheap database read on the server). */
export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let alive = true;
    api<{ collections: Collection[]; products: Product[] }>("/api/catalogue")
      .then((d) => {
        if (!alive) return;
        setCollections(d.collections);
        setProducts(d.products);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  const getProduct = useCallback((slug: string) => products.find((p) => p.slug === slug), [products]);
  const getCollection = useCallback((slug: string) => collections.find((c) => c.slug === slug), [collections]);
  const getVariant = useCallback(
    (variantId: string) => {
      for (const product of products) {
        const variant = product.variants.find((x) => x.id === variantId);
        if (variant) return { product, variant };
      }
      return undefined;
    },
    [products],
  );

  const visibleCollections = useMemo(() => collections.filter((c) => c.productCount > 0), [collections]);
  const value = useMemo(
    () => ({ status, collections, visibleCollections, products, getProduct, getCollection, getVariant }),
    [status, collections, visibleCollections, products, getProduct, getCollection, getVariant],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalogue(): CatalogueValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCatalogue must be used inside CatalogueProvider");
  return ctx;
}
