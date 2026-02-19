import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "API Documentation | AlgoStudio",
  description:
    "Complete API reference for AlgoStudio: webhook setup, backtest uploads, marketplace integration, and live EA monitoring.",
  alternates: { canonical: "/docs" },
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[rgba(79,70,229,0.2)]">
      {title && (
        <div className="bg-[#0F172A] px-4 py-2 border-b border-[rgba(79,70,229,0.15)]">
          <span className="text-xs font-mono text-[#A78BFA]">{title}</span>
        </div>
      )}
      <pre className="bg-[#0F172A] px-4 py-3 overflow-x-auto text-sm leading-relaxed">
        <code className="text-[#CBD5E1] font-mono whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

function ErrorTable({ errors }: { errors: { code: number; description: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(79,70,229,0.2)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0F172A]">
            <th className="text-left px-4 py-2 text-[#A78BFA] font-medium">Code</th>
            <th className="text-left px-4 py-2 text-[#A78BFA] font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((e) => (
            <tr key={e.code} className="border-t border-[rgba(79,70,229,0.1)]">
              <td className="px-4 py-2 text-[#F87171] font-mono">{e.code}</td>
              <td className="px-4 py-2 text-[#CBD5E1]">{e.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-[rgba(34,211,238,0.15)] text-[#22D3EE]",
    POST: "bg-[rgba(16,185,129,0.15)] text-[#10B981]",
    DELETE: "bg-[rgba(239,68,68,0.15)] text-[#EF4444]",
  };
  return (
    <span
      className={`text-xs font-bold px-2 py-1 rounded ${colors[method] ?? "bg-[#1E293B] text-[#94A3B8]"}`}
    >
      {method}
    </span>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <span className="w-1.5 h-8 bg-[#4F46E5] rounded-full" />
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Endpoint({
  method,
  path,
  auth,
  description,
  children,
}: {
  method: string;
  path: string;
  auth: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <EndpointBadge method={method} />
        <code className="text-[#CBD5E1] font-mono text-sm">{path}</code>
      </div>
      <p className="text-[#94A3B8] text-sm">{description}</p>
      <div className="text-xs text-[#7C8DB0]">
        Auth: <span className="text-[#A78BFA]">{auth}</span>
      </div>
      {children}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0D0117]">
      <SiteNav />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">API Documentation</h1>
          <p className="text-lg text-[#94A3B8] mb-12">
            Integrate with AlgoStudio using our REST APIs. Set up webhooks for live EA tracking,
            upload backtest results, and interact with the template marketplace.
          </p>

          {/* Table of Contents */}
          <nav className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 mb-12">
            <h2 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
              Contents
            </h2>
            <ul className="space-y-2">
              {[
                { href: "#webhooks", label: "Webhook Setup" },
                { href: "#backtest", label: "Backtest API" },
                { href: "#marketplace", label: "Marketplace API" },
                { href: "#live", label: "Live EA API" },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-[#CBD5E1] hover:text-[#22D3EE] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-16">
            {/* Webhook Setup */}
            <Section id="webhooks" title="Webhook Setup">
              <p className="text-[#94A3B8] text-sm">
                Configure webhooks to receive real-time events from your live Expert Advisors. Set
                your webhook URL in Account Settings, and your EAs will send events automatically.
              </p>

              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Webhook URL Format</h3>
                <CodeBlock>{`POST https://your-server.com/webhook/algostudio`}</CodeBlock>
                <h3 className="text-lg font-semibold text-white">Authentication</h3>
                <p className="text-[#94A3B8] text-sm">
                  Each EA instance has a unique API key. Include it in the{" "}
                  <code className="text-[#22D3EE]">X-EA-Api-Key</code> header.
                </p>
                <CodeBlock title="Header">{`X-EA-Api-Key: ea_live_abc123def456`}</CodeBlock>
              </div>

              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Payload Formats</h3>

                <h4 className="text-sm font-semibold text-[#A78BFA]">Heartbeat Event</h4>
                <CodeBlock title="POST /api/telemetry/heartbeat">
                  {JSON.stringify(
                    {
                      balance: 10250.5,
                      equity: 10180.25,
                      openTrades: 2,
                      totalTrades: 47,
                      totalProfit: 250.5,
                      drawdown: 0.68,
                      spread: 12,
                    },
                    null,
                    2
                  )}
                </CodeBlock>

                <h4 className="text-sm font-semibold text-[#A78BFA]">Trade Event</h4>
                <CodeBlock title="POST /api/telemetry/trade">
                  {JSON.stringify(
                    {
                      ticket: "12345678",
                      symbol: "EURUSD",
                      type: "BUY",
                      openPrice: 1.0852,
                      closePrice: 1.0878,
                      lots: 0.1,
                      profit: 26.0,
                      openTime: "2026-01-15T10:30:00Z",
                      closeTime: "2026-01-15T14:45:00Z",
                    },
                    null,
                    2
                  )}
                </CodeBlock>

                <h4 className="text-sm font-semibold text-[#A78BFA]">Error Event</h4>
                <CodeBlock title="POST /api/telemetry/error">
                  {JSON.stringify(
                    {
                      errorCode: 4756,
                      message: "OrderSend failed: not enough money",
                      context: "OnTick",
                    },
                    null,
                    2
                  )}
                </CodeBlock>
              </div>

              <ErrorTable
                errors={[
                  { code: 401, description: "Missing or invalid API key" },
                  { code: 429, description: "Rate limit exceeded (20 requests/minute)" },
                  { code: 500, description: "Internal server error" },
                ]}
              />

              <CodeBlock title="curl example">
                {`curl -X POST https://algo-studio.com/api/telemetry/heartbeat \\
  -H "Content-Type: application/json" \\
  -H "X-EA-Api-Key: ea_live_abc123def456" \\
  -d '{"balance":10250.50,"equity":10180.25,"openTrades":2,"totalTrades":47,"totalProfit":250.50,"drawdown":0.68,"spread":12}'`}
              </CodeBlock>
            </Section>

            {/* Backtest API */}
            <Section id="backtest" title="Backtest API">
              <Endpoint
                method="POST"
                path="/api/backtest/upload"
                auth="Session cookie (logged in)"
                description="Upload a backtest result file for a specific project. Accepts MT5 Strategy Tester HTML reports."
              >
                <CodeBlock title="curl example">
                  {`curl -X POST https://algo-studio.com/api/backtest/upload \\
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \\
  -F "file=@backtest-report.htm" \\
  -F "projectId=clx1abc123"`}
                </CodeBlock>
                <CodeBlock title="Response (200)">
                  {JSON.stringify(
                    {
                      id: "clx2def456",
                      projectId: "clx1abc123",
                      fileName: "backtest-report.htm",
                      results: {
                        totalTrades: 342,
                        winRate: 58.2,
                        profitFactor: 1.85,
                        maxDrawdown: 12.4,
                        netProfit: 4250.0,
                      },
                      createdAt: "2026-01-20T08:00:00Z",
                    },
                    null,
                    2
                  )}
                </CodeBlock>
                <ErrorTable
                  errors={[
                    { code: 400, description: "Missing file or projectId" },
                    { code: 401, description: "Not authenticated" },
                    { code: 404, description: "Project not found" },
                    { code: 413, description: "File too large (max 5MB)" },
                  ]}
                />
              </Endpoint>

              <Endpoint
                method="GET"
                path="/api/backtest?projectId=clx1abc123"
                auth="Session cookie (logged in)"
                description="Retrieve backtest results for a project."
              >
                <CodeBlock title="Response (200)">
                  {JSON.stringify(
                    {
                      data: [
                        {
                          id: "clx2def456",
                          fileName: "backtest-report.htm",
                          results: {
                            totalTrades: 342,
                            winRate: 58.2,
                            profitFactor: 1.85,
                          },
                          createdAt: "2026-01-20T08:00:00Z",
                        },
                      ],
                    },
                    null,
                    2
                  )}
                </CodeBlock>
                <ErrorTable
                  errors={[
                    { code: 401, description: "Not authenticated" },
                    { code: 404, description: "Project not found" },
                  ]}
                />
              </Endpoint>
            </Section>

            {/* Marketplace API */}
            <Section id="marketplace" title="Marketplace API">
              <Endpoint
                method="GET"
                path="/api/marketplace/search?q=ema&category=trend-following&sort=popular&page=1&limit=20"
                auth="None (public)"
                description="Search public strategy templates. Supports filtering by query, category, and tag."
              >
                <CodeBlock title="Response (200)">
                  {JSON.stringify(
                    {
                      data: [
                        {
                          id: "tmpl_abc123",
                          name: "EMA Crossover Pro",
                          description: "Trend-following with dual EMA filters",
                          authorEmail: "joh***@gmail.com",
                          downloads: 142,
                          avgRating: 4.5,
                          ratingCount: 12,
                          category: "trend-following",
                          tags: ["ema", "trend"],
                          createdAt: "2026-01-10T12:00:00Z",
                        },
                      ],
                      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
                    },
                    null,
                    2
                  )}
                </CodeBlock>
                <ErrorTable errors={[{ code: 500, description: "Internal server error" }]} />
              </Endpoint>

              <Endpoint
                method="POST"
                path="/api/marketplace/publish"
                auth="Session cookie (logged in)"
                description="Publish a project as a public marketplace template."
              >
                <CodeBlock title="Request body">
                  {JSON.stringify(
                    {
                      projectId: "clx1abc123",
                      name: "My EMA Strategy",
                      description: "A simple EMA crossover strategy",
                      category: "trend-following",
                      tags: ["ema", "simple"],
                    },
                    null,
                    2
                  )}
                </CodeBlock>
                <ErrorTable
                  errors={[
                    { code: 400, description: "Validation failed" },
                    { code: 401, description: "Not authenticated" },
                    { code: 404, description: "Project not found" },
                  ]}
                />
              </Endpoint>

              <Endpoint
                method="POST"
                path="/api/marketplace/rate"
                auth="Session cookie (logged in)"
                description="Rate a marketplace template (1-5 stars). Updates existing rating if already rated."
              >
                <CodeBlock title="Request body">
                  {JSON.stringify(
                    {
                      templateId: "tmpl_abc123",
                      rating: 5,
                      review: "Excellent strategy, works great on EURUSD",
                    },
                    null,
                    2
                  )}
                </CodeBlock>
                <ErrorTable
                  errors={[
                    { code: 400, description: "Invalid rating (must be 1-5)" },
                    { code: 401, description: "Not authenticated" },
                    { code: 404, description: "Template not found" },
                  ]}
                />
              </Endpoint>
            </Section>

            {/* Live EA API */}
            <Section id="live" title="Live EA API">
              <Endpoint
                method="GET"
                path="/api/live/status"
                auth="Session cookie (logged in)"
                description="Get the status of all your live EA instances, including trade history and equity heartbeats."
              >
                <CodeBlock title="Response (200)">
                  {JSON.stringify(
                    {
                      data: [
                        {
                          id: "ea_inst_001",
                          eaName: "EMA Cross v3",
                          symbol: "EURUSD",
                          timeframe: "H1",
                          broker: "IC Markets",
                          status: "ONLINE",
                          lastHeartbeat: "2026-01-20T14:30:00Z",
                          balance: 10500.25,
                          equity: 10480.0,
                          openTrades: 1,
                          totalTrades: 89,
                          totalProfit: 500.25,
                          trades: [{ profit: 32.5, closeTime: "2026-01-20T12:15:00Z" }],
                          heartbeats: [{ equity: 10480.0, createdAt: "2026-01-20T14:30:00Z" }],
                        },
                      ],
                    },
                    null,
                    2
                  )}
                </CodeBlock>
                <ErrorTable
                  errors={[
                    { code: 401, description: "Not authenticated" },
                    { code: 500, description: "Internal server error" },
                  ]}
                />
                <CodeBlock title="curl example">
                  {`curl https://algo-studio.com/api/live/status \\
  -H "Cookie: next-auth.session-token=YOUR_SESSION"`}
                </CodeBlock>
              </Endpoint>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
