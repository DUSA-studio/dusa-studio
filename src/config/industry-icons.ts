// Central minimal line-icon set for the 16 industries.
// One place to update; industries indexes (all locales) + Nav dropdown render from here.
// Grammar: 24x24 viewBox, stroke 1.5, round caps/joins, no fills, max ~3 strokes per glyph.
// Keys = final slug segment of each industry page.

export const INDUSTRY_ICONS: Record<string, string> = {
  // House: roof line, walls, door
  'real-estate':
    'M3 11.2L12 3l9 8.2M5.5 9.8V21h13V9.8M10 21v-5.5h4V21',
  // Barbell: bar + inner/outer plates
  'gyms':
    'M4 9.5v5M20 9.5v5M7 7.5v9M17 7.5v9M7 12h10',
  // Wrench
  'tradies':
    'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  // Fork + knife
  'restaurants':
    'M5 3v5.5a2.5 2.5 0 005 0V3M7.5 11v10M16.5 21V3.5c2.6 2.3 3.4 6.2 1.7 9.2-.35.6-1.7 1.3-1.7 1.3',
  // Scissors
  'salons':
    'M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12',
  // Calculator: frame, screen, key dots
  'accountants':
    'M6.5 2.5h11A1.5 1.5 0 0119 4v16a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 20V4a1.5 1.5 0 011.5-1.5zM8.5 6h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01',
  // Tooth
  'dentists':
    'M12 5.3C10.6 3.9 8.7 3 7.2 3 4.6 3 3 5.1 3 7.6c0 4.3 1.9 7.8 3.4 11.3.6 1.4 2.6 1.3 3.1-.2l1.6-4.8c.3-.9 1.5-.9 1.8 0l1.6 4.8c.5 1.5 2.5 1.6 3.1.2C19.1 15.4 21 11.9 21 7.6 21 5.1 19.4 3 16.8 3c-1.5 0-3.4.9-4.8 2.3z',
  // Camera
  'photographers':
    'M2.5 8.5A1.5 1.5 0 014 7h3l2-3h6l2 3h3a1.5 1.5 0 011.5 1.5V19a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 19zM12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  // Hard hat
  'construction':
    'M5 14v-1a7 7 0 0114 0v1M10 7.3V4.5h4v2.8M3 14h18v3.2H3z',
  // Kettlebell
  'personal-trainers':
    'M8.6 9.4a3.55 3.55 0 116.8 0M12 20.4a5.9 5.9 0 110-11.8 5.9 5.9 0 010 11.8z',
  // Sparkles
  'cleaning-services':
    'M11 4l1.8 4.7 4.7 1.8-4.7 1.8L11 17l-1.8-4.7-4.7-1.8 4.7-1.8zM19 16l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z',
  // Scales of justice
  'law-firms':
    'M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2',
  // Twin towers with windows
  'property-managers':
    'M3 21h18M5.5 21V5.5a1 1 0 011-1H12a1 1 0 011 1V21M13 21V10.5a1 1 0 011-1h4.5a1 1 0 011 1V21M8 8h2.5M8 11.5h2.5M8 15h2.5M15.5 13.5h1.5M15.5 17h1.5',
  // Car
  'auto-repair':
    'M4.5 15.2l1.6-4.8a2 2 0 011.9-1.4h8a2 2 0 011.9 1.4l1.6 4.8M4.5 15.2h15M4.5 15.2V18M19.5 15.2V18M8.8 18.2a1.7 1.7 0 11-3.4 0 1.7 1.7 0 013.4 0zM18.6 18.2a1.7 1.7 0 11-3.4 0 1.7 1.7 0 013.4 0z',
  // Target
  'coaches':
    'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM12 12h.01',
  // Shopping bag
  'ecommerce':
    'M5.8 8h12.4l1.1 12a1.2 1.2 0 01-1.2 1.3H5.9A1.2 1.2 0 014.7 20zM9 11V6.5a3 3 0 016 0V11',
};
