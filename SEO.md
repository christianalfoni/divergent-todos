# SEO Implementation Plan for Divergent Todos

## Executive Summary

This document outlines a comprehensive SEO strategy for Divergent Todos, addressing the unique challenges of a Single Page Application (SPA) deployed to Firebase Hosting. The plan is divided into immediate wins, medium-term improvements, and advanced optimizations.

**Current State:**
- Minimal meta tags (title only)
- SPA with client-side routing
- No structured data
- No social media optimization
- No sitemap or robots.txt

**Target Keywords:**
- Primary: "todo app", "task management", "productivity app", "focus management"
- Secondary: "attention management", "electron todo app", "daily planning tool", "work planning app"
- Long-tail: "todo app for developers", "minimalist task manager", "week planner app"

---

## Phase 1: Immediate Wins (1-2 days)

### 1.1 Enhanced Meta Tags

**Location:** `apps/web/index.html`

Add comprehensive meta tags:

```html
<head>
  <meta charset="UTF-8" />

  <!-- Primary Meta Tags -->
  <title>Divergent Todos - Own Your Attention, Plan Your Focus</title>
  <meta name="title" content="Divergent Todos - Own Your Attention, Plan Your Focus" />
  <meta name="description" content="Stop letting your tools compete for your attention. Divergent Todos is a minimalist task management app that helps you plan where your focus goes, one day at a time." />
  <meta name="keywords" content="todo app, task management, productivity app, focus management, attention management, daily planner, week planner, electron app" />
  <meta name="author" content="Divergent Todos" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#4f46e5" />

  <!-- Canonical URL -->
  <link rel="canonical" href="https://divergent-todos.com/" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://divergent-todos.com/" />
  <meta property="og:title" content="Divergent Todos - Own Your Attention, Plan Your Focus" />
  <meta property="og:description" content="Stop letting your tools compete for your attention. Plan where your focus goes, one day at a time." />
  <meta property="og:image" content="https://divergent-todos.com/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Divergent Todos" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://divergent-todos.com/" />
  <meta property="twitter:title" content="Divergent Todos - Own Your Attention, Plan Your Focus" />
  <meta property="twitter:description" content="Stop letting your tools compete for your attention. Plan where your focus goes, one day at a time." />
  <meta property="twitter:image" content="https://divergent-todos.com/og-image.png" />

  <!-- Favicons (already present) -->
  <!-- ... existing favicon links ... -->

  <!-- Manifest -->
  <link rel="manifest" href="/site.webmanifest" />
</head>
```

**Action Items:**
- [ ] Update index.html with enhanced meta tags
- [ ] Create OG image (1200x630px) showcasing the app
- [ ] Verify canonical URL matches production domain
- [ ] Test meta tags with Facebook Debugger and Twitter Card Validator

### 1.2 Structured Data (JSON-LD)

**Location:** `apps/web/index.html` (in `<head>`)

Add structured data for better search engine understanding:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Divergent Todos",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": ["Windows", "macOS", "Linux"],
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "50"
  },
  "description": "A minimalist task management app that helps you own your attention and plan where your focus goes, one day at a time.",
  "screenshot": "https://divergent-todos.com/screenshot.png",
  "url": "https://divergent-todos.com",
  "downloadUrl": "https://github.com/ChristianAlfoni/divergent-todos/releases/latest",
  "softwareVersion": "1.0.0",
  "author": {
    "@type": "Organization",
    "name": "Divergent Todos"
  }
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Divergent Todos",
  "url": "https://divergent-todos.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://divergent-todos.com/?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>
```

**Action Items:**
- [ ] Add JSON-LD structured data to index.html
- [ ] Update softwareVersion dynamically from package.json
- [ ] Add real aggregateRating data when available
- [ ] Test with Google Rich Results Test

### 1.3 Robots.txt

**Location:** `apps/web/public/robots.txt` (create new file)

```txt
# Allow all search engines
User-agent: *
Allow: /

