import { massiveService } from "../services/massiveService.js";

function pickSnapshot(snapshotResponse) {
  if (!snapshotResponse) return null;
  if (Array.isArray(snapshotResponse?.tickers) && snapshotResponse.tickers.length) {
    return snapshotResponse.tickers[0];
  }
  if (Array.isArray(snapshotResponse?.results) && snapshotResponse.results.length) {
    return snapshotResponse.results[0];
  }
  if (typeof snapshotResponse === "object" && snapshotResponse !== null) {
    return snapshotResponse;
  }
  return null;
}

export async function fetchMassiveStockSummary(symbol) {
  if (!process.env.MASSIVE_API_KEY || !symbol) return null;
  const normalized = String(symbol).trim().toUpperCase();
  if (!normalized) return null;

  try {
    const [snapshotResp, detailResp] = await Promise.all([
      massiveService.getStockSnapshots({ tickers: normalized }).catch(() => null),
      massiveService.getTickerDetails(normalized).catch(() => null)
    ]);

    const snapshot = pickSnapshot(snapshotResp);
    const details = detailResp?.results || detailResp || null;
    const day = snapshot?.day || {};
    const lastTrade = snapshot?.lastTrade || {};
    const prevDay = snapshot?.prevDay || {};

    const price = lastTrade.price ?? day.close ?? snapshot?.close ?? snapshot?.price ?? null;
    const previousClose = day.close ?? prevDay.close ?? snapshot?.previousClose ?? null;
    const change = snapshot?.todaysChange ?? day.change ?? (price != null && previousClose != null ? price - previousClose : null);
    const changePercent = snapshot?.todaysChangePerc ?? day.changePerc ?? (change != null && previousClose ? (change / previousClose) * 100 : null);

    return {
      symbol: normalized,
      name: details?.name || snapshot?.name || snapshot?.ticker || normalized,
      price,
      previousClose,
      change,
      changePercent,
      currency: details?.currency_name || snapshot?.currency || "USD",
      snapshot,
      details
    };
  } catch (err) {
    return null;
  }
}
