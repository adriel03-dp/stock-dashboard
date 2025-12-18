# 📈 Advanced Stock Market Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.0-green.svg)](https://www.mongodb.com/)

A sophisticated, enterprise-grade stock market dashboard featuring real-time data streaming, multi-API aggregation, portfolio management, and advanced analytics. Built with modern web technologies and designed for scalability and performance.

## 🌟 Key Features

### Real-Time Market Data
- **Live WebSocket Streaming**: Real-time stock price updates using WebSocket connections with intelligent reconnection logic
- **Multi-Feed Support**: Realtime, delayed, and business data feeds with automatic failover
- **Server-Sent Events (SSE)**: Efficient push notifications for market updates
- **Intelligent Buffering**: Message queue management for reliable data delivery

### Advanced Portfolio Management
- **Multi-Portfolio Support**: Create and manage multiple investment portfolios
- **Live Price Enrichment**: Automatic fetching of current prices for holdings
- **Gain/Loss Tracking**: Real-time profit/loss calculations with visual indicators
- **Average Price Calculation**: Smart averaging for multiple purchases of the same stock

### Comprehensive Watchlist System
- **Personal Watchlists**: Track favorite stocks with custom organization
- **Real-Time Updates**: Automatic price refreshes for watched securities
- **Quick Actions**: Fast add/remove functionality with instant feedback

### Multi-Source News Aggregation
- **4+ News APIs Integrated**: Finnhub, Massive API, Polygon, and more
- **Intelligent Fallback System**: Automatic switching between news sources for reliability
- **Smart Categorization**: ML-based news categorization (technology, energy, economy, crypto, markets)
- **Source Attribution**: Logo detection and proper attribution for news sources
- **Deduplication Algorithm**: Advanced URL and content-based duplicate removal
- **Real-Time Streaming**: Live news updates via WebSocket connections

### Advanced Market Analytics
- **Technical Indicators**: EMA (50/200), RSI, MACD with historical data
- **Multiple Timeframes**: 1D, 5D, 1M, 3M, 6M, 1Y, 5Y, MAX chart ranges
- **Interactive Charts**: Recharts-powered visualizations with zoom and pan
- **Market Heatmaps**: Visual sector and stock performance analysis
- **Sector Analysis**: Industry-specific performance tracking

### Cryptocurrency Integration
- **Dual API Support**: CoinGecko and Binance for comprehensive crypto coverage
- **Top Coins Tracking**: Real-time data for major cryptocurrencies
- **Price Conversion**: Automatic USDT pair handling for crypto assets
- **Market Cap Data**: Volume and market capitalization tracking

## 🏗️ Technical Architecture

### Frontend Stack
```
React 18.2          → Modern UI with Hooks and Context API
React Router 6      → Client-side routing with protected routes
Framer Motion       → Smooth animations and transitions
Recharts 2.5        → Interactive financial charts
Lucide React        → Beautiful icon library
Axios               → HTTP client with interceptors
Tailwind CSS 3.4    → Utility-first styling
Vite 7.2            → Lightning-fast build tool
```

### Backend Stack
```
Node.js 18+         → Server runtime
Express 5.1         → Web framework with middleware
MongoDB 9.0         → NoSQL database
Mongoose            → ODM with schema validation
WebSocket (ws 8.18) → Real-time bidirectional communication
JWT                 → Stateless authentication
bcryptjs            → Secure password hashing
```

## 🔌 API Integrations

### 1. Massive API (Primary)
**Purpose**: Comprehensive stock market data
- Stock quotes and real-time prices
- Historical price aggregates (OHLCV)
- Technical indicators (EMA, SMA, RSI, MACD)
- Company information and fundamentals
- Market snapshots and grouped aggregates
- Ticker events and corporate actions
- Dividend history
- Related companies
- **Advanced Features**:
  - Multi-version endpoint fallback (v2/v3)
  - Intelligent retry with authentication rotation
  - Bearer and API key dual authentication
  - URL prefix auto-detection