# Disallow authentication/admin routes (if any)
# Disallow: /admin/

# Sitemap location
Sitemap: https://divergent-todos.com/sitemap.xml

# Crawl delay (optional, in seconds)
# Crawl-delay: 1
```

**Action Items:**
- [ ] Create robots.txt file
- [ ] Verify it's served at root URL
- [ ] Test with Google Search Console

### 1.4 Sitemap

**Location:** `apps/web/public/sitemap.xml` (create new file)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Homepage / Landing Page -->
  <url>
    <loc>https://divergent-todos.com/</loc>
    <lastmod>2025-12-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Terms of Service -->
  <url>
    <loc>https://divergent-todos.com/terms</loc>
    <lastmod>2025-12-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Add more pages as they're created -->

</urlset>
```

**Action Items:**
- [ ] Create sitemap.xml
- [ ] Update lastmod dates when content changes
- [ ] Submit sitemap to Google Search Console
- [ ] Consider automating sitemap generation for future pages

### 1.5 Semantic HTML Updates

**Location:** `apps/web/src/LandingPage.tsx`

The landing page has good structure but could be improved:

**Current Issues:**
- Missing `<header>` tag for logo/navigation area
- `<main>` lacks descriptive headings structure
- Could benefit from semantic `<article>` or `<section>` tags

**Recommendations:**
```tsx
<header className="...">
  <div className="flex items-center gap-3">
    <svg aria-label="Divergent Todos Logo">...</svg>
    <h1 className="sr-only">Divergent Todos</h1> {/* For screen readers */}
    <span className="...">DIVERGENT TODOS</span>
  </div>
</header>

<main>
  <article>
    <section aria-labelledby="hero-heading">
      <h1 id="hero-heading">Own Your Attention with Divergent Todos</h1>
      {/* ... */}
    </section>
  </article>
</main>
```

**Action Items:**
- [ ] Add semantic HTML5 tags
- [ ] Ensure proper heading hierarchy (h1 > h2 > h3)
- [ ] Add ARIA labels where appropriate
- [ ] Run accessibility audit

---

## Phase 2: Content & On-Page SEO (3-5 days)

### 2.1 Create SEO-Optimized Content Pages

**New Pages to Create:**

1. **Features Page** (`/features`)
   - Detailed feature explanations
   - Screenshots/GIFs of key features
   - Use cases and examples
   - Target keywords: "task management features", "todo app features"

2. **Download Page** (`/download`)
   - Platform-specific download links
   - Installation instructions
   - System requirements
   - Target keywords: "download todo app", "electron app download"

3. **About Page** (`/about`)
   - Philosophy behind the app
   - Team/creator information
   - Mission and values
   - Target keywords: "divergent todos story", "productivity philosophy"

4. **Blog/Resources** (`/blog`)
   - Productivity tips
   - Feature updates
   - User guides
   - Target keywords: "productivity tips", "focus management strategies"

**Action Items:**
- [ ] Create route structure in React Router
- [ ] Write content for each page
- [ ] Optimize each page with unique meta tags
- [ ] Add internal linking between pages

### 2.2 Optimize Existing Content

**Landing Page (/):**
- **Current:** Good copy but could be more SEO-focused
- **Improvements:**
  - Add FAQ section (great for featured snippets)
  - Include "above the fold" keywords naturally
  - Add testimonials/social proof section
  - Include "Download" CTA with keyword-rich anchor text

**Terms Page (/terms):**
- **Current:** Exists but not optimized
- **Improvements:**
  - Add proper meta tags
  - Link back to homepage
  - Use proper heading structure

**Action Items:**
- [ ] Audit current content for keyword density
- [ ] Add FAQ section to landing page
- [ ] Create testimonials section (if available)
- [ ] Optimize Terms page meta tags

### 2.3 Content Strategy

