import express from "express";
import { massiveService } from "../services/massiveService.js";

const router = express.Router();

function extractList(payload) {
  const list = payload?.results || payload?.tickers || payload?.data || payload?.items || [];
  return Array.isArray(list) ? list : [];
}

function chunkArray(list, size) {
  if (!Array.isArray(list) || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

function normalizeSnapshot(entry) {
  if (!entry || typeof entry !== "object") return null;

  const symbol = entry.ticker || entry.symbol || entry?.lastQuote?.ticker || "";
  const name = entry.name || entry.companyName || entry.ticker || symbol;
  const price = entry.lastTrade?.price ?? entry.close ?? entry.price ?? entry.lastPrice ?? null;
  const previousClose = entry.previousClose ?? entry.prevClose ?? entry.day?.close ?? null;
  const change = entry.todaysChange ?? entry.day?.change ?? (price != null && previousClose != null ? price - previousClose : null);
  const changePercent = entry.todaysChangePerc ?? entry.day?.changePerc ?? (change != null && previousClose ? (change / previousClose) * 100 : null);
  const volume = entry.volume ?? entry.day?.volume ?? entry.lastQuote?.volume ?? null;
  const marketCap = entry.marketCap ?? entry.market_cap ?? entry.lastQuote?.marketCap ?? null;
  const session = entry.session || {};

  return {
    symbol,
    name,
    price,
    previousClose,
    change,
    changePercent,
    volume,
    marketCap,
    currency: entry.currency || entry.lastQuote?.currency || "USD",
    exchange: entry.exchange || entry.market || entry.primary_exchange || session.exchange || null,
    raw: entry
  };
}

function summarizeBreadth(snapshotItems) {
  const summary = {
    total: 0,
    advancing: 0,
    declining: 0,
    unchanged: 0
  };

  snapshotItems.forEach((entry) => {
    summary.total += 1;
    const percent = entry?.changePercent;
    if (typeof percent === "number") {
      if (percent > 0) summary.advancing += 1;
      else if (percent < 0) summary.declining += 1;
      else summary.unchanged += 1;
      return;
    }

    if (typeof entry?.change === "number") {
      if (entry.change > 0) summary.advancing += 1;
      else if (entry.change < 0) summary.declining += 1;
      else summary.unchanged += 1;
      return;
    }

    summary.unchanged += 1;
  });

  const toPercent = (count) => (summary.total ? (count / summary.total) * 100 : 0);
  return {
    ...summary,
    advancingPct: toPercent(summary.advancing),
    decliningPct: toPercent(summary.declining),
    unchangedPct: toPercent(summary.unchanged)
  };
}

router.get("/overview", async (req, res) => {
  if (!process.env.MASSIVE_API_KEY) {
    return res.status(400).json({ error: "MASSIVE_API_KEY not configured" });
  }

  try {
    const limit = Number(req.query.limit ?? 5);

    const [statusRaw, gainersRaw, losersRaw, activesRaw, marketCapRaw, breadthRaw] = await Promise.all([
      massiveService.getMarketStatusNow().catch((err) => ({ error: err.message })),
      massiveService.getSnapshotsByDirection("gainers", { limit }).catch((err) => ({ error: err.message })),
      massiveService.getSnapshotsByDirection("losers", { limit }).catch((err) => ({ error: err.message })),
      massiveService.getSnapshotsByDirection("actives", { limit }).catch((err) => ({ error: err.message })),
      massiveService.getStockSnapshots({ limit, sort: "market_cap.desc" }).catch((err) => ({ error: err.message })),
      massiveService.getStockSnapshots({ limit: 500, sort: "ticker.asc" }).catch(() => null)
    ]);

    const normalizeList = (payload) => extractList(payload).map(normalizeSnapshot).filter(Boolean);

    const topGainers = normalizeList(gainersRaw).slice(0, limit);
    const topLosers = normalizeList(losersRaw).slice(0, limit);
    const mostActive = normalizeList(activesRaw).slice(0, limit);
    const topMarketCap = normalizeList(marketCapRaw).slice(0, limit);

    const breadthItems = normalizeList(breadthRaw);
    const breadth = summarizeBreadth(breadthItems);

    res.json({
      marketStatus: statusRaw?.results || statusRaw,
      highlights: {
        topGainers,
        topLosers,
        mostActive,
        topMarketCap
      },
      breadth,
      raw: {
        status: statusRaw,
        gainers: gainersRaw,
        losers: losersRaw,
        actives: activesRaw,
        marketCap: marketCapRaw
      }
    });
  } catch (err) {
    console.error("/market/overview error", err);
    res.status(err.status || 500).json({ error: "Failed to load market overview", details: err.message });
  }
});

router.get("/sectors", async (req, res) => {
  if (!process.env.MASSIVE_API_KEY) {
    return res.status(400).json({ error: "MASSIVE_API_KEY not configured" });
  }

  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 200), 20), 500);
    const locale = req.query.locale || "us";

    const tickersResponse = await massiveService.getTickers({
      market: "stocks",
      active: "true",
      limit,
      sort: "market_cap.desc",
      locale
    });

    const tickers = extractList(tickersResponse).filter((ticker) => ticker?.ticker);
    if (!tickers.length) {
      return res.json({ sectors: [] });
    }

    const tickerSymbols = tickers.map((ticker) => ticker.ticker);
    const snapshotMap = new Map();

    const symbolChunks = chunkArray(tickerSymbols, 50);
    await Promise.all(
      symbolChunks.map(async (chunk) => {
        try {
          const snapshotResponse = await massiveService.getStockSnapshots({ tickers: chunk.join(",") });
          const snapshotList = extractList(snapshotResponse);
          snapshotList.forEach((entry) => {
            const symbol = entry?.ticker || entry?.symbol;
            if (symbol) snapshotMap.set(symbol, entry);
          });
        } catch (err) {
          console.warn("Failed to load sector snapshot chunk", err.message);
        }
      })
    );

    const sectorsMap = new Map();

    tickers.forEach((ticker) => {
      const symbol = ticker.ticker;
      const sectorName = ticker.sic_description || ticker.sector || ticker.industry || "Other";
      const snapshot = snapshotMap.get(symbol) || {};
      const day = snapshot.day || {};
      const lastTrade = snapshot.lastTrade || {};

      const price = lastTrade.price ?? snapshot.close ?? day.close ?? ticker?.lastTrade?.price ?? null;
      const previousClose = day.close ?? snapshot.previousClose ?? ticker?.prevDay?.close ?? null;
      const change = snapshot.todaysChange ?? day.change ?? (price != null && previousClose != null ? price - previousClose : null);
      const changePercent = snapshot.todaysChangePerc ?? day.changePerc ?? (change != null && previousClose ? (change / previousClose) * 100 : null);
      const marketCap = snapshot.marketCap ?? ticker.market_cap ?? ticker.marketCap ?? null;
      const volume = day.volume ?? snapshot.volume ?? ticker.volume ?? null;

      let sector = sectorsMap.get(sectorName);
      if (!sector) {
        sector = {
          name: sectorName,
          totalMarketCap: 0,
          totalVolume: 0,
          symbols: 0,
          advancers: 0,
          decliners: 0,
          unchanged: 0,
          weightedChangeSum: 0,
          weightedChangeWeight: 0,
          companies: []
        };
        sectorsMap.set(sectorName, sector);
      }

      sector.symbols += 1;
      if (Number.isFinite(Number(marketCap))) sector.totalMarketCap += Number(marketCap);
      if (Number.isFinite(Number(volume))) sector.totalVolume += Number(volume);

      if (Number.isFinite(Number(changePercent))) {
        const weight = Number.isFinite(Number(marketCap)) ? Number(marketCap) : 1;
        sector.weightedChangeSum += Number(changePercent) * weight;
        sector.weightedChangeWeight += weight;

        if (Number(changePercent) > 0) sector.advancers += 1;
        else if (Number(changePercent) < 0) sector.decliners += 1;
        else sector.unchanged += 1;
      } else if (Number.isFinite(Number(change))) {
        if (Number(change) > 0) sector.advancers += 1;
        else if (Number(change) < 0) sector.decliners += 1;
        else sector.unchanged += 1;
      } else {
        sector.unchanged += 1;
      }

      sector.companies.push({
        symbol,
        name: ticker.name || ticker.company_name || symbol,
        price: Number.isFinite(Number(price)) ? Number(price) : null,
        changePercent: Number.isFinite(Number(changePercent)) ? Number(changePercent) : null,
        marketCap: Number.isFinite(Number(marketCap)) ? Number(marketCap) : null
      });
    });

    const sectors = Array.from(sectorsMap.values())
      .map((sector) => {
        const changePercent = sector.weightedChangeWeight
          ? sector.weightedChangeSum / sector.weightedChangeWeight
          : null;

        const sortedByCap = sector.companies
          .filter((company) => Number.isFinite(company.marketCap))
          .sort((a, b) => b.marketCap - a.marketCap)
          .slice(0, 5);

        const topGainers = sector.companies
          .filter((company) => Number.isFinite(company.changePercent))
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 3);

        const topLosers = sector.companies
          .filter((company) => Number.isFinite(company.changePercent))
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 3);

        return {
          name: sector.name,
          changePercent,
          totalMarketCap: sector.totalMarketCap || null,
          totalVolume: sector.totalVolume || null,
          symbols: sector.symbols,
          advancers: sector.advancers,
          decliners: sector.decliners,
          unchanged: sector.unchanged,
          topConstituents: sortedByCap,
          topMovers: {
            gainers: topGainers,
            losers: topLosers
          }
        };
      })
      .sort((a, b) => (Number(b.totalMarketCap || 0) || 0) - (Number(a.totalMarketCap || 0) || 0));

    res.json({ sectors });
  } catch (err) {
    console.error("/market/sectors error", err?.details || err?.message || err);
    res.status(err.status || 500).json({ error: "Failed to load sector data", details: err.message });
  }
});

export default router;