### 2. Finnhub API
**Purpose**: Real-time news and market data
- Live market news with real-time updates
- Company-specific news articles
- News streaming via WebSocket
- Market sentiment data
- **Features**:
  - Primary news source with highest priority
  - Automatic reconnection on disconnect
  - Rate limit handling
  - News categorization

### 3. Financial Modeling Prep (FMP)
**Purpose**: Stock screening and fundamental data
- Stock screener with advanced filters
- Historical price data (1-day intervals)
- Batch data fetching with pagination
- Market cap, sector, industry filters
- **Advanced Capabilities**:
  - Parallel batch processing
  - Smart offset management
  - Result caching and normalization

### 4. CoinGecko API
**Purpose**: Cryptocurrency market data
- Top cryptocurrencies by market cap
- 7-day price sparklines
- Market data (price, volume, market cap)
- Crypto search and discovery
- **Features**:
  - Automatic ID-to-symbol resolution
  - Fuzzy search capabilities

### 5. Binance API
**Purpose**: Alternative crypto data source
- 24-hour ticker statistics
- Volume and price change data
- Top trading pairs
- USDT pair conversions
- **Reliability Features**:
  - Fallback for CoinGecko
  - High-frequency data updates

## 🧮 Complex Algorithms & Techniques

### 1. Multi-Source Data Aggregation
```javascript
Algorithm: Intelligent News Aggregation
- Priority: Finnhub → Polygon → Massive → Mock
- Deduplication by URL and title similarity
- Chronological sorting with timestamp normalization
- Smart category inference from content
- Logo matching with fallback generation
```

### 2. Price Data Normalization
```javascript
Algorithm: Universal Quote Normalization
Input: Multiple API formats (FMP, Massive, Finnhub)
Process:
  1. Extract price fields (price/c/last/close)
  2. Calculate change (current - previousClose)
  3. Compute percentage ((change / previousClose) * 100)
  4. Normalize timestamp formats (Unix/ISO/string)
  5. Standardize currency codes
Output: Unified quote object
```

### 3. WebSocket Connection Management
```javascript
Algorithm: Resilient WebSocket Hub
Features:
  - Exponential backoff (1s → 15s max)
  - Automatic endpoint rotation
  - Client reference counting
  - Symbol-based subscription management
  - Message buffering during reconnection
  - Graceful degradation
  - Keep-alive heartbeat (25s intervals)
```

### 4. Portfolio Value Calculation
```javascript
Algorithm: Real-Time Portfolio Analytics
For each holding:
  1. Fetch current price from live API
  2. Calculate current value = price × quantity
  3. Compute gain/loss = currentValue - (avgPrice × quantity)
  4. Calculate percentage = (gainLoss / investment) × 100
  5. Aggregate portfolio totals
  6. Apply currency conversions if needed
```

### 5. Historical Data Window Calculation
```javascript
Algorithm: Smart Time Range Selection
Ranges: 1D (5min), 5D (30min), 1M-6M (daily), 1Y-5Y (weekly), MAX (monthly)
Process:
  1. Calculate lookback period (hours/days)
  2. Convert to Unix timestamps
  3. Select optimal timespan and multiplier
  4. Fetch aggregates with pagination
  5. Normalize and sort by timestamp
  6. Derive 52-week high/low from 1Y data
```

### 6. Intelligent API Fallback
```javascript
Algorithm: Multi-Tier Fallback System
Primary → Secondary → Tertiary → Mock
- Async parallel requests with Promise.allSettled()
- Selective fallback based on error type (404, 401, timeout)
- Response validation and quality scoring
- Automatic source priority adjustment
- Circuit breaker pattern for failing services
```

## 🔒 Security & Validation

### Authentication
- **JWT-based**: Stateless token authentication with 7-day expiration
- **Password Hashing**: bcrypt with salt rounds (10)
- **Token Refresh**: Automatic token renewal before expiration
- **Protected Routes**: Middleware-based route protection

### Input Validation

#### User Registration
```javascript
✓ Email format validation (regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
✓ Password minimum length (6 characters)
✓ Username uniqueness check
✓ Password confirmation match
✓ Duplicate email detection
```