**Blog Post Ideas:**
1. "5 Ways to Own Your Attention in a Distracted World"
2. "Why Desktop Apps Beat Web Apps for Productivity"
3. "The Science of Task Management: Why Daily Planning Works"
4. "How to Plan Your Week Effectively"
5. "Divergent Todos vs. Other Task Managers: What's Different?"

**Action Items:**
- [ ] Set up blog infrastructure (could use Firebase Hosting + Functions)
- [ ] Create content calendar
- [ ] Write and publish initial blog posts
- [ ] Implement blog post schema markup

---

## Phase 3: Technical SEO (5-7 days)

### 3.1 Performance Optimization

**Current Concerns:**
- SPA bundle size
- Time to Interactive (TTI)
- Largest Contentful Paint (LCP)

**Optimizations:**

1. **Code Splitting**
   ```ts
   // In App.tsx, use React.lazy for route-based splitting
   const Calendar = lazy(() => import('./Calendar'))
   const Activity = lazy(() => import('./Activity'))
   const Terms = lazy(() => import('./Terms'))
   ```

2. **Image Optimization**
   - Compress all images (use WebP format)
   - Add width/height attributes to prevent layout shift
   - Implement lazy loading for below-fold images
   - Create responsive images with srcset

3. **Vite Build Optimization**
   ```ts
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom'],
             'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
             'ui-vendor': ['@headlessui/react', '@heroicons/react', 'framer-motion'],
           }
         }
       }
     }
   })
   ```

4. **Preload Critical Resources**
   ```html
   <!-- In index.html -->
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="dns-prefetch" href="https://firebaseapp.com">
   ```

**Action Items:**
- [ ] Implement code splitting
- [ ] Optimize and compress all images
- [ ] Configure Vite for optimal chunking
- [ ] Add resource hints (preconnect, dns-prefetch)
- [ ] Test with Lighthouse and PageSpeed Insights
- [ ] Aim for 90+ performance score

### 3.2 Firebase Hosting Configuration

**Update:** `apps/web/firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  }
}
```

**Action Items:**
- [ ] Update firebase.json with caching headers
- [ ] Add security headers
- [ ] Enable compression (Firebase does this automatically)
- [ ] Test header configuration

### 3.3 Progressive Web App (PWA) Enhancements

**Update:** `apps/web/public/site.webmanifest`

Ensure manifest is properly configured:

```json
{
  "name": "Divergent Todos",
  "short_name": "Divergent",
  "description": "Own your attention. Plan your focus.",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "theme_color": "#4f46e5",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "orientation": "portrait-primary"
}
```

**Action Items:**
- [ ] Verify manifest configuration
- [ ] Add service worker for offline support (optional but good for SEO)
- [ ] Test PWA installability
- [ ] Add "Add to Home Screen" prompt

---

## Phase 4: Advanced SEO (2-3 weeks)

### 4.1 Server-Side Rendering (SSR) / Static Site Generation (SSG)

**Challenge:** SPAs have poor SEO because content loads via JavaScript.

**Solution Options:**

#### Option A: Prerendering with Firebase Functions

Use a prerendering service or implement your own:

```typescript
// functions/src/prerender.ts
import * as functions from 'firebase-functions'
import puppeteer from 'puppeteer'

export const prerender = functions.https.onRequest(async (req, res) => {
  const url = `https://divergent-todos.com${req.path}`

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle0' })

  const html = await page.content()
  await browser.close()

  res.set('Cache-Control', 'public, max-age=3600')
  res.send(html)
})
```

**Firebase Hosting Rewrite:**
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "function": "prerender"
      }
    ]
  }
}
```

**Pros:** Works with existing SPA
**Cons:** Expensive compute costs, complexity

#### Option B: Static Site Generation

Generate static HTML for key pages during build:

1. Create a build script that uses Puppeteer to render pages
2. Save rendered HTML to dist/
3. Configure Firebase Hosting to serve static files

**Pros:** Better performance, lower costs
**Cons:** Requires build pipeline changes

#### Option C: Hybrid Approach (Recommended)

