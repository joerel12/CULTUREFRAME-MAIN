const MODULE_DEFINITIONS = [
  { segment: "heritage", label: "Cultural Heritage", icon: "fa-landmark", imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/571/gallery/20251213075615_1cbf3edf.png", description: "Stories, knowledge, and identity documented by the community." },
  { segment: "historical-sites", label: "Historical Sites", icon: "fa-building-columns", imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Mansalay_road_and_public_market.jpg/960px-Mansalay_road_and_public_market.jpg", description: "Places that preserve a visible record of Mansalay's past." },
  { segment: "traditions", label: "Traditions", icon: "fa-hands", imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/488/gallery/20251212033811_fa20c30b.jpg", description: "Practices and knowledge carried across generations." },
  { segment: "events", label: "Cultural Events", icon: "fa-calendar-days", imageUrl: "https://www.travelorientalmindoro.ph/uploads/events/10/gallery/20260209073544_cacbbcf1.png", description: "Community gatherings, programs, and cultural activities." },
  { segment: "attractions", label: "Attractions", icon: "fa-map-location-dot", imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/184/gallery/20251211030638_a75fad4b.jpg", description: "Landscapes and destinations to explore responsibly." },
  { segment: "festivals", label: "Festivals", icon: "fa-masks-theater", imageUrl: "https://www.travelorientalmindoro.ph/uploads/events/10/gallery/20260209073544_cacbbcf1.png", description: "Celebrations rooted in local history and identity." },
  { segment: "local-products", label: "Local Products", icon: "fa-basket-shopping", imageUrl: "/images/products/ramit-textile.jpg", description: "Local craft and livelihood presented with cultural context." }
];

const MODULE_BY_SEGMENT = new Map(MODULE_DEFINITIONS.map(module => [module.segment, module]));
const SEGMENT_BY_KIND = new Map([
  ["HERITAGE", "heritage"],
  ["HISTORICAL_SITE", "historical-sites"],
  ["TRADITION", "traditions"],
  ["EVENT", "events"],
  ["ATTRACTION", "attractions"],
  ["FESTIVAL", "festivals"],
  ["LOCAL_PRODUCT", "local-products"]
]);
const SEGMENT_IMAGES = Object.fromEntries(MODULE_DEFINITIONS.map(module => [module.segment, module.imageUrl]));

const DESTINATION_PHOTOS = new Map([
  ["buktot beach", {
    imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/184/gallery/20251211030638_a75fad4b.jpg",
    imageAlt: "Buktot Beach in Mansalay, Oriental Mindoro",
    imageCredit: "Travel Oriental Mindoro",
    imageSourceUrl: "https://www.travelorientalmindoro.ph/place/buktot-beach"
  }],
  ["casabangan beach and marine protected area", {
    imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/222/gallery/20251211053518_09274ecb.jpg",
    imageAlt: "Casabangan Beach and its forested coastline in Mansalay",
    imageCredit: "Travel Oriental Mindoro",
    imageSourceUrl: "https://www.travelorientalmindoro.ph/place/casabangan-beach-marine-protected-areas"
  }],
  ["mangyan burial cave", {
    imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/484/gallery/20251212033035_9b8a6587.jpg",
    imageAlt: "The sacred coastal islet at Palaypay Cove in Mansalay",
    imageCredit: "Travel Oriental Mindoro",
    imageSourceUrl: "https://www.travelorientalmindoro.ph/place/mangyan-burial-cave"
  }],
  ["mansalay eco park", {
    imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/491/gallery/20251212034452_dd8222a1.jpg",
    imageAlt: "A hillside hut surrounded by greenery at Mansalay Eco Park",
    imageCredit: "Travel Oriental Mindoro",
    imageSourceUrl: "https://www.travelorientalmindoro.ph/place/mansalay-eco-park"
  }],
  ["mt. abenlay eco tour monkey trail", {
    imageUrl: "https://www.travelorientalmindoro.ph/uploads/places/527/gallery/20251212060630_2235c978.jpg",
    imageAlt: "The forested landscape of Mt. Abenlay Eco Tour Monkey Trail",
    imageCredit: "Travel Oriental Mindoro",
    imageSourceUrl: "https://www.travelorientalmindoro.ph/place/mt-abenlay-eco-tour-monkey-trail"
  }]
]);

const MAX_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 8000;

export class VisitorInformationError extends Error {
  constructor(message, { code = "VISITOR_INFORMATION_ERROR", statusCode = 502, cause } = {}) {
    super(message, { cause });
    this.name = "VisitorInformationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const visitorModules = Object.freeze(MODULE_DEFINITIONS.map(module => Object.freeze({ ...module })));

function cleanText(value, maxLength = 20000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function positiveInteger(value, fallback = 1, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function isLocalHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function resolveVisitorInformationUrl(rawUrl = process.env.VISITOR_INFORMATION_URL) {
  if (!rawUrl?.trim()) {
    throw new VisitorInformationError("The Visitor Information service is not configured.", {
      code: "NOT_CONFIGURED",
      statusCode: 503
    });
  }

  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch (error) {
    throw new VisitorInformationError("VISITOR_INFORMATION_URL is not a valid URL.", {
      code: "INVALID_CONFIGURATION",
      statusCode: 503,
      cause: error
    });
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new VisitorInformationError("VISITOR_INFORMATION_URL must be an HTTP(S) URL without embedded credentials.", {
      code: "INVALID_CONFIGURATION",
      statusCode: 503
    });
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !isLocalHostname(url.hostname)) {
    throw new VisitorInformationError("Visitor Information must use HTTPS in production.", {
      code: "INSECURE_CONFIGURATION",
      statusCode: 503
    });
  }

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.search = "";
  url.hash = "";
  return url;
}

function requireModule(segment) {
  const module = MODULE_BY_SEGMENT.get(segment);
  if (!module) {
    throw new VisitorInformationError("Unknown Visitor Information category.", {
      code: "UNKNOWN_MODULE",
      statusCode: 404
    });
  }
  return module;
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
      .slice(0, 30)
      .map(([key, value]) => [cleanText(key, 80), typeof value === "string" ? cleanText(value, 2000) : value])
  );
}

function normalizeItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const kind = cleanText(item.kind, 40).toUpperCase();
  const segment = SEGMENT_BY_KIND.get(kind);
  const slug = cleanText(item.slug, 200);
  const title = cleanText(item.title, 180);
  if (!segment || !title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const payload = normalizePayload(item.payload);
  return {
    id: cleanText(item.id, 100),
    kind,
    segment,
    categoryLabel: MODULE_BY_SEGMENT.get(segment).label,
    title,
    slug,
    summary: cleanText(item.summary, 500),
    description: cleanText(item.description),
    culturalSignificance: cleanText(item.culturalSignificance, 10000),
    historicalBackground: cleanText(item.historicalBackground, 10000),
    location: cleanText(payload.location, 500),
    eventDate: cleanText(payload.eventDate || payload.startDate || payload.date, 100),
    sourceUrl: safeExternalUrl(payload.sourceUrl),
    imageUrl: safeImageUrl(payload.imageUrl || payload.image_url) || SEGMENT_IMAGES[segment] || "/images/placeholders/record-placeholder.svg",
    imageAlt: `${title} in CultureFrame`,
    featured: item.featured === true,
    url: `/discover/${segment}/${encodeURIComponent(slug)}`
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeItem).filter(Boolean).slice(0, 30);
}

function safeExternalUrl(value) {
  try {
    const url = new URL(cleanText(value, 1000));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function safeImageUrl(value) {
  const text = cleanText(value, 1000);
  if (/^\/images\/[a-zA-Z0-9_./-]+$/.test(text) && !text.includes("..")) return text;
  return safeExternalUrl(text);
}

function normalizeDestinations(items, portalUrl) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const id = cleanText(item.id, 100);
    const name = cleanText(item.name, 180);
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    if (!id || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

    const feedbackReturnTo = `/visitor/feedback?location=${encodeURIComponent(id)}`;
    const feedbackUrl = `/visitor/access?returnTo=${encodeURIComponent(feedbackReturnTo)}`;
    const mapUrl = new URL("/locations", portalUrl);
    mapUrl.searchParams.set("focus", id);
    const photo = DESTINATION_PHOTOS.get(name.toLowerCase()) || {};
    return {
      id,
      name,
      category: cleanText(item.category, 100) || "Sightseeing",
      address: cleanText(item.address, 500),
      description: cleanText(item.description, 1000),
      sourceUrl: safeExternalUrl(item.sourceUrl),
      mapUrl: mapUrl.toString(),
      feedbackUrl,
      imageUrl: photo.imageUrl || "",
      imageAlt: photo.imageAlt || "",
      imageCredit: photo.imageCredit || "",
      imageSourceUrl: photo.imageSourceUrl || "",
      imageLicense: photo.imageLicense || "",
      imageLicenseUrl: photo.imageLicenseUrl || ""
    };
  }).filter(Boolean).slice(0, 6);
}

async function requestJson(pathname, query = {}, options = {}) {
  const baseUrl = resolveVisitorInformationUrl(options.baseUrl);
  const apiBase = new URL(baseUrl.toString());
  apiBase.pathname = `${apiBase.pathname.replace(/\/$/, "")}/api/`;
  const url = new URL(pathname.replace(/^\//, ""), apiBase);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    clearTimeout(timeout);
    throw new VisitorInformationError("This Node.js version does not provide fetch().", {
      code: "FETCH_UNAVAILABLE",
      statusCode: 503
    });
  }

  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: controller.signal
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    throw new VisitorInformationError(
      timedOut ? "The Visitor Information service took too long to respond." : "The Visitor Information service is currently unavailable.",
      { code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE", statusCode: 503, cause: error }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new VisitorInformationError(
      response.status === 404 ? "This published Visitor Information record could not be found." : "The Visitor Information service returned an error.",
      { code: response.status === 404 ? "UPSTREAM_NOT_FOUND" : "UPSTREAM_ERROR", statusCode: response.status === 404 ? 404 : 502 }
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!contentType.toLowerCase().includes("application/json") || contentLength > MAX_RESPONSE_BYTES) {
    throw new VisitorInformationError("The Visitor Information service returned an invalid response.", { code: "INVALID_RESPONSE" });
  }

  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
    throw new VisitorInformationError("The Visitor Information response was too large.", { code: "INVALID_RESPONSE" });
  }

  try {
    return { data: JSON.parse(body), portalUrl: baseUrl.origin };
  } catch (error) {
    throw new VisitorInformationError("The Visitor Information service returned invalid JSON.", {
      code: "INVALID_RESPONSE",
      cause: error
    });
  }
}

function normalizeList(data) {
  return {
    items: normalizeItems(data?.items),
    total: Math.max(0, Number(data?.total) || 0),
    page: positiveInteger(data?.page),
    pages: positiveInteger(data?.pages)
  };
}

export const visitorInformationClient = {
  async getHome(options = {}) {
    const { data, portalUrl } = await requestJson("home", {}, options);
    const content = data?.content && typeof data.content === "object" && !Array.isArray(data.content) ? data.content : {};
    return {
      portalUrl,
      content: {
        heroTitle: cleanText(content.heroTitle, 180) || "Discover the Living Heritage of Mansalay",
        heroDescription: cleanText(content.heroDescription, 500) || "Explore published community stories, traditions, events, and places.",
        about: cleanText(content.about, 1000)
      },
      featured: normalizeItems(data?.featured),
      upcoming: normalizeItems(data?.upcoming),
      destinations: normalizeDestinations(data?.destinations, portalUrl)
    };
  },

  async getList(segment, { q = "", page = 1, limit = 12, ...options } = {}) {
    requireModule(segment);
    const { data, portalUrl } = await requestJson(segment, {
      q: cleanText(q, 100),
      page: positiveInteger(page),
      limit: positiveInteger(limit, 12, 30)
    }, options);
    return { ...normalizeList(data), portalUrl };
  },

  async search({ q = "", category = "", page = 1, limit = 12, ...options } = {}) {
    if (category) requireModule(category);
    const { data, portalUrl } = await requestJson("search", {
      q: cleanText(q, 100),
      category,
      page: positiveInteger(page),
      limit: positiveInteger(limit, 12, 30)
    }, options);
    return { ...normalizeList(data), portalUrl };
  },

  async getDetail(segment, slug, options = {}) {
    requireModule(segment);
    const safeSlug = cleanText(slug, 200);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(safeSlug)) {
      throw new VisitorInformationError("Invalid Visitor Information record.", { code: "INVALID_SLUG", statusCode: 404 });
    }
    const { data, portalUrl } = await requestJson(`${segment}/${encodeURIComponent(safeSlug)}`, {}, options);
    const item = normalizeItem(data?.item);
    if (!item || item.segment !== segment) {
      throw new VisitorInformationError("This published Visitor Information record could not be found.", {
        code: "UPSTREAM_NOT_FOUND",
        statusCode: 404
      });
    }
    return { item, portalUrl };
  }
};
