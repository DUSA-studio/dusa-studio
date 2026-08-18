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

const pageModules = import.meta.glob('/src/pages/**/*.astro');

/** Every route the site actually builds, normalised: '/', '/pricing', '/es/blog/foo'. */
export const ROUTES: Set<string> = new Set(
  Object.keys(pageModules).map((file) => {
    const path = file
      .replace(/^\/src\/pages/, '')
      .replace(/\.astro$/, '')
      .replace(/\/index$/, '');
    return path === '' ? '/' : path;
  })
);

/** Region prefixes in nav order. `au` is the unprefixed root site. */
export const REGION_PREFIXES = ['au', 'us', 'uk', 'es', 'mx', 'br', 'fr', 'de'] as const;
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
