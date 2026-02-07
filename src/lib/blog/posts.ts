export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  readTime: string;
  tags: string[];
  content: string; // HTML content
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "getting-started-with-algostudio",
    title: "Getting Started with AlgoStudio: Build Your First EA in 5 Minutes",
    description: "Learn how to create your first Expert Advisor using the visual strategy builder. No coding required.",
    date: "2025-03-15",
    author: "AlgoStudio Team",
    readTime: "4 min read",
    tags: ["tutorial", "beginner"],
    content: `
      <p>Building automated trading strategies has traditionally required deep programming knowledge. AlgoStudio changes that by giving you a visual drag-and-drop builder for MetaTrader 5 Expert Advisors.</p>

      <h2>Step 1: Create a Project</h2>
      <p>After signing up, click <strong>"New Project"</strong> on your dashboard. Give it a descriptive name like "MA Crossover Strategy".</p>

      <h2>Step 2: Add Timing</h2>
      <p>Every strategy starts with a <strong>Timing block</strong>. This controls when your EA is active. Drag an "Always" block from the left toolbar to run the EA at all times, or use "Trading Sessions" to limit it to specific market hours.</p>

      <h2>Step 3: Add Indicators</h2>
      <p>Connect indicator blocks to define your entry conditions. For a simple moving average crossover, add two <strong>Moving Average</strong> blocks — one fast (period 10) and one slow (period 50). Connect them to the timing block.</p>

      <h2>Step 4: Add Trade Actions</h2>
      <p>Add a <strong>Place Buy</strong> and <strong>Place Sell</strong> block, then connect Stop Loss and Take Profit blocks for risk management.</p>

      <h2>Step 5: Export</h2>
      <p>Click the green <strong>Export MQL5</strong> button. Download the .mq5 file, place it in your MetaTrader 5 Experts folder, compile in MetaEditor with F7, and you're ready to backtest.</p>

      <p>That's it — your first EA is live in under 5 minutes. No coding needed.</p>
    `,
  },
  {
    slug: "best-indicators-for-forex-ea",
    title: "The 5 Best Indicators for Forex Expert Advisors",
    description: "Discover which technical indicators work best in automated forex trading strategies and how to combine them effectively.",
    date: "2025-03-10",
    author: "AlgoStudio Team",
    readTime: "6 min read",
    tags: ["strategy", "indicators"],
    content: `
      <p>Choosing the right indicators is crucial for building profitable Expert Advisors. Here are the five most effective indicators for forex EA development, all available in AlgoStudio.</p>

      <h2>1. Moving Averages (SMA/EMA)</h2>
      <p>The foundation of trend-following strategies. Use a fast and slow MA crossover to identify trend direction. EMA responds faster to price changes, while SMA provides smoother signals.</p>
      <p><strong>Best for:</strong> Trend-following strategies on H1 and H4 timeframes.</p>

      <h2>2. RSI (Relative Strength Index)</h2>
      <p>A momentum oscillator that identifies overbought (above 70) and oversold (below 30) conditions. Works great for mean-reversion strategies and as a filter for trend-following systems.</p>
      <p><strong>Best for:</strong> Reversal strategies and as an entry filter.</p>

      <h2>3. Stochastic Oscillator</h2>
      <p>Similar to RSI but uses %K and %D lines for crossover signals. Particularly effective in ranging markets. Look for %K crossing above %D below 20 for buy signals.</p>
      <p><strong>Best for:</strong> Range-bound markets and scalping strategies.</p>

      <h2>4. Bollinger Bands</h2>
      <p>Dynamic support and resistance based on volatility. Price touching the lower band may signal a buy opportunity; touching the upper band may signal a sell. Band width indicates volatility.</p>
      <p><strong>Best for:</strong> Volatility-based strategies and breakout detection.</p>

      <h2>5. ADX (Average Directional Index)</h2>
      <p>Measures trend strength regardless of direction. ADX above 25 indicates a strong trend. Combine with +DI/-DI for direction. Use it to filter out choppy markets.</p>
      <p><strong>Best for:</strong> Trend strength filtering — avoid false signals in sideways markets.</p>

      <h2>Combining Indicators</h2>
      <p>The most effective EAs combine 2-3 indicators. A classic setup: use ADX to confirm trend strength, MA crossover for direction, and RSI to avoid overbought/oversold entries.</p>
    `,
  },
  {
    slug: "backtest-your-ea-metatrader5",
    title: "How to Backtest Your EA in MetaTrader 5: Complete Guide",
    description: "Step-by-step guide to backtesting your Expert Advisor in MetaTrader 5's Strategy Tester for reliable results.",
    date: "2025-03-05",
    author: "AlgoStudio Team",
    readTime: "5 min read",
    tags: ["tutorial", "backtesting"],
    content: `
      <p>Before trading with real money, you need to backtest your EA thoroughly. MetaTrader 5's Strategy Tester is a powerful tool for this. Here's how to use it effectively.</p>

      <h2>Setting Up the Strategy Tester</h2>
      <p>Open MetaTrader 5 and go to <strong>View &gt; Strategy Tester</strong> (or press Ctrl+R). Select your EA from the dropdown, choose the symbol (e.g., EURUSD), and set the timeframe to match your strategy.</p>

      <h2>Choosing the Right Settings</h2>
      <ul>
        <li><strong>Model:</strong> Use "Every tick based on real ticks" for the most accurate results</li>
        <li><strong>Period:</strong> Test at least 1-2 years of data</li>
        <li><strong>Deposit:</strong> Set a realistic starting balance</li>
        <li><strong>Leverage:</strong> Match your broker's leverage</li>
      </ul>

      <h2>Understanding Results</h2>
      <p>Key metrics to evaluate:</p>
      <ul>
        <li><strong>Profit Factor:</strong> Above 1.5 is good, above 2.0 is excellent</li>
        <li><strong>Max Drawdown:</strong> Keep below 20-30% for comfortable trading</li>
        <li><strong>Win Rate:</strong> Context-dependent — a 40% win rate with high R:R can be very profitable</li>
        <li><strong>Total Trades:</strong> Ensure enough trades for statistical significance (100+)</li>
      </ul>

      <h2>Optimization</h2>
      <p>Use the Strategy Tester's optimization mode to find optimal indicator parameters. AlgoStudio marks optimizable fields in the generated code, making MT5 optimization straightforward.</p>

      <p><strong>Important:</strong> Avoid over-optimization (curve fitting). Always validate results on out-of-sample data — test on a different time period than you optimized on.</p>
    `,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
