/**
 * Local SEO Crawler
 *
 * Fetches sitemap.xml, crawls every URL, parses the HTML and flags common
 * technical SEO issues. Writes a JSON report to audit/seo-crawl-{stamp}.json
 * plus a console summary.
 *
 * No external API, no cost. Uses node-html-parser which is already a dep.
 *
 * How to run:
 *   npx tsx scripts/seo-crawl.ts                          # default: https://algo-studio.com
 *   npx tsx scripts/seo-crawl.ts https://algo-studio.com  # explicit
 *   CONCURRENCY=8 npx tsx scripts/seo-crawl.ts            # tune parallelism
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "node-html-parser";

// ── Config ──────────────────────────────────────────────────

const BASE_URL = (process.argv[2] || "https://algo-studio.com").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const USER_AGENT = "AlgoStudioSeoAudit/1.0 (+local audit)";
const TIMEOUT_MS = 15_000;

// Path prefixes that should NOT be crawled (private app, APIs, etc.)
const EXCLUDE_PATTERNS = [/^\/app(\/|$)/, /^\/api(\/|$)/, /^\/embed(\/|$)/];

// ── Types ───────────────────────────────────────────────────

interface PageReport {
  url: string;
  status: number;
  redirectTo?: string;
  loadTimeMs: number;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1Count: number;
  h1Texts: string[];
  canonical: string | null;
  canonicalMismatch: boolean;
  robotsNoindex: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  jsonLdCount: number;
  internalLinks: number;
  externalLinks: number;
  imagesMissingAlt: number;
  totalImages: number;
  issues: string[];
}

// ── Helpers ─────────────────────────────────────────────────

function isExcluded(path: string): boolean {
  return EXCLUDE_PATTERNS.some((re) => re.test(path));
}

async function fetchWithTimeout(url: string): Promise<{ res: Response; ms: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: ctrl.signal,
      redirect: "manual",
    });
    return { res, ms: Date.now() - started };
  } finally {
    clearTimeout(t);
  }
}

async function fetchSitemap(base: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapUrl = `${base}/sitemap.xml`;
  const res = await fetch(sitemapUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.warn(`⚠ sitemap.xml returned ${res.status}, falling back to homepage only`);
    return [base];
  }
  const xml = await res.text();
  // Extract <loc> values; handle both urlset and sitemapindex
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

  // If this is a sitemap index, recurse into each child sitemap
  if (xml.includes("<sitemapindex")) {
    for (const child of locs) {
      try {
        const childRes = await fetch(child, { headers: { "User-Agent": USER_AGENT } });
        if (!childRes.ok) continue;
        const childXml = await childRes.text();
        const childLocs = [...childXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
        urls.push(...childLocs);
      } catch {
        // skip
      }
    }
  } else {
    urls.push(...locs);
  }

  // Filter: same origin + not excluded
  const origin = new URL(base).origin;
  return urls.filter((u) => {
    try {
      const parsed = new URL(u);
      if (parsed.origin !== origin) return false;
      return !isExcluded(parsed.pathname);
    } catch {
      return false;
    }
  });
}

async function analyze(url: string): Promise<PageReport> {
  const report: PageReport = {
    url,
    status: 0,
    loadTimeMs: 0,
    title: null,
    titleLength: 0,
    description: null,
    descriptionLength: 0,
    h1Count: 0,
    h1Texts: [],
    canonical: null,
    canonicalMismatch: false,
    robotsNoindex: false,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    jsonLdCount: 0,
    internalLinks: 0,
    externalLinks: 0,
    imagesMissingAlt: 0,
    totalImages: 0,
    issues: [],
  };

  try {
    const { res, ms } = await fetchWithTimeout(url);
    report.status = res.status;
    report.loadTimeMs = ms;

    if (res.status >= 300 && res.status < 400) {
      report.redirectTo = res.headers.get("location") ?? undefined;
      report.issues.push(`redirect (${res.status}) → ${report.redirectTo ?? "unknown"}`);
      return report;
    }

    if (res.status >= 400) {
      report.issues.push(`HTTP ${res.status}`);
      return report;
    }

    if (ms > 3000) report.issues.push(`slow response ${ms}ms`);

    const html = await res.text();
    const root = parse(html);

    // Title
    const titleEl = root.querySelector("title");
    report.title = titleEl?.text?.trim() || null;
    report.titleLength = report.title?.length ?? 0;
    if (!report.title) report.issues.push("missing <title>");
    else if (report.titleLength > 60)
      report.issues.push(`title too long (${report.titleLength} chars)`);
    else if (report.titleLength < 20)
      report.issues.push(`title too short (${report.titleLength} chars)`);

    // Meta description
    const descEl = root.querySelector('meta[name="description"]');
    report.description = descEl?.getAttribute("content")?.trim() || null;
    report.descriptionLength = report.description?.length ?? 0;
    if (!report.description) report.issues.push("missing meta description");
    else if (report.descriptionLength > 160)
      report.issues.push(`description too long (${report.descriptionLength} chars)`);
    else if (report.descriptionLength < 70)
      report.issues.push(`description too short (${report.descriptionLength} chars)`);

    // H1
    const h1s = root.querySelectorAll("h1");
    report.h1Count = h1s.length;
    report.h1Texts = h1s.map((h) => h.text.trim()).filter(Boolean);
    if (report.h1Count === 0) report.issues.push("missing <h1>");
    else if (report.h1Count > 1) report.issues.push(`multiple <h1> (${report.h1Count})`);

    // Canonical
    const canonEl = root.querySelector('link[rel="canonical"]');
    report.canonical = canonEl?.getAttribute("href")?.trim() || null;
    if (!report.canonical) {
      report.issues.push("missing canonical");
    } else {
      try {
        const canonUrl = new URL(report.canonical, url);
        if (canonUrl.href !== url) {
          report.canonicalMismatch = true;
          // Only flag as issue if it points to a different pathname (cross-page canonical)
          if (canonUrl.pathname !== new URL(url).pathname) {
            report.issues.push(`canonical points elsewhere: ${canonUrl.href}`);
          }
        }
      } catch {
        report.issues.push("invalid canonical URL");
      }
    }

    // Robots
    const robotsEl = root.querySelector('meta[name="robots"]');
    const robots = robotsEl?.getAttribute("content")?.toLowerCase() ?? "";
    report.robotsNoindex = robots.includes("noindex");
    if (report.robotsNoindex) report.issues.push("noindex");

    // Open Graph
    report.ogTitle =
      root.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null;
    report.ogDescription =
      root.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? null;
    report.ogImage =
      root.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null;
    if (!report.ogTitle) report.issues.push("missing og:title");
    if (!report.ogImage) report.issues.push("missing og:image");

    // JSON-LD
    report.jsonLdCount = root.querySelectorAll('script[type="application/ld+json"]').length;

    // Links
    const origin = new URL(url).origin;
    for (const a of root.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      if (!href) continue;
      try {
        const target = new URL(href, url);
        if (target.origin === origin) report.internalLinks++;
        else if (target.protocol.startsWith("http")) report.externalLinks++;
      } catch {
        // skip malformed
      }
    }

    // Images alt
    const imgs = root.querySelectorAll("img");
    report.totalImages = imgs.length;
    report.imagesMissingAlt = imgs.filter((i) => {
      const alt = i.getAttribute("alt");
      return alt === undefined || alt === null;
    }).length;
    if (report.imagesMissingAlt > 0)
      report.issues.push(`${report.imagesMissingAlt}/${report.totalImages} images missing alt`);
  } catch (err) {
    report.issues.push(`fetch failed: ${(err as Error).message}`);
  }

  return report;
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<PageReport>
): Promise<PageReport[]> {
  const results: PageReport[] = [];
  let idx = 0;
  const pool = Array.from({ length: CONCURRENCY }, async () => {
    while (idx < items.length) {
      const myIdx = idx++;
      const item = items[myIdx];
      process.stdout.write(
        `\r  [${myIdx + 1}/${items.length}] ${String(item).slice(0, 70).padEnd(70)} `
      );
      const result = await worker(item);
      results.push(result);
    }
  });
  await Promise.all(pool);
  process.stdout.write("\n");
  return results;
}

// ── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n── Local SEO Crawl ──`);
  console.log(`Target:      ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  console.log("1/3  Fetching sitemap.xml…");
  const urls = await fetchSitemap(BASE_URL);
  console.log(`     ${urls.length} URLs to crawl\n`);

  if (urls.length === 0) {
    console.error("✖ No URLs found");
    process.exit(1);
  }

  console.log("2/3  Crawling pages…");
  const reports = await runPool(urls, analyze);

  console.log("\n3/3  Analyzing cross-page issues…");

  // Duplicate detection
  const byTitle = new Map<string, string[]>();
  const byDescription = new Map<string, string[]>();
  for (const r of reports) {
    if (r.title) {
      if (!byTitle.has(r.title)) byTitle.set(r.title, []);
      byTitle.get(r.title)!.push(r.url);
    }
    if (r.description) {
      if (!byDescription.has(r.description)) byDescription.set(r.description, []);
      byDescription.get(r.description)!.push(r.url);
    }
  }
  const duplicateTitles = [...byTitle.entries()].filter(([, urls]) => urls.length > 1);
  const duplicateDescriptions = [...byDescription.entries()].filter(([, urls]) => urls.length > 1);

  // Tag pages with duplicate markers
  for (const r of reports) {
    if (r.title && (byTitle.get(r.title)?.length ?? 0) > 1) r.issues.push("duplicate title");
    if (r.description && (byDescription.get(r.description)?.length ?? 0) > 1)
      r.issues.push("duplicate description");
  }

  // ── Save report ──────────────────────────────────────────
  const outDir = join(process.cwd(), "audit");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `seo-crawl-${stamp}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        target: BASE_URL,
        crawledAt: new Date().toISOString(),
        totalUrls: reports.length,
        duplicateTitles: duplicateTitles.map(([title, urls]) => ({ title, urls })),
        duplicateDescriptions: duplicateDescriptions.map(([description, urls]) => ({
          description,
          urls,
        })),
        pages: reports.sort((a, b) => b.issues.length - a.issues.length),
      },
      null,
      2
    )
  );

  // ── Summary ──────────────────────────────────────────────
  const count = (pred: (r: PageReport) => boolean) => reports.filter(pred).length;

  console.log("\n── Summary ──────────────────────────────────");
  console.log(`Pages crawled:           ${reports.length}`);
  console.log(`OK (200):                ${count((r) => r.status === 200)}`);
  console.log(`Redirects (3xx):         ${count((r) => r.status >= 300 && r.status < 400)}`);
  console.log(`Client errors (4xx):     ${count((r) => r.status >= 400 && r.status < 500)}`);
  console.log(`Server errors (5xx):     ${count((r) => r.status >= 500)}`);
  console.log(`Fetch failed:            ${count((r) => r.status === 0)}`);
  console.log();
  console.log(`Missing <title>:         ${count((r) => r.status === 200 && !r.title)}`);
  console.log(`Missing description:     ${count((r) => r.status === 200 && !r.description)}`);
  console.log(`Missing <h1>:            ${count((r) => r.status === 200 && r.h1Count === 0)}`);
  console.log(`Multiple <h1>:           ${count((r) => r.h1Count > 1)}`);
  console.log(`Missing canonical:       ${count((r) => r.status === 200 && !r.canonical)}`);
  console.log(`Missing og:image:        ${count((r) => r.status === 200 && !r.ogImage)}`);
  console.log(`Noindex pages:           ${count((r) => r.robotsNoindex)}`);
  console.log(`Slow (>3s):              ${count((r) => r.loadTimeMs > 3000)}`);
  console.log(`Duplicate titles:        ${duplicateTitles.length} group(s)`);
  console.log(`Duplicate descriptions:  ${duplicateDescriptions.length} group(s)`);
  console.log();

  const worst = reports.filter((r) => r.issues.length > 0).slice(0, 10);
  if (worst.length > 0) {
    console.log("Top pages by issue count:");
    for (const r of worst) {
      console.log(`  ${String(r.issues.length).padStart(2)} issues — ${r.url}`);
      for (const iss of r.issues.slice(0, 4)) console.log(`      • ${iss}`);
    }
    console.log();
  }

  console.log(`Full report written to: ${outPath}\n`);
}

main().catch((err) => {
  console.error("\n✖ Crawl failed:", err.message);
  process.exit(1);
});
