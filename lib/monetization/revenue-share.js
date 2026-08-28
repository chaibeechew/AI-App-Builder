export const CREATOR_PASS_PRICE_USD = 10;
export const APP_SALE_REVENUE_SHARE = 0.05;

/**
 * Soolen AI revenue-share policy.
 * The 5% applies only to revenue from selling the App itself through a supported store.
 * It does NOT apply to the creator's own products, goods, property, services, fees,
 * subscriptions or other business revenue sold through that App.
 */
export function calculateAppSaleShare(appSaleProceedsUsd) {
  const proceeds = Math.max(0, Number(appSaleProceedsUsd || 0));
  return Number((proceeds * APP_SALE_REVENUE_SHARE).toFixed(2));
}

export function buildCreatorStatement({
  appId,
  store,
  period,
  appSaleProceedsUsd = 0,
  independentBusinessRevenueUsd = 0,
}) {
  const appProceeds = Math.max(0, Number(appSaleProceedsUsd || 0));
  const independentRevenue = Math.max(0, Number(independentBusinessRevenueUsd || 0));
  return {
    appId: String(appId || ""),
    store: String(store || "unknown"),
    period: String(period || ""),
    appSaleProceedsUsd: appProceeds,
    appSaleRevenueShareRate: APP_SALE_REVENUE_SHARE,
    soolenAiShareUsd: calculateAppSaleShare(appProceeds),
    creatorAppSaleProceedsUsd: Number((appProceeds - calculateAppSaleShare(appProceeds)).toFixed(2)),
    independentBusinessRevenueUsd: independentRevenue,
    soolenAiShareOnIndependentBusinessRevenueUsd: 0,
    policy: "App sale revenue only; independent products/services revenue is excluded.",
  };
}