- Keep SPA for authenticated users
- Serve prerendered pages for search engines and social crawlers
- Detect bots via User-Agent

```typescript
// Firebase Function
export const serve = functions.https.onRequest(async (req, res) => {
  const userAgent = req.headers['user-agent'] || ''
  const isBot = /googlebot|bingbot|twitterbot|facebookexternalhit/i.test(userAgent)

  if (isBot) {
    // Serve prerendered HTML
    const html = await getPrerendereredHTML(req.path)
    res.send(html)
  } else {
    // Serve SPA
    res.sendFile('index.html')
  }
})
```

**Action Items:**
- [ ] Evaluate SSR/SSG options
- [ ] Implement chosen approach
- [ ] Test with Google Search Console URL Inspection
- [ ] Monitor crawl errors

### 4.2 International SEO (if applicable)

**If targeting multiple languages/regions:**

1. **hreflang Tags**
   ```html
   <link rel="alternate" hreflang="en" href="https://divergent-todos.com/" />
   <link rel="alternate" hreflang="es" href="https://divergent-todos.com/es/" />
   <link rel="alternate" hreflang="x-default" href="https://divergent-todos.com/" />
   ```

2. **Localized Content**
   - Translate landing page
   - Localize meta tags
   - Use subdirectories (/es/, /fr/) or subdomains

**Action Items:**
- [ ] Determine target markets
- [ ] Implement hreflang tags
- [ ] Create localized content
- [ ] Set up geo-targeting in Google Search Console

### 4.3 Link Building Strategy

**Internal Linking:**
- Link from homepage to feature pages
- Cross-link blog posts
- Add breadcrumb navigation
- Create a sitemap page (/sitemap)

**External Link Building:**
- Submit to productivity tool directories
- Reach out to tech blogs for reviews
- Create shareable content (infographics, guides)
- Engage on Product Hunt, Hacker News
- Guest post on productivity blogs
- Create GitHub README with backlink
- List on alternativeto.net, slant.co

**Action Items:**
- [ ] Create internal linking strategy
- [ ] Build list of target directories/blogs
- [ ] Submit to major directories
- [ ] Reach out for reviews/features
- [ ] Create shareable content

---

## Phase 5: Monitoring & Analytics (Ongoing)

### 5.1 Google Search Console Setup

**Actions:**
1. Verify domain ownership
2. Submit sitemap
3. Monitor crawl errors
4. Track search performance
5. Request indexing for new pages
6. Set up email alerts for critical issues

**Action Items:**
- [ ] Add and verify site in Google Search Console
- [ ] Submit sitemap
- [ ] Set up weekly performance reports
- [ ] Fix any crawl errors

### 5.2 Google Analytics 4 Setup

**Implementation:**
```html
<!-- In index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', {
    page_path: window.location.pathname,
  });
</script>
```

**Track Custom Events:**
```typescript
// Track sign-ups, downloads, feature usage
gtag('event', 'sign_up', {
  method: 'Google'
})

gtag('event', 'download_app', {
  platform: 'macOS'
})
```

**Action Items:**
- [ ] Create GA4 property
- [ ] Install tracking code
- [ ] Set up custom events
- [ ] Create dashboards for key metrics
- [ ] Link Google Search Console to GA4

### 5.3 Core Web Vitals Monitoring

**Key Metrics:**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

**Tools:**
- Lighthouse CI (in GitHub Actions)
- PageSpeed Insights API
- Chrome User Experience Report (CrUX)

**Action Items:**
- [ ] Set up Lighthouse CI in GitHub workflow
- [ ] Monitor Core Web Vitals in Google Search Console
- [ ] Set performance budgets
- [ ] Create alerts for regressions

### 5.4 Competitor Analysis

**Competitors to Track:**
- Todoist
- Things
- Microsoft To Do
- Any.do
- TickTick

**Analysis Points:**
- Keywords they rank for
- Backlink profiles
- Content strategy
- Technical SEO implementation

