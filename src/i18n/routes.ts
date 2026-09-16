// Build-time manifest of every real page route in the site.
//
// Why this exists: hreflang tags and the region switcher both used to rely on
// hand-maintained lists of "which pages exist in which region". Those lists
// drifted from reality — the AU list was missing the homepage, and /us and /uk
// have only a pricing page — which produced hreflang tags pointing at 404s and
// a region switcher that dumped people on the pricing page.
//
// Deriving the routes from the filesystem at build time means the lists can
// never drift again.

// This runs at build time only (it is imported from .astro frontmatter), so
// read the filesystem directly. It used to be `import.meta.glob('/src/pages/**/*.astro')`,
// which made Vite treat every page as a lazy import of every layout: the CSS of
// all 320+ pages was then linked from every single page (145 stylesheet requests
// on the homepage). Plain fs has no module graph and no such side effect.
import { readdirSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
// import.meta.url points at the bundled chunk once Vite has processed this
// file, so resolve from the project root (Astro runs with cwd there).
function findPagesDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'src', 'pages');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fail the build loudly rather than shipping empty hreflang and a dead switcher.
  throw new Error('[i18n/routes] Could not locate src/pages from ' + process.cwd());
}
const PAGES_DIR = findPagesDir();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.astro')) out.push(full);
  }
  return out;
}

/** Every route the site actually builds, normalised: '/', '/pricing', '/es/blog/foo'. */
export const ROUTES: Set<string> = new Set(
  walk(PAGES_DIR).map((file) => {
    const path = '/' + relative(PAGES_DIR, file).split(sep).join('/')
      .replace(/\.astro$/, '')
      .replace(/\/index$/, '')
      .replace(/^index$/, '');
    return path === '/' || path === '' ? '/' : path;
  }).filter((p) => !/(^|\/)404$/.test(p))
);

/** Region prefixes in nav order. `au` is the unprefixed root site. */
export const REGION_PREFIXES = ['au', 'us', 'uk', 'es', 'mx', 'br', 'fr', 'de', 'it', 'nl', 'se', 'dk', 'fi', 'no'] as const;
export type RegionKey = (typeof REGION_PREFIXES)[number];

/** Regions that serve English content (differ only by currency). */
export const ENGLISH_REGIONS: RegionKey[] = ['au', 'us', 'uk'];

/** '' for au, '/es' etc. for the rest. */
export function prefixFor(region: string): string {
  return region === 'au' ? '' : `/${region}`;
}

/**
 * Strip a locale prefix off a path.
 * '/es/blog/foo' -> '/blog/foo'; '/es' -> '/'; '/pricing' -> '/pricing'.
 */
export function stripRegion(pathname: string): { region: RegionKey; basePath: string } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const segments = clean.split('/').filter(Boolean);
  const first = segments[0];
  if (first && first !== 'au' && (REGION_PREFIXES as readonly string[]).includes(first)) {
    const rest = '/' + segments.slice(1).join('/');
    return { region: first as RegionKey, basePath: rest === '/' ? '/' : rest.replace(/\/$/, '') };
  }
  return { region: 'au', basePath: clean };
}

/** Does this exact page exist for this region? */
export function routeExists(region: string, basePath: string): boolean {
  const prefix = prefixFor(region);
  const candidate = basePath === '/' ? (prefix || '/') : `${prefix}${basePath}`;
  return ROUTES.has(candidate);
}

/** The URL of this page in a given region, or null if it does not exist there. */
export function urlFor(region: string, basePath: string): string | null {
  if (!routeExists(region, basePath)) return null;
  const prefix = prefixFor(region);
  return basePath === '/' ? (prefix || '/') : `${prefix}${basePath}`;
}

/**
 * Base paths (region-stripped) that the nav links to, per region.
 * Individual blog posts are collapsed to '/blog' — the nav never links to a
 * specific post, and shipping 200+ slugs to the browser would be wasteful.
 */
export function navRoutesByRegion(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const region of REGION_PREFIXES) {
    const prefix = prefixFor(region);
    const paths = new Set<string>();
    for (const route of ROUTES) {
      const { region: routeRegion, basePath } = stripRegion(route);
      if (routeRegion !== region) continue;
      // Collapse blog posts, keep the index.
      paths.add(/^\/blog\/.+/.test(basePath) ? '/blog' : basePath);
    }
    if (paths.size) out[region] = [...paths].sort();
    void prefix;
  }
  return out;
}
