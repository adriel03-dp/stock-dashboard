// News source logos using multiple sources with SVG fallbacks
export const newsSourceLogos = {
  "Bloomberg": [
    "https://logo.clearbit.com/bloomberg.com",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23FF6000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='70' font-weight='bold' fill='white' text-anchor='middle'%3EB%3C/text%3E%3C/svg%3E"
  ],
  "Reuters": [
    "https://logo.clearbit.com/reuters.com",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23FF6000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='45' font-weight='bold' fill='white' text-anchor='middle'%3ERUET%3C/text%3E%3C/svg%3E"
  ],
  "CNBC": [
    "https://logo.clearbit.com/cnbc.com",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23CC0000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3ECNBC%3C/text%3E%3C/svg%3E"
  ],
  "MarketWatch": [
    "https://logo.clearbit.com/marketwatch.com",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23003D7A' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='50' font-weight='bold' fill='white' text-anchor='middle'%3EMW%3C/text%3E%3C/svg%3E"
  ],
  "Seeking Alpha": [
    "https://logo.clearbit.com/seekingalpha.com",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234A90E2' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='55' font-weight='bold' fill='white' text-anchor='middle'%3ESA%3C/text%3E%3C/svg%3E"
  ],
  "Investor's Business Daily": [
    "https://logo.clearbit.com/investors.com",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23000000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3EIBD%3C/text%3E%3C/svg%3E"
  ]
};

export function getLogoUrls(sourceName) {
  return newsSourceLogos[sourceName] || [];
}