#### Stock Symbol Validation
```javascript
✓ Format normalization (uppercase, trim)
✓ Special character filtering
✓ Length constraints (1-5 characters)
✓ Exchange-specific validation
```

#### Portfolio Operations
```javascript
✓ Quantity validation (positive numbers)
✓ Price validation (non-negative decimals)
✓ Symbol existence verification
✓ User ownership validation
✓ Duplicate holding detection
```

#### API Input Sanitization
```javascript
✓ SQL injection prevention (Mongoose query builder)
✓ XSS protection (input escaping)
✓ Parameter type validation
✓ Range limiting (pagination bounds)
✓ Request rate limiting
```

### Mongoose Schema Validation
```javascript
✓ Required field enforcement
✓ Type checking (String, Number, Date, Array)
✓ Unique constraints (email, username)
✓ Min/max length validation
✓ Custom validators for complex rules
✓ Index optimization
```

### Error Handling
- Comprehensive try-catch blocks
- Detailed error logging
- User-friendly error messages
- Stack trace sanitization in production
- Graceful fallback mechanisms

## 🎨 Advanced UI Features

### Aurora Background Animation
- Dynamic gradient animations using CSS transforms
- Hardware-accelerated performance
- Customizable color schemes
- Responsive to theme changes

### Real-Time Price Updates
- Color-coded change indicators (green/red)
- Smooth number transitions
- Percentage and absolute change display
- Volume formatting with abbreviations (K, M, B)

### Skeleton Loaders
- Content-aware loading states
- Shimmer animation effects
- Maintains layout stability
- Improves perceived performance

### Dark Mode Support
- System preference detection
- Manual toggle with persistence
- Smooth theme transitions
- Optimized color contrast ratios

### Responsive Design
- Mobile-first approach
- Breakpoint optimization (sm, md, lg, xl, 2xl)
- Touch-friendly interactions
- Adaptive chart sizing

## 📊 Data Visualization

### Interactive Charts (Recharts)
- Line charts for price history
- Area charts with gradients
- Candlestick charts (OHLC data)
- Volume bar charts
- Customizable timeframes
- Zoom and pan capabilities
- Tooltip with detailed information
- Responsive aspect ratios

### Market Heatmap
- Color-coded performance visualization
- Sector-based grouping
- Market cap weighting
- Interactive hover states

### Trend Indicators
- Gainers/Losers/Active tabs
- Real-time percentage changes
- Volume leaders
- Sector performance

## 🚀 Performance Optimizations

### Backend
- **Connection Pooling**: MongoDB connection reuse
- **Lazy Loading**: WebSocket connections on-demand
- **Caching Strategy**: In-memory caching for frequent queries
- **Batch Processing**: Parallel API calls with Promise.all()
- **Stream Processing**: Efficient handling of large datasets
- **Index Optimization**: MongoDB indexes on frequently queried fields

### Frontend
- **Code Splitting**: Route-based lazy loading
- **Memoization**: React.memo and useMemo hooks
- **Virtual Scrolling**: Efficient rendering of large lists
- **Debouncing**: Search input optimization
- **Image Optimization**: Lazy loading and responsive images
- **Bundle Size**: Tree shaking and minification

### Network
- **HTTP/2**: Multiplexed connections
- **Compression**: Gzip/Brotli response compression
- **CDN Integration**: Static asset delivery
- **API Response Caching**: Client-side cache with expiration
- **Request Deduplication**: Prevent duplicate API calls

## 📁 Project Structure

