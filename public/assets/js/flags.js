// Inline SVG flags per market code, so no image files or emoji (Windows and many
// TV browsers don't render flag emoji). Simplified where needed (Spain without
// its coat of arms). Markets without an entry show no flag.

const FLAGS = {
  PL: `<svg viewBox="0 0 8 5"><rect width="8" height="5" fill="#FFFFFF"/><rect y="2.5" width="8" height="2.5" fill="#DC143C"/></svg>`,
  SE: `<svg viewBox="0 0 16 10"><rect width="16" height="10" fill="#006AA7"/><rect x="5" width="2" height="10" fill="#FECC02"/><rect y="4" width="16" height="2" fill="#FECC02"/></svg>`,
  DK: `<svg viewBox="0 0 37 28"><rect width="37" height="28" fill="#C8102E"/><rect x="12" width="4" height="28" fill="#FFFFFF"/><rect y="12" width="37" height="4" fill="#FFFFFF"/></svg>`,
  FI: `<svg viewBox="0 0 18 11"><rect width="18" height="11" fill="#FFFFFF"/><rect x="5" width="3" height="11" fill="#002F6C"/><rect y="4" width="18" height="3" fill="#002F6C"/></svg>`,
  EE: `<svg viewBox="0 0 33 21"><rect width="33" height="7" fill="#0072CE"/><rect y="7" width="33" height="7" fill="#000000"/><rect y="14" width="33" height="7" fill="#FFFFFF"/></svg>`,
  UK: `<svg viewBox="0 0 60 30"><clipPath id="flag-uk-s"><path d="M0,0v30h60V0z"/></clipPath><clipPath id="flag-uk-t"><path d="M30,15h30v15zv15H0zH0V0zV0h30z"/></clipPath><g clip-path="url(#flag-uk-s)"><path d="M0,0v30h60V0z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#FFFFFF" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#flag-uk-t)" stroke="#C8102E" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#FFFFFF" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></g></svg>`,
  ES: `<svg viewBox="0 0 750 500"><rect width="750" height="500" fill="#AA151B"/><rect y="125" width="750" height="250" fill="#F1BF00"/></svg>`,
  CZ: `<svg viewBox="0 0 6 4"><rect width="6" height="2" fill="#FFFFFF"/><rect y="2" width="6" height="2" fill="#D7141A"/><path d="M0,0L3,2L0,4z" fill="#11457E"/></svg>`
};

// SVG markup for a market's flag, or "" if there is none.
export const flagSvg = (market) => FLAGS[market] || "";