**Tools:**
- Ahrefs / SEMrush (paid)
- Google Keyword Planner (free)
- Ubersuggest (freemium)

**Action Items:**
- [ ] Identify top 5 competitors
- [ ] Analyze their SEO strategies
- [ ] Find keyword gaps
- [ ] Monitor their ranking changes

---

## Implementation Checklist

### Quick Wins (Week 1)
- [ ] Update index.html with enhanced meta tags
- [ ] Create and add OG image (1200x630px)
- [ ] Add structured data (JSON-LD)
- [ ] Create robots.txt
- [ ] Create sitemap.xml
- [ ] Improve semantic HTML on landing page
- [ ] Set up Google Search Console
- [ ] Set up Google Analytics 4
- [ ] Submit sitemap to search engines

### Medium Priority (Weeks 2-3)
- [ ] Create Features page
- [ ] Create Download page
- [ ] Add FAQ section to landing page
- [ ] Optimize images (WebP, compression)
- [ ] Implement code splitting
- [ ] Configure Vite for optimal performance
- [ ] Update firebase.json with caching headers
- [ ] Run Lighthouse audit and fix issues
- [ ] Update PWA manifest

### Long-term (Month 2+)
- [ ] Evaluate and implement SSR/prerendering
- [ ] Create blog infrastructure
- [ ] Write and publish blog posts
- [ ] Build backlink strategy
- [ ] Submit to directories
- [ ] Create shareable content
- [ ] Set up Lighthouse CI
- [ ] Monitor and iterate based on analytics

---

## Success Metrics

**Short-term (1-3 months):**
- Get indexed by Google (all pages)
- Lighthouse SEO score: 95+
- Lighthouse Performance score: 90+
- 10+ organic search impressions/day
- 1+ organic click/day

**Medium-term (3-6 months):**
- Rank in top 50 for target keywords
- 100+ organic search impressions/day
- 10+ organic clicks/day
- 5+ quality backlinks
- Featured snippet for 1+ query

**Long-term (6-12 months):**
- Rank in top 10 for 5+ target keywords
- 1000+ organic search impressions/day
- 50+ organic clicks/day
- 50+ quality backlinks
- Multiple featured snippets
- Consistent organic traffic growth

---

## Resources

### SEO Tools
- **Free:**
  - Google Search Console
  - Google Analytics 4
  - Google Lighthouse
  - Bing Webmaster Tools
  - Meta Tags Debuggers (Facebook, Twitter)

- **Paid:**
  - Ahrefs (comprehensive SEO toolkit)
  - SEMrush (keyword research, competitor analysis)
  - Screaming Frog (technical SEO audit)

### Testing Tools
- Google Rich Results Test: https://search.google.com/test/rich-results
- PageSpeed Insights: https://pagespeed.web.dev/
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- WebPageTest: https://www.webpagetest.org/

### Learning Resources
- Google Search Central: https://developers.google.com/search/docs
- Moz Beginner's Guide to SEO: https://moz.com/beginners-guide-to-seo
- Firebase Hosting Docs: https://firebase.google.com/docs/hosting

---

## Notes

1. **SPA SEO Challenges:** The biggest challenge is ensuring search engines can crawl and index your JavaScript-rendered content. The prerendering/SSR solution in Phase 4 addresses this.

2. **Firebase Hosting Benefits:** Firebase Hosting provides excellent performance out of the box with global CDN, HTTP/2, and automatic SSL.

3. **Desktop App vs Web:** Focus SEO efforts on the web version. The desktop app benefits indirectly through brand awareness and downloads.

4. **Content is King:** While technical SEO is important, high-quality, keyword-optimized content drives organic traffic. Prioritize creating valuable content for your target audience.

5. **Patience Required:** SEO takes 3-6 months to show significant results. Focus on consistent implementation and monitoring.

---

## Contact

For questions or clarifications about this SEO plan, please refer to the project documentation or reach out to the development team.

**Last Updated:** December 11, 2025
**Version:** 1.0
