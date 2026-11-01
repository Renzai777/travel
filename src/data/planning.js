/* Practical planning content: seasons, budget, packing, time-sensitive alerts and sources. */
export const SEASONS = [
  { months: "Oct – Nov", verdict: "best", note: "Crystal-clear Himalayan views, pleasant plains, post-monsoon greenery. Delhi smog can start in November." },
  { months: "Mar – Jun", verdict: "good", note: "Rhododendrons bloom in Kumaon (Mar–Apr); hills are lovely but plains get hot (40 °C+) by May." },
  { months: "Dec – Feb", verdict: "snow", note: "Snow in Auli and skiing (Jan–Mar). Fog delays trains in the plains; some high roads may close." },
  { months: "Jul – Sep", verdict: "avoid", note: "Monsoon landslides on the Rishikesh–Joshimath highway; rafting is closed." },
];

export const BUDGET = [
  { item: "Flights (Pune ⇄ Delhi / Pantnagar)", low: 10000, high: 18000 },
  { item: "Private cab, 13 days (~1,600 km, shared by 2)", low: 25000, high: 35000 },
  { item: "Hotels, 14 nights (shared room)", low: 18000, high: 35000 },
  { item: "Food & snacks", low: 9000, high: 15000 },
  { item: "Rafting, ropeways, entries, boating", low: 4000, high: 8000 },
];

export const PACKING = [
  { group: "Plains", items: ["Cotton kurtas, modest clothes", "Slip-on shoes for temples", "Socks for cold marble floors", "N95 mask for Delhi"] },
  { group: "Ganga & foothills", items: ["Quick-dry clothes for rafting", "Sandals for Robber's Cave", "Light fleece"] },
  { group: "High Himalaya", items: ["Thermals + down jacket", "Gloves, beanie, wool socks", "Sunglasses & SPF 50", "Motion-sickness tablets", "Power bank, cash"] },
];

export const ALERTS = [
  {
    tag: "Auli",
    text: "The Joshimath–Auli ropeway has been reported closed since the 2023 land-subsidence crisis. Plan on the 16 km road and check GMVN for any reopening.",
  },
  {
    tag: "Expressway",
    text: "The Delhi–Dehradun Expressway opened on 14 April 2026, cutting Delhi → Dehradun to about 2.5 hours.",
  },
  {
    tag: "Kainchi Dham",
    text: "During the June 15 foundation fair private vehicles are stopped and shuttles run. Authorities have discussed pre-registration and visitor caps — check before you go. No photography inside.",
  },
  {
    tag: "Vrindavan",
    text: "Banke Bihari winter darshan is roughly 8:45 am–1 pm and 4:30–8:30 pm; timings change by season and on festivals.",
  },
];

export const SOURCES = [
  ["Delhi–Dehradun Expressway inauguration (ETV Bharat)", "https://www.etvbharat.com/en/videos/watch-live-pm-modi-inaugurates-delhi-dehradun-expressway-enn26041402121"],
  ["Delhi–Dehradun Expressway opens (Swarajya)", "https://swarajyamag.com/amp/story/news-brief/delhidehradun-expressway-opens-210-km-corridor-cuts-travel-time-to-25-hours-features-wildlife-corridor-and-smart-traffic-systems"],
  ["Auli skiing 2026-27 & ropeway status (HappyFares)", "https://www.happyfares.in/blog/?p=12592"],
  ["Auli ropeway ticket guide (TrekGo)", "https://trekgo.in/blog/auli-ropeway-ticket-price-guide"],
  ["Kainchi Dham Fair 2026 traffic advisory (India TV)", "https://www.indiatvnews.com/news/india/kainchi-dham-fair-2026-no-private-vehicle-entry-allowed-police-issue-major-traffic-advisory-check-details-here-2026-06-11-1044510"],
  ["Kainchi Dham registration plans (Free Press Journal)", "https://www.freepressjournal.in/lifestyle/kainchi-dham-visitors-may-soon-need-to-register-before-their-trip-heres-what-to-know"],
  ["Neem Karoli Baba Ashram — Kainchi Dham", "https://nkbashram.org/maharaj-ji-indian-ashrams/kainchi-dham"],
  ["Banke Bihari temple timings (Shubh Panchang)", "https://shubhpanchang.com/temples/banke-bihari-temple"],
  ["Banke Bihari official site", "https://bihariji.org/public/visitTemple.aspx"],
  ["Uttarakhand Tourism", "https://uttarakhandtourism.gov.in/"],
  ["Auli, India (Wikipedia)", "https://en.wikipedia.org/wiki/Auli,_India"],
];