```
stock-dashboard/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── EnhancedNavbar.jsx
│   │   │   ├── LiveStockCard.jsx
│   │   │   ├── Portfolio.jsx
│   │   │   ├── Watchlist.jsx
│   │   │   ├── NewsList.jsx
│   │   │   ├── StocksTable.jsx
│   │   │   ├── Heatmap.jsx
│   │   │   ├── TrendingTabs.jsx
│   │   │   ├── Aurora.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── pages/            # Route pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Stocks.jsx
│   │   │   ├── StockPage.jsx
│   │   │   ├── WatchlistPage.jsx
│   │   │   ├── PortfolioPage.jsx
│   │   │   ├── NewsPage.jsx
│   │   │   ├── SectorsPage.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── contexts/         # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   │   └── api.js
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Node.js backend
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── stockController.js
│   │   └── portfolioController.js
│   ├── models/               # Mongoose schemas
│   │   ├── User.js
│   │   ├── Portfolio.js
│   │   ├── Watchlist.js
│   │   └── Stock.js
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── stocks.js
│   │   ├── portfolio.js
│   │   ├── watchlist.js
│   │   ├── news.js
│   │   ├── market.js
│   │   └── live.js
│   ├── services/             # Business logic
│   │   ├── massiveService.js
│   │   ├── fmpService.js
│   │   ├── finnhubNewsService.js
│   │   ├── newsAggregatorService.js
│   │   ├── newsStreamingService.js
│   │   ├── binanceService.js
│   │   ├── coinGeckoService.js
│   │   ├── newsLogoService.js
│   │   ├── fetchStockPrice.js
│   │   └── mockData.js
│   ├── realtime/             # WebSocket handlers
│   │   └── stockStreamHub.js
│   ├── middleware/           # Express middleware
│   │   └── auth.js
│   ├── utils/                # Helper functions
│   │   └── stockData.js
│   ├── index.js              # Server entry point
│   └── package.json
│
└── README.md                  # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB 4.4+ (local or Atlas)
- API keys for external services (optional but recommended)

### 1. Clone Repository
```bash
git clone https://github.com/adriel03-dp/stock-dashboard.git
cd stock-dashboard
```

### 2. Install Dependencies

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd client
npm install
```

### 3. Environment Configuration

Create `.env` file in the `server` directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/stock-dashboard
# or MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stock-dashboard

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Primary Stock API (Required for full functionality)


# WebSocket Endpoints (Optional - will use defaults if not provided)

# News APIs


# Additional Stock APIs (Optional)


# Server Configuration
PORT=5000

### 4. Run the Application

#### Development Mode

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend**:
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

#### Production Mode

**Build Frontend**:
```bash
cd client
npm run build
```

**Serve Production**:
```bash
cd server
NODE_ENV=production node index.js
```

### 6. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Status: http://localhost:5000/

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepass123",
  "confirmPassword": "securepass123"
}

Response: { token, user: { id, email, username } }
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}

Response: { token, user: { id, email, username } }
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>

Response: { user: { id, email, username } }
```

### Stock Endpoints

#### List Stocks
```http
GET /api/stocks?limit=100&cursor=<cursor>&search=AAPL&sector=Technology

Response: {
  items: [...],
  nextCursor: "string",
  requestId: "string"
}
```

#### Get Stock Details
```http
GET /api/stocks/:symbol

Response: {
  summary: { symbol, name, price, change, changePercent, ... },
  metrics: { open, high, low, volume, marketCap, peRatio, ... },
  profile: { description, sector, industry, ceo, employees, ... },
  indicators: { ema50, ema200, rsi, macd },
  history: { "1D": [...], "5D": [...], "1M": [...], ... },
  dividends: [...],
  related: [...],
  events: [...]
}
```

#### Real-Time Stock Stream
```http
GET /api/live/stocks?symbols=AAPL,GOOGL,MSFT&feed=realtime
Accept: text/event-stream

Response: Server-Sent Events stream
data: {"type":"tick","symbol":"AAPL","data":{...}}
```

### Portfolio Endpoints

#### Get Portfolios
```http
GET /api/portfolio
Authorization: Bearer <token>

Response: [{ _id, userId, name, description, holdings, createdAt }]
```

#### Create Portfolio
```http
POST /api/portfolio
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Tech Portfolio",
  "description": "Technology stocks"
}
```

#### Add Holding
```http
POST /api/portfolio/:id/holdings
Authorization: Bearer <token>

