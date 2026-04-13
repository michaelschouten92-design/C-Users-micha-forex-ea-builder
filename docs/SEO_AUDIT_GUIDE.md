# SEO Audit Guide — Algo Studio

Gratis, volwaardige SEO audit pre-launch. Combinatie van **Google Search Console** (indexatie + queries), **Screaming Frog** (technische crawl) en **PageSpeed Insights** (Core Web Vitals).

---

## 1. Google Search Console (GSC) — verplicht

Officiële Google tool. Laat zien wat Google écht doet met je site: indexatie, crawl errors, rankings, Core Web Vitals.

### Setup

1. Ga naar [search.google.com/search-console](https://search.google.com/search-console)
2. Klik **Add Property** → kies **Domain** (niet URL-prefix)
3. Voer `algostudio.app` in
4. Google geeft een TXT-record → voeg toe in DNS (Cloudflare / Vercel DNS)
5. Klik **Verify** (duurt 1-2 min na DNS-propagatie)

### Submit sitemap

Zodra verified:

1. Links in menu → **Sitemaps**
2. Voeg toe: `sitemap.xml`
3. Next.js serveert deze al via [src/app/sitemap.ts](src/app/sitemap.ts)

### Wat checken na 3-7 dagen

- **Coverage / Pages** — zie welke pagina's geindexeerd zijn, en waarom niet (noindex, redirect, 404, soft 404)
- **Core Web Vitals** — LCP, CLS, INP per URL-group (mobile + desktop)
- **Performance** — queries waarop je al getoond wordt + CTR + gemiddelde positie
- **Enhancements** — structured data validation (JSON-LD errors)
- **Manual Actions** — moet leeg zijn, anders is er een penalty

### Bing Webmaster Tools (bonus, 5 min)

[bing.com/webmasters](https://www.bing.com/webmasters) — import direct vanuit GSC met één klik. Bing/DuckDuckGo verkeer is klein maar gratis.

---

## 2. Screaming Frog SEO Spider — technische audit

Desktop tool. Gratis tot 500 URLs (ruim voldoende voor Algo Studio v1).

### Install

Download: [screamingfrog.co.uk/seo-spider](https://www.screamingfrog.co.uk/seo-spider/)

Windows / Mac / Linux builds. Geen account nodig voor free tier.

### Config vóór crawl

1. **Configuration → Spider → Rendering → JavaScript**
   - Next.js serveert SSR/SSG, dus "Text Only" is vaak prima
   - Gebruik **JavaScript** rendering alleen als je iets mist (trager)

2. **Configuration → Spider → Crawl**
   - Check: `Crawl All Subdomains` **uit** (staging moet niet meegenomen)
   - Check: `Crawl Outside of Start Folder` **uit**
   - Respect: `noindex`, `canonical`, `nofollow` — allemaal **aan**

3. **Configuration → Exclude** (optioneel)
   - Voeg patterns toe om `/app/*` (authenticated app) te skippen — dit zijn geen publieke SEO-pagina's:
     ```
     https://algostudio.app/app/.*
     https://algostudio.app/api/.*
     ```

4. **Configuration → User-Agent**
   - Zet op `Screaming Frog SEO Spider` (default) — respecteert robots.txt

### Run crawl

1. Voer in: `https://algostudio.app`
2. Klik **Start**
3. Wacht (paar min voor 100-300 pages)

### Wat te checken (tabs rechts)

Sorteer op kolom en filter op **rode/oranje** rijen:

| Tab                  | Focus                                             | Wat fixen                                                         |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **Internal**         | status code kolom                                 | Alle non-200: 404 (broken links), 500 (server errors), 301-chains |
| **Response Codes**   | Client Error (4xx), Server Error (5xx)            | Direct fixen of redirect                                          |
| **Page Titles**      | Missing, Duplicate, Over 60 chars, Below 30 chars | Unieke titles per pagina, 50-60 chars optimaal                    |
| **Meta Description** | Missing, Duplicate, Over 160 chars                | Unieke descriptions, 140-155 chars                                |
| **H1**               | Missing, Multiple, Duplicate                      | Exact 1 h1 per pagina, uniek                                      |
| **Canonicals**       | Missing, Self-referencing absent, Mismatched      | Zorg dat elke indexable page self-canonical is                    |
| **Directives**       | Noindex pages                                     | Check of niet per ongeluk publieke pages geblokkeerd zijn         |
| **Hreflang**         | Missing return tags                               | Alleen relevant als multi-language                                |
| **Images**           | Missing alt text, Over 100kb                      | Alt op alle content images, compress grote images                 |
| **Structured Data**  | Validation errors                                 | JSON-LD op pricing, FAQ, roadmap moet valid zijn                  |

### Export rapport

**Bulk Export → All** → geeft CSVs per categorie. Open in Excel/Sheets, geef de issue-CSVs aan mij dan fixen we ze samen.

---

## 3. PageSpeed Insights — Core Web Vitals per pagina

Test de key pages handmatig:

- [pagespeed.web.dev](https://pagespeed.web.dev)
- Test minimaal deze URLs:
  - `/` (homepage)
  - `/pricing`
  - `/faq`
  - `/about`
  - `/roadmap`
  - `/track-record`
  - `/strategy/[een-slug]` (content page)

Voor elke URL check **mobile + desktop**:

- **Performance score** — streef >90
- **LCP** — <2.5s (largest contentful paint)
- **CLS** — <0.1 (cumulative layout shift)
- **INP** — <200ms (interaction to next paint)

Vercel geeft deze metrics ook gratis via [Vercel Analytics / Speed Insights](https://vercel.com/docs/speed-insights) zodra je Web Vitals inschakelt in dashboard.

---

## 4. Aanvullende gratis checks

| Tool                                                                               | Doel                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| [securityheaders.com](https://securityheaders.com)                                 | CSP, X-Frame-Options, HSTS (beïnvloedt rankings) |
| [validator.schema.org](https://validator.schema.org)                               | Paste URL → valideert JSON-LD                    |
| [search.google.com/test/rich-results](https://search.google.com/test/rich-results) | Google's eigen structured data test              |
| [web.dev/measure](https://web.dev/measure)                                         | Lighthouse + best practices in één               |
| [ahrefs.com/backlink-checker](https://ahrefs.com/backlink-checker)                 | 100 gratis backlinks per domain                  |
| [ubersuggest](https://neilpatel.com/ubersuggest/)                                  | 3 gratis keyword searches per dag                |

---

## 5. Workflow voor Algo Studio launch

1. **Vandaag** — GSC setup + sitemap submit (1x werk, daarna automatisch)
2. **Vandaag** — Screaming Frog crawl, exporteer issues, fix wat rood is
3. **Vandaag** — PageSpeed op 7 key pages, fix CLS/LCP regressies
4. **Week 1 na launch** — GSC Coverage report controleren, non-indexed pages fixen
5. **Week 2-4** — GSC Performance tab monitoren voor opkomende queries → schrijf content op die intents

---

## Referenties

- Site sitemap: [src/app/sitemap.ts](src/app/sitemap.ts)
- Robots: Next.js default (check dat `/app/*` en `/api/*` in robots.txt geblokkeerd zijn)
- Metadata per page: `export const metadata` in elke `page.tsx` / `layout.tsx`
