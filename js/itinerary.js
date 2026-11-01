/* 15-day route: Pune → Braj → Delhi → Garhwal → Kumaon → Pune. Distances/times are approximate. */
export const DAYS = [
  {
    day: 1, place: "mathura", title: "Fly north, land in Braj",
    route: "Pune → Delhi → Mathura", travel: "Flight ~2h + drive 180 km (~3h) via Yamuna Expressway",
    stay: "Mathura",
    plan: [
      "Morning flight Pune → Delhi (or overnight train Pune → Mathura Jn).",
      "Drive down the Yamuna Expressway; lunch at a highway dhaba.",
      "Evening: Shri Krishna Janmabhoomi, then Yamuna aarti at Vishram Ghat.",
    ],
    taste: "Kachori-jalebi and a box of Brijwasi peda",
  },
  {
    day: 2, place: "vrindavan", title: "Radhe Radhe in Vrindavan",
    route: "Mathura ⇄ Vrindavan", travel: "12 km (~30 min)", stay: "Vrindavan",
    plan: [
      "Opening-time darshan at Banke Bihari (~8:45 am in winter).",
      "Radha Raman, Nidhivan and the lanes of Loi Bazaar.",
      "ISKCON kirtan, Keshi Ghat aarti, then Prem Mandir lit up after dark.",
    ],
    taste: "Govinda's thali, rabri and khurchan",
  },
  {
    day: 3, place: "delhi", title: "Govardhan, then the capital",
    route: "Vrindavan → Govardhan → Delhi", travel: "~190 km (~4h)", stay: "Delhi",
    plan: [
      "Sunrise e-rickshaw parikrama of Govardhan hill (~2.5h).",
      "Drive to Delhi; check in near Connaught Place or Paharganj.",
      "Golden hour at Humayun's Tomb; India Gate and Kartavya Path at night.",
    ],
    taste: "Bangla Sahib langar, chaat at Bengali Market",
  },
  {
    day: 4, place: "delhi", title: "Old Delhi to Qutub",
    route: "Delhi", travel: "Metro day", stay: "Delhi",
    plan: [
      "Rickshaw food walk: Jama Masjid → Chandni Chowk → Khari Baoli spice market.",
      "Red Fort (closed Mondays), then Metro to Qutub Minar.",
      "Evening shopping at Dilli Haat INA or Janpath.",
    ],
    taste: "Paranthe Wali Gali, Old Famous Jalebi Wala, Karim's",
  },
  {
    day: 5, place: "dehradun", title: "Up the new expressway to the Doon",
    route: "Delhi → Dehradun", travel: "~210 km (~2.5–3h)", stay: "Dehradun",
    plan: [
      "Early start on the Delhi–Dehradun Expressway (opened April 2026).",
      "Forest Research Institute campus and museums.",
      "Robber's Cave in the afternoon; Paltan Bazaar at night.",
    ],
    taste: "Ellora's bakery, momos in Clement Town",
  },
  {
    day: 6, place: "haridwar", title: "The Gateway to God",
    route: "Dehradun → Haridwar", travel: "55 km (~1.5h)", stay: "Haridwar",
    plan: [
      "Morning at Mindrolling Monastery or Sahastradhara.",
      "Mansa Devi ropeway and Bara Bazaar.",
      "Sunset Ganga Aarti at Har Ki Pauri — arrive an hour early.",
    ],
    taste: "Mohan ji's puri-aloo, Hoshiyar Puri kheer",
  },
  {
    day: 7, place: "rishikesh", title: "Ashrams and the jade Ganga",
    route: "Haridwar → Rishikesh", travel: "25 km (~45 min)", stay: "Rishikesh (Tapovan)",
    plan: [
      "Morning yoga drop-in class.",
      "Beatles Ashram murals; walk across Ram Jhula.",
      "Parmarth Niketan aarti at sunset.",
    ],
    taste: "Chotiwala thali, café-hopping in Tapovan",
  },
  {
    day: 8, place: "rishikesh", title: "Rapids and waterfalls",
    route: "Rishikesh", travel: "Local", stay: "Rishikesh",
    plan: [
      "Shivpuri white-water rafting (16 km) — morning batch.",
      "Neer Garh waterfall hike or bungee at Mohan Chatti for the brave.",
      "Riverside bonfire / beach evening and early night.",
    ],
    taste: "Banana pancakes and masala chai by the river",
  },
  {
    day: 9, place: "devprayag", title: "Where the Ganga is born",
    route: "Rishikesh → Devprayag → Rudraprayag", travel: "~145 km (~5h)", stay: "Rudraprayag",
    plan: [
      "Climb into the hills along the Ganga gorge.",
      "Sangam darshan and Raghunath ji temple at Devprayag.",
      "Dhari Devi temple en route; Rudraprayag confluence at dusk.",
    ],
    taste: "Gahat dal and rajma-chawal at a valley dhaba",
  },
  {
    day: 10, place: "auli", title: "Into the high Himalaya",
    route: "Rudraprayag → Joshimath → Auli", travel: "~155 km (~6h)", stay: "Auli",
    plan: [
      "Follow the Alaknanda past Karnaprayag and Nandprayag.",
      "Narsingh temple and Jyotirmath at Joshimath.",
      "Drive up to Auli for sunset on Nanda Devi.",
    ],
    taste: "Kafuli with mandua roti and ghee",
  },
  {
    day: 11, place: "auli", title: "Meadows of Gorson Bugyal",
    route: "Auli", travel: "Trek day", stay: "Auli",
    plan: [
      "Sunrise on the slopes.",
      "Gorson Bugyal trek through oak forest to the high meadow.",
      "Artificial lake, or ski lessons in season (Jan–Mar).",
    ],
    taste: "Jhangora kheer and slope-side Maggi",
  },
  {
    day: 12, place: "kausani", title: "Garhwal to Kumaon",
    route: "Auli → Karnaprayag → Gwaldam → Baijnath → Kausani", travel: "~210 km (~8–9h)", stay: "Kausani",
    plan: [
      "Leave by 7 am; tea break at Karnaprayag confluence.",
      "Cross into Kumaon at Gwaldam; Baijnath temples by the Gomti.",
      "Arrive Kausani for the evening glow on Trishul.",
    ],
    taste: "Kumaoni thali with bhatt dal",
  },
  {
    day: 13, place: "almora", title: "Almora's ridge and Kasar Devi",
    route: "Kausani → Almora", travel: "52 km (~2h)", stay: "Almora / Kasar Devi",
    plan: [
      "Sunrise panorama, Anasakti Ashram, shawl factory.",
      "Lala Bazaar, Nanda Devi temple; copper and aipan shopping.",
      "Sunset at Kasar Devi (or half-day to Jageshwar instead).",
    ],
    taste: "Bal mithai and singori",
  },
  {
    day: 14, place: "nainital", title: "Kainchi Dham and the lake",
    route: "Almora → Kainchi Dham → Nainital", travel: "~65 km (~2.5h)", stay: "Nainital",
    plan: [
      "Morning darshan at Kainchi Dham (go early to avoid crowds).",
      "Bhowali fruit market; arrive Nainital by lunch.",
      "Boating on Naini Lake, Naina Devi temple, Mall Road at night.",
    ],
    taste: "Sakley's pastries, bun-tikki on the Mall",
  },
  {
    day: 15, place: "nainital", title: "Tiffin Top and home",
    route: "Nainital → Pantnagar / Kathgodam → Delhi → Pune", travel: "~70 km to Pantnagar + flights",
    stay: "Home",
    plan: [
      "Sunrise hike to Tiffin Top or the Snow View cable car.",
      "Buy candles and woollens at the Tibetan Market.",
      "Fly Pantnagar → Delhi → Pune (or Kathgodam train to Delhi).",
    ],
    taste: "One last cup of hill tea",
  },
];
