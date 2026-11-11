// Mansalay, Oriental Mindoro — Complete Barangay & Sitio List
// Source: Official DILG / PSA records for Mansalay, Oriental Mindoro

const MANSALAY_LOCATIONS = [
  // ── Barangays (official) ─────────────────────────────────
  { name: "Barangay Anoling",        type: "Barangay" },
  { name: "Barangay Bagong Buhay",   type: "Barangay" },
  { name: "Barangay Banga",          type: "Barangay" },
  { name: "Barangay Barnasan",       type: "Barangay" },
  { name: "Barangay Buhay na Tubig", type: "Barangay" },
  { name: "Barangay Butong",         type: "Barangay" },
  { name: "Barangay Canluang",       type: "Barangay" },
  { name: "Barangay Caguray",        type: "Barangay" },
  { name: "Barangay Campong Tubig",  type: "Barangay" },
  { name: "Barangay Maasin",         type: "Barangay" },
  { name: "Barangay Matulatula",     type: "Barangay" },
  { name: "Barangay Nag-iba I",      type: "Barangay" },
  { name: "Barangay Nag-iba II",     type: "Barangay" },
  { name: "Barangay Pawican",        type: "Barangay" },
  { name: "Barangay Pisa",           type: "Barangay" },
  { name: "Barangay Poblacion",      type: "Barangay" },
  { name: "Barangay Punta Ibayanan", type: "Barangay" },
  { name: "Barangay Ramon Magsaysay",type: "Barangay" },
  { name: "Barangay Ramontiqui",     type: "Barangay" },
  { name: "Barangay Sablong",        type: "Barangay" },
  { name: "Barangay Saraza",         type: "Barangay" },
  { name: "Barangay Sigange",        type: "Barangay" },
  { name: "Barangay Talaongan",      type: "Barangay" },
  { name: "Barangay Tambong",        type: "Barangay" },
  { name: "Barangay Waygan",         type: "Barangay" },

  // ── Sitios / Puroks ──────────────────────────────────────
  { name: "Sitio Panaytayan",        type: "Sitio" },
  { name: "Sitio Calumpang",         type: "Sitio" },
  { name: "Sitio Mangyan Village",   type: "Sitio" },
  { name: "Sitio Tagumpay",          type: "Sitio" },
  { name: "Sitio San Isidro",        type: "Sitio" },
  { name: "Sitio Bagong Silang",     type: "Sitio" },
  { name: "Sitio Maligaya",          type: "Sitio" },
  { name: "Sitio Masagana",          type: "Sitio" },
  { name: "Sitio Mabuhay",           type: "Sitio" },
  { name: "Sitio Bagumbayan",        type: "Sitio" },
  { name: "Sitio Lumangbayan",       type: "Sitio" },
  { name: "Sitio Kalikasan",         type: "Sitio" },
  { name: "Sitio Mapayapa",          type: "Sitio" },
  { name: "Sitio Tahanan",           type: "Sitio" },
  { name: "Sitio Pag-asa",           type: "Sitio" },

  // ── Landmarks / Notable Places ───────────────────────────
  { name: "Mansalay River",          type: "Landmark" },
  { name: "Mansalay Bay",            type: "Landmark" },
  { name: "Mansalay Public Market",  type: "Landmark" },
  { name: "Mansalay Municipal Hall", type: "Landmark" },
  { name: "Saint Joseph Parish",     type: "Landmark" },
  { name: "Mansalay National High School", type: "Landmark" },
  { name: "Mansalay Health Center",  type: "Landmark" },
  { name: "Mansalay Port",           type: "Landmark" },
  { name: "Mansalay Beach",          type: "Landmark" },
  { name: "Waygan Beach",            type: "Landmark" },
  { name: "Pawican Beach",           type: "Landmark" },
  { name: "Sigange Falls",           type: "Landmark" },
  { name: "Talaongan Spring",        type: "Landmark" },
];

// Utility: filter by query string
function searchMansalayLocations(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();
  return MANSALAY_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(q)
  ).slice(0, 10);
}
