import express from "express";
import axios from "axios";
import { massiveService } from "../services/massiveService.js";
import { generateMockNews } from "../services/mockData.js";

const router = express.Router();

function extractNewsList(payload) {
  const list = payload?.results || payload?.data || payload?.items || payload?.news || payload?.articles || [];
  return Array.isArray(list) ? list : [];
}

function normalizeNewsItem(item) {
  if (!item || typeof item !== "object") return null;
  const publishedRaw = item.published_at || item.publishedAt || item.published || item.date || item.time || null;
  let publishedAt = null;
  if (publishedRaw) {
    const date = new Date(publishedRaw);
    publishedAt = Number.isNaN(date.getTime()) ? String(publishedRaw) : date.toISOString();
  }

  return {
    id: item.id || item.article_id || item.uuid || item.url || null,
    title: item.title || item.headline || item.name || "Untitled",
    description: item.description || item.summary || item.snippet || "",
    url: item.url || item.article_url || item.link || null,
    image: item.image_url || item.image || item.thumbnail || null,
    tickers: item.tickers || item.symbols || item.related_tickers || [],
    source: item.source || item.source_name || item.sourceName || null,
    category: item.category || item.topic || null,
    publishedAt
  };
}

async function fetchLegacyTopNews({ limit, category, symbols, search, language, key }) {
  const url = "https://api.massive.com/v1/news/top";
  const params = { limit, language };
  if (category) params.category = category;
  if (symbols) params.symbols = symbols;
  if (search) params.search = search;

  const fetchWithAuth = async (headers) => {
    const { data } = await axios.get(url, { headers, params });
    return data;
  };

  try {
    return await fetchWithAuth({ Authorization: `Bearer ${key}` });
  } catch (err) {
    if (err?.response?.status !== 401) throw err;
    try {
      return await fetchWithAuth(undefined);
    } catch (nestedErr) {
      const fallbackParams = { ...params, apikey: key };
      const { data } = await axios.get(url, { params: fallbackParams });
      return data;
    }
  }
}

router.get("/top", async (req, res) => {
  try {
    const key = process.env.MASSIVE_API_KEY;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    
    // Use mock data if API key is not configured
    if (!key) {
      return res.json(generateMockNews(limit));
    }

    const category = req.query.category && req.query.category !== "all" ? req.query.category : undefined;
    const symbols = req.query.symbols || req.query.symbol || undefined;
    const search = req.query.search || undefined;
    const language = req.query.language || "en";
    const source = req.query.source || undefined;
    const order = req.query.order || "published_at.desc";

    const params = {
      limit,
      language,
      order
    };
    if (category) {
      params.categories = category;
      params.category = category;
    }
    if (symbols) {
      params.ticker = symbols;
      params.tickers = symbols;
    }
    if (search) params.search = search;
    if (source) params.source = source;

    let payload;
    try {
      payload = await massiveService.getReferenceNews(params);
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status && [400, 401, 403, 404].includes(status)) {
        try {
          payload = await fetchLegacyTopNews({ limit, category, symbols, search, language, key });
        } catch (legacyErr) {
          // If legacy also fails, fall back to mock data
          console.warn("Legacy news fetch failed, using mock data:", legacyErr?.message);
          const mockLimit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
          return res.json(generateMockNews(mockLimit));
        }
      } else if (err?.message?.includes("404")) {
        // Handle string message "404 page not found"
        try {
          payload = await fetchLegacyTopNews({ limit, category, symbols, search, language, key });
        } catch (legacyErr) {
          console.warn("Legacy news fetch failed, using mock data:", legacyErr?.message);
          const mockLimit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
          return res.json(generateMockNews(mockLimit));
        }
      } else {
        throw err;
      }
    }

    const normalized = extractNewsList(payload)
      .map(normalizeNewsItem)
      .filter(Boolean);

    res.json(normalized);
  } catch (err) {
    console.error("news error:", err?.details || err?.response?.data || err.message || err);
    // Fall back to mock data on error
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    return res.json(generateMockNews(limit));
  }
});

router.get("/reference", async (req, res) => {
  try {
    const key = process.env.MASSIVE_API_KEY;
    if (!key) return res.status(400).json({ error: "MASSIVE_API_KEY not set in server .env" });

    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
    const ticker = req.query.ticker || req.query.symbol || undefined;
    const order = req.query.order || "published_utc.desc";
    
    const params = {
      limit,
      order
    };
    if (ticker) {
      params.ticker = ticker;
      params.tickers = ticker;
    }

    let payload;
    try {
      payload = await massiveService.getReferenceNews(params);
    } catch (err) {
      if (err?.status && [400, 401, 403, 404].includes(err.status)) {
        // Try legacy endpoint
        const legacyParams = {
          limit,
          language: "en",
          ...params
        };
        payload = await fetchLegacyTopNews({ ...legacyParams, key });
      } else {
        throw err;
      }
    }

    const normalized = extractNewsList(payload)
      .map(normalizeNewsItem)
      .filter(Boolean);

    res.json({
      status: "success",
      results: normalized,
      count: normalized.length
    });
  } catch (err) {
    console.error("reference news error:", err?.details || err?.response?.data || err.message || err);
    return res.status(500).json({
      error: "Failed to fetch reference news",
      details: err?.details || err?.response?.data || err.message
    });
  }
});

export default router;