{
  "symbol": "AAPL",
  "quantity": 10,
  "avgPrice": 150.25
}
```

### Watchlist Endpoints

#### Get Watchlist
```http
GET /api/watchlist
Authorization: Bearer <token>

Response: { _id, userId, items: [{ symbol, addedAt }] }
```

#### Add to Watchlist
```http
POST /api/watchlist
Authorization: Bearer <token>

{
  "symbol": "TSLA"
}
```

### News Endpoints

#### Get Aggregated News
```http
GET /api/news?limit=50&category=technology&search=apple

Response: [
  {
    id, title, description, url, image,
    source, sourceLogo, publishedAt,
    tickers, category
  }
]
```

#### News Stream (SSE)
```http
GET /api/news/stream
Accept: text/event-stream

Response: Real-time news updates
```

### Market Endpoints

#### Market Status
```http
GET /api/market/status

Response: {
  market: "extended-hours",
  serverTime: "2024-01-15T14:30:00.000Z",
  exchanges: {...}
}
```

#### Trending Stocks
```http
GET /api/market/trending?direction=gainers&limit=20

Response: {
  tickers: [{ symbol, name, price, change, changePercent, volume }]
}
```

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
- Unit tests for services and utilities
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical user flows

## 🚢 Deployment

### Docker Deployment
```bash
# Build images
docker-compose build

# Run containers
docker-compose up -d

# View logs
docker-compose logs -f
```

### Heroku Deployment
```bash
# Login to Heroku
heroku login

# Create app
heroku create stock-dashboard-app

# Add MongoDB
heroku addons:create mongodb:sandbox

# Set environment variables
heroku config:set MASSIVE_API_KEY=your_key
heroku config:set JWT_SECRET=your_secret

# Deploy
git push heroku main
```

### Vercel Deployment (Frontend)
```bash
cd client
vercel --prod
```

## 🔧 Configuration

### Timeframe Configurations
```javascript
RANGE_CONFIG = {
  "1D":  { multiplier: 5,   timespan: "minute", lookbackHours: 24 },
  "5D":  { multiplier: 30,  timespan: "minute", lookbackHours: 120 },
  "1M":  { multiplier: 1,   timespan: "day",    lookbackDays: 30 },
  "3M":  { multiplier: 1,   timespan: "day",    lookbackDays: 90 },
  "6M":  { multiplier: 1,   timespan: "day",    lookbackDays: 180 },
  "1Y":  { multiplier: 1,   timespan: "day",    lookbackDays: 365 },
  "5Y":  { multiplier: 1,   timespan: "week",   lookbackDays: 1825 },
  "MAX": { multiplier: 1,   timespan: "month",  lookbackDays: 7300 }
}
```

### WebSocket Reconnection Settings
```javascript
RECONNECT_CONFIG = {
  initialDelay: 1000,      // 1 second
  maxDelay: 15000,         // 15 seconds
  backoffMultiplier: 2,    // Exponential backoff
  keepAliveInterval: 25000 // 25 seconds
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- ESLint configuration included
- Prettier for formatting
- Follow existing patterns
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Adriel Perera**
- GitHub: [@adriel03-dp](https://github.com/adriel03-dp)

## 🙏 Acknowledgments

- [Massive API](https://massive.com) for comprehensive stock market data
- [Finnhub](https://finnhub.io) for real-time financial news
- [CoinGecko](https://coingecko.com) for cryptocurrency data
- [Binance](https://binance.com) for crypto market data
- [Financial Modeling Prep](https://financialmodelingprep.com) for financial data
- React team for the amazing framework
- All open-source contributors

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: [GitHub Issues](https://github.com/adriel03-dp/stock-dashboard/issues)

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] AI-powered stock predictions
- [ ] Advanced charting with TradingView
- [ ] Social trading features
- [ ] Options trading support
- [ ] Automated trading strategies
- [ ] Multi-language support
- [ ] Custom alerts and notifications
- [ ] Performance analytics
- [ ] Tax reporting tools

---

**Note**: This project is for educational purposes. Always consult with a financial advisor before making investment decisions.

⭐ Star this repo if you find it helpful!
