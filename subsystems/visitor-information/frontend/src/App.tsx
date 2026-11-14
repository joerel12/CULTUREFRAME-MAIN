import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowRight, BookOpen, Bookmark, BookmarkCheck, CalendarDays, Camera, Check, ChevronDown, Compass, Feather, Globe2, Leaf, MapPin, Menu, Search, ShieldCheck, ShoppingBag, Sparkles, UserRound, X } from "lucide-react";
import { api, apiAssetUrl, ApiError } from "./api";

type User = { id: string; firstName: string; lastName: string; email: string; role: "ADMIN" | "VISITOR" };
type RecordItem = { id: string; kind: string; title: string; slug: string; summary: string; description: string; culturalSignificance?: string; historicalBackground?: string; payload?: Record<string, unknown>; publicationStatus?: string; featured?: boolean };
type ListResult = { items: RecordItem[]; total?: number; pages?: number; page?: number };
type LocationItem = { id: string; name: string; category: string; address: string; description: string; sourceUrl: string | null; latitude: number | null; longitude: number | null; verified: boolean; feedbackRadiusMeters: number };
type GeofenceResult = {
  allowed: boolean;
  verificationToken?: string;
  location?: { id: string; name: string };
  distanceMeters?: number;
  accuracyMeters?: number;
  radiusMeters?: number;
  expiresAt?: string;
  message: string;
};
const MAIN_SYSTEM_URL = import.meta.env.VITE_MAIN_SYSTEM_URL ?? "http://localhost:3000";
const mainSystemUrl = (path: string) => new URL(path, MAIN_SYSTEM_URL).toString();
const safeLocalPath = (value: string | null) => value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
const customerAccessUrl = (returnTo = "/") => {
  const url = new URL("/visitor/access", MAIN_SYSTEM_URL);
  url.searchParams.set("returnTo", safeLocalPath(returnTo));
  return url.toString();
};
const menu = [
  ["Heritage", "/heritage"], ["Historical sites", "/historical-sites"], ["Traditions", "/traditions"],
  ["Events", "/events"], ["Attractions", "/attractions"], ["Festivals", "/festivals"],
  ["Local products", "/local-products"], ["Gallery", "/gallery"], ["Locations", "/locations"],
  ["Share feedback", "/visitor/feedback"]
];
const kindForPath: Record<string, string> = {
  heritage: "HERITAGE", "historical-sites": "HISTORICAL_SITE", traditions: "TRADITION", events: "EVENT",
  attractions: "ATTRACTION", festivals: "FESTIVAL", "local-products": "LOCAL_PRODUCT"
};
const titleForPath: Record<string, string> = {
  heritage: "Cultural heritage", "historical-sites": "Historical sites", traditions: "Local traditions",
  events: "Cultural events", attractions: "Explore Mansalay", festivals: "Festivals", "local-products": "Local products"
};
const introForPath: Record<string, string> = {
  heritage: "Meet the people, knowledge, language, and cultural institutions that shape Mansalay's living identity.",
  "historical-sites": "Follow the places and turning points behind Mansalay's formation, civic history, and community memory.",
  traditions: "Learn about weaving, ambahan, Surat Mangyan, indigenous games, and community practices carried across generations.",
  events: "Plan around cultural programs, civic anniversaries, community gatherings, and respectful opportunities to participate.",
  attractions: "Get introduced to Mansalay's beaches, eco-trails, cultural places, and community-led destinations before you visit.",
  festivals: "Understand Pamugu-an, the official Mangyan Festival, and the different roles these celebrations hold in Mansalay.",
  "local-products": "Discover textiles, basketry, beadwork, and educational keepsakes, then purchase through the unified CultureFrame marketplace."
};
const fmtKind = (kind: string) => kind.toLowerCase().replace(/_/g, " ");
const adminSections = [
  { key: "dashboard", label: "Dashboard", path: "dashboard" },
  { key: "HERITAGE", label: "Heritage", path: "heritage" },
  { key: "HISTORICAL_SITE", label: "Historical sites", path: "historical-sites" },
  { key: "TRADITION", label: "Traditions", path: "traditions" },
  { key: "EVENT", label: "Events", path: "events" },
  { key: "ATTRACTION", label: "Attractions", path: "attractions" },
  { key: "FESTIVAL", label: "Festivals", path: "festivals" },
  { key: "LOCAL_PRODUCT", label: "Local products", path: "local-products" },
  { key: "homepage", label: "Homepage", path: "homepage" },
  { key: "media", label: "Media library", path: "media" },
  { key: "locations", label: "Locations", path: "locations" },
  { key: "feedback", label: "Feedback", path: "feedback" },
  { key: "audit-logs", label: "Audit logs", path: "audit-logs" }
];
const heritagePhotos = [
  {
    title: "Buktot Beach",
    category: "Coastal landscape · Barangay Manaul",
    description: "A documented Mansalay coastal place, photographed after a light shower.",
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Buktot_Beach%2C_Mansalay_in_the_afternoon_%28The_Wandering_Angel%29_-_Flickr.jpg/960px-Buktot_Beach%2C_Mansalay_in_the_afternoon_%28The_Wandering_Angel%29_-_Flickr.jpg",
    alt: "Buktot Beach in Mansalay, Oriental Mindoro, after a light shower",
    credit: "The Wandering Angel",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Buktot_Beach,_Mansalay_in_the_afternoon_(The_Wandering_Angel)_-_Flickr.jpg"
  },
  {
    title: "Mansalay Public Market",
    category: "Town life · Mansalay",
    description: "A view of a Mansalay road with the public market in the background.",
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Mansalay_road_and_public_market.jpg/960px-Mansalay_road_and_public_market.jpg",
    alt: "Road in Mansalay with the public market in the background",
    credit: "Hariboneagle927",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mansalay_road_and_public_market.jpg"
  }
];
const buktotPhoto = heritagePhotos[0];
type SourcedPhoto = { image: string; alt: string; credit: string; sourceUrl: string; license?: string; licenseUrl?: string };
const destinationPhotos: Record<string, SourcedPhoto> = {
  "buktot beach": {
    image: "https://www.travelorientalmindoro.ph/uploads/places/184/gallery/20251211030638_a75fad4b.jpg",
    alt: "Buktot Beach in Mansalay, Oriental Mindoro",
    credit: "Travel Oriental Mindoro",
    sourceUrl: "https://www.travelorientalmindoro.ph/place/buktot-beach"
  },
  "casabangan beach and marine protected area": {
    image: "https://www.travelorientalmindoro.ph/uploads/places/222/gallery/20251211053518_09274ecb.jpg",
    alt: "Casabangan Beach and its forested coastline in Mansalay",
    credit: "Travel Oriental Mindoro",
    sourceUrl: "https://www.travelorientalmindoro.ph/place/casabangan-beach-marine-protected-areas"
  },
  "mangyan burial cave": {
    image: "https://www.travelorientalmindoro.ph/uploads/places/484/gallery/20251212033035_9b8a6587.jpg",
    alt: "The sacred coastal islet at Palaypay Cove in Mansalay",
    credit: "Travel Oriental Mindoro",
    sourceUrl: "https://www.travelorientalmindoro.ph/place/mangyan-burial-cave"
  },
  "mansalay eco park": {
    image: "https://www.travelorientalmindoro.ph/uploads/places/491/gallery/20251212034452_dd8222a1.jpg",
    alt: "A hillside hut surrounded by greenery at Mansalay Eco Park",
    credit: "Travel Oriental Mindoro",
    sourceUrl: "https://www.travelorientalmindoro.ph/place/mansalay-eco-park"
  },
  "mt. abenlay eco tour monkey trail": {
    image: "https://www.travelorientalmindoro.ph/uploads/places/527/gallery/20251212060630_2235c978.jpg",
    alt: "The forested landscape of Mt. Abenlay Eco Tour Monkey Trail",
    credit: "Travel Oriental Mindoro",
    sourceUrl: "https://www.travelorientalmindoro.ph/place/mt-abenlay-eco-tour-monkey-trail"
  }
};
const experienceArt = {
  heritageCenter: "/images/experiences/heritage-center-art.png",
  mansalayHistory: "/images/experiences/mansalay-history-art.png",
  hanunuoWeaving: "/images/experiences/hanunuo-weaving-art.png",
  mangyanFestival: "/images/experiences/mangyan-festival-art.png",
  pamuguanMarket: "/images/experiences/pamuguan-market-art.png",
  palaroNgLahi: "/images/experiences/palaro-ng-lahi-art.png"
} as const;
const fallbackImages: Record<string, string> = {
  HERITAGE: experienceArt.heritageCenter,
  HISTORICAL_SITE: experienceArt.mansalayHistory,
  TRADITION: experienceArt.hanunuoWeaving,
  EVENT: experienceArt.palaroNgLahi,
  ATTRACTION: destinationPhotos["buktot beach"].image,
  FESTIVAL: experienceArt.mangyanFestival,
  LOCAL_PRODUCT: "/images/products/ramit-textile.jpg"
};
const recordArtwork: Record<string, string> = {
  "oriental-mindoro-heritage-and-cultural-center": experienceArt.heritageCenter,
  "mansalay-town-formation-and-founding": experienceArt.mansalayHistory,
  "mansalay-founding-anniversary": experienceArt.mansalayHistory,
  "hanunuo-mangyan-weaving": experienceArt.hanunuoWeaving,
  "mangyan-festival": experienceArt.mangyanFestival,
  "mangyan-festival-cultural-program": experienceArt.mangyanFestival,
  "pamugu-an-festival": experienceArt.pamuguanMarket,
  "pamugu-an-cultural-week": experienceArt.pamuguanMarket,
  "palaro-ng-lahi-mansalay": experienceArt.palaroNgLahi,
  "barakalan-native-products-market": experienceArt.pamuguanMarket
};
const recordImage = (item: RecordItem) => recordArtwork[item.slug]
  ?? destinationPhotos[item.title.toLowerCase()]?.image
  ?? (typeof item.payload?.imageUrl === "string" && item.payload.imageUrl ? item.payload.imageUrl : undefined)
  ?? fallbackImages[item.kind]
  ?? "/images/placeholders/record-placeholder.svg";
const categoryImages: Record<string, string> = {
  "/heritage": experienceArt.heritageCenter,
  "/historical-sites": experienceArt.mansalayHistory,
  "/traditions": experienceArt.hanunuoWeaving,
  "/events": experienceArt.palaroNgLahi,
  "/attractions": destinationPhotos["buktot beach"].image,
  "/festivals": experienceArt.mangyanFestival,
  "/local-products": "/images/products/ramit-textile.jpg",
  "/gallery": heritagePhotos[1].image
};
const culturePromotions = [
  {
    eyebrow: "Traditionally the third week of October",
    title: "Pamugu-an Festival",
    copy: "Learn about the Mangyan community reunion, Palaro ng Lahi, cultural presentations, product demonstrations, and Barakalan native-products market.",
    image: experienceArt.pamuguanMarket,
    alt: "Illustration of a Pamugu-an native-products market and community gathering",
    credit: "CultureFrame original artwork",
    sourceUrl: experienceArt.pamuguanMarket,
    to: "/festivals/pamugu-an-festival",
    cta: "Read the introduction"
  },
  {
    eyebrow: "Every November 25",
    title: "Mangyan Festival",
    copy: "Celebrate Mansalay's official festival through indigenous dances, traditional crafts, tribal rituals, and community heritage presentations.",
    image: experienceArt.mangyanFestival,
    alt: "Illustration of Mangyan Festival dancers and community celebration",
    credit: "CultureFrame original artwork",
    sourceUrl: experienceArt.mangyanFestival,
    to: "/festivals",
    cta: "Explore festivals"
  },
  {
    eyebrow: "Living tradition",
    title: "Hanunuo Mangyan weaving",
    copy: "Meet the living knowledge behind ramit textiles and support the skill, patience, and identity carried through generations of local makers.",
    image: experienceArt.hanunuoWeaving,
    alt: "Illustration of Hanunuo Mangyan ramit weaving",
    credit: "CultureFrame original artwork",
    sourceUrl: experienceArt.hanunuoWeaving,
    to: "/traditions",
    cta: "Discover traditions"
  },
  {
    eyebrow: "Culture and learning",
    title: "Heritage & Cultural Center",
    copy: "Visit a Mansalay landmark dedicated to preserving and presenting the art, works, and cultural heritage of Mindoro's Mangyan communities.",
    image: experienceArt.heritageCenter,
    alt: "Illustration of a Mansalay heritage center exhibition",
    credit: "CultureFrame original artwork",
    sourceUrl: experienceArt.heritageCenter,
    to: "/heritage",
    cta: "Explore heritage"
  }
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => { api<{ user: User | null }>("/auth/me").then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setReady(true)); }, []);
  const logout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    try {
      await api("/auth/logout", { method: "POST" });
      const wasCustomer = user?.role === "VISITOR";
      setUser(null);
      queryClient.clear();
      window.location.assign(wasCustomer ? mainSystemUrl("/logout") : "/");
    } catch (issue) {
      window.alert(`Could not sign out: ${(issue as Error).message}`);
    }
  };
  if (!ready) return <div className="boot"><span className="brand-mark">C</span><p>Opening CultureFrame…</p></div>;
  return <>
    <header className="nav-wrap">
      <Link to="/" className="brand"><span className="brand-mark">C</span><span>Culture<span className="gold">Frame</span><small>MANSALAY · ORIENTAL MINDORO</small></span></Link>
      <button className="icon-btn menu-toggle" aria-label="Toggle navigation" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button>
      <nav className={mobileOpen ? "nav-links open" : "nav-links"}>
        <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
        <div className="nav-dropdown"><button>Discover <ChevronDown size={14}/></button><div className="dropdown-panel">{menu.map(([label, path]) => <Link key={path} to={path} onClick={() => setMobileOpen(false)}>{label}</Link>)}</div></div>
        <a href={mainSystemUrl("/shop")} onClick={() => setMobileOpen(false)}>Marketplace</a>
        <Link to="/about">About</Link>
        <Link to="/search" aria-label="Search"><Search size={17}/></Link>
        {user?.role === "ADMIN" ? <><Link className="nav-pill" to="/admin/dashboard">Admin dashboard</Link><button className="nav-text" onClick={logout}>Sign out</button></>
          : user?.role === "VISITOR" ? <><Link className="nav-pill" to="/account"><UserRound size={15}/> My CultureFrame</Link><button className="nav-text" onClick={logout}>Sign out</button></>
          : <a className="nav-pill" href={customerAccessUrl("/")}><UserRound size={15}/> Customer sign in</a>}
      </nav>
    </header>
    <AnimatePresence mode="wait"><Routes>
      <Route path="/" element={<Home user={user}/>}/>
      <Route path="/about" element={<About/>}/>
      <Route path="/login" element={<MainAdminAccess/>}/>
      <Route path="/forgot-password" element={<MainAdminAccess/>}/>
      <Route path="/reset-password" element={<MainAdminAccess/>}/>
      <Route path="/account/connect" element={<ConnectAccount onUser={setUser}/>}/>
      <Route path="/account" element={<AccountPage user={user}/>}/>
      <Route path="/search" element={<SearchPage/>}/>
      {menu.slice(0, 7).map(([_, path]) => {
        const segment = path.slice(1);
        return <Route key={path} path={path} element={<ListingPage segment={segment}/>}/>;
      })}
      {menu.slice(0, 7).map(([_, path]) => <Route key={`${path}-detail`} path={`${path}/:slug`} element={<DetailPage segment={path.slice(1)}/>}/>)}
      <Route path="/gallery" element={<GalleryPage/>}/>
      <Route path="/locations" element={<LocationsPage user={user}/>}/>
      <Route path="/privacy" element={<PolicyPage title="Privacy policy"/>}/>
      <Route path="/terms" element={<PolicyPage title="Terms and conditions"/>}/>
      <Route path="/visitor/feedback" element={<FeedbackPage user={user}/>}/>
      <Route path="/admin/*" element={<Protected user={user}><AdminPage/></Protected>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes></AnimatePresence>
    <Footer/>
  </>;
}

function Protected({ user, children }: { user: User | null; children: ReactNode }) {
  if (!user || user.role !== "ADMIN") return <Navigate to="/login" replace/>;
  return <>{children}</>;
}

function useSavedLocations(user: User | null) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState("");
  const enabled = user?.role === "VISITOR";
  const query = useQuery({
    queryKey: ["saved-locations"],
    enabled,
    queryFn: () => api<{ items: LocationItem[]; savedLocationIds: string[] }>("/visitor/saved-locations")
  });
  const savedIds = new Set(query.data?.savedLocationIds ?? []);
  const toggle = async (place: LocationItem) => {
    if (!enabled) {
      window.location.assign(customerAccessUrl("/locations"));
      return;
    }
    setSavingId(place.id);
    try {
      await api(`/visitor/saved-locations/${encodeURIComponent(place.id)}`, { method: savedIds.has(place.id) ? "DELETE" : "POST" });
      await queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
    } catch (issue) {
      window.alert((issue as Error).message || "The destination could not be saved. Please try again.");
    } finally {
      setSavingId("");
    }
  };
  return { ...query, savedIds, savingId, toggle };
}

function SavePlaceButton({ place, saved, busy, onToggle }: { place: LocationItem; saved: boolean; busy: boolean; onToggle: (place: LocationItem) => void }) {
  return <button type="button" className={`save-place-button ${saved ? "is-saved" : ""}`} onClick={() => onToggle(place)} disabled={busy} aria-pressed={saved}>
    {saved ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>} {busy ? "Saving…" : saved ? "Saved for later" : "Want to visit"}
  </button>;
}

function AccountPage({ user }: { user: User | null }) {
  const saved = useSavedLocations(user);
  if (!user || user.role !== "VISITOR") {
    return <main className="page-shell account-workspace-shell"><section className="account-required glass"><span className="account-required-icon"><UserRound/></span><div className="section-kicker">One Customer and Visitor workspace</div><h1>Use one CultureFrame account for everything.</h1><p>Sign in once to explore Mansalay, shop local products, manage your cart and wishlist, track orders, share moments, and submit GPS-verified ratings.</p><div className="account-required-actions"><a className="button button-gold" href={customerAccessUrl("/account")}>Continue with CultureFrame <ArrowRight size={16}/></a><a className="button button-dark" href={mainSystemUrl("/register")}>Create one account</a></div></section></main>;
  }

  const customerLinks = [
    { title: "Marketplace", copy: "Browse Mangyan textiles, basketry, beadwork, and cultural keepsakes.", href: mainSystemUrl("/shop"), icon: ShoppingBag, tone: "gold" },
    { title: "Cart", copy: "Review quantities and continue to the integrated checkout.", href: mainSystemUrl("/cart"), icon: ShoppingBag, tone: "green" },
    { title: "Wishlist", copy: "Save local products and return to them later.", href: mainSystemUrl("/wishlist"), icon: Leaf, tone: "rose" },
    { title: "My orders", copy: "Track purchases, payment status, and fulfillment.", href: mainSystemUrl("/customer/orders"), icon: BookOpen, tone: "blue" },
  ];
  const visitorLinks = [
    { title: "Explore places", copy: "Beaches, eco-trails, cultural centers, and community-led destinations.", to: "/locations", icon: Compass },
    { title: "Events and festivals", copy: "Pamugu-an, Mangyan Festival, anniversaries, and cultural programs.", to: "/events", icon: CalendarDays },
    { title: "Heritage and traditions", copy: "Ambahan, Surat Mangyan, weaving, history, and local knowledge.", to: "/heritage", icon: Feather },
    { title: "Rate a visited place", copy: "Submit feedback only after GPS confirms that you are on site.", to: "/visitor/feedback", icon: ShieldCheck },
  ];

  return <main className="page-shell account-workspace-shell">
    <section className="account-workspace-hero">
      <div><span className="eyebrow"><span/> One account · one workspace</span><h1>Welcome, {user.firstName}.</h1><p>Buy from local makers and explore Mansalay as a visitor without changing accounts or signing in again.</p></div>
      <div className="account-identity"><span className="account-avatar">{user.firstName.slice(0, 1).toUpperCase()}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></div><a href={mainSystemUrl("/customer/profile/edit")}>Edit profile</a></div>
    </section>

    <section className="account-workspace-section">
      <div className="account-section-heading"><div><span>Shop and manage purchases</span><h2>Your marketplace</h2></div><a href={mainSystemUrl("/shop")}>Browse all products <ArrowRight size={15}/></a></div>
      <div className="account-commerce-grid">{customerLinks.map(({ title, copy, href, icon: Icon, tone }) => <a className={`account-action-card tone-${tone}`} href={href} key={title}><span><Icon/></span><div><h3>{title}</h3><p>{copy}</p></div><ArrowRight/></a>)}</div>
    </section>

    <section className="account-workspace-section">
      <div className="account-section-heading"><div><span>Plan, learn, and participate</span><h2>Your visitor guide</h2></div><Link to="/search">Search CultureFrame <ArrowRight size={15}/></Link></div>
      <div className="account-visitor-grid">{visitorLinks.map(({ title, copy, to, icon: Icon }) => <Link className="account-visitor-card" to={to} key={title}><Icon/><div><h3>{title}</h3><p>{copy}</p></div><ArrowRight/></Link>)}</div>
    </section>

    <section className="account-workspace-section">
      <div className="account-section-heading"><div><span>Your travel shortlist</span><h2>Places you want to visit</h2></div><Link to="/locations">Explore the 3D map <ArrowRight size={15}/></Link></div>
      {saved.data?.items.length ? <div className="saved-place-grid">{saved.data.items.map((place) => {
        const photo = destinationPhotos[place.name.toLowerCase()] ?? buktotPhoto;
        return <article className="saved-place-card" key={place.id}><img src={photo.image} alt={photo.alt} onError={(event) => { event.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/><div><span>{place.category}</span><h3>{place.name}</h3><p>{place.address}</p><div><Link to={`/locations?focus=${encodeURIComponent(place.id)}`}>View on map</Link><SavePlaceButton place={place} saved busy={saved.savingId === place.id} onToggle={saved.toggle}/></div></div></article>;
      })}</div> : <div className="saved-place-empty"><Bookmark/><div><h3>No saved destinations yet</h3><p>Use “Want to visit” on a location card to build your Mansalay itinerary.</p></div><Link className="button button-dark" to="/locations">Find places</Link></div>}
    </section>

    <section className="account-community-band"><div><span>Share your experience</span><h2>Keep your Mansalay memories in the same account.</h2><p>Post a moment, review your shared photos, or continue exploring the cultural archive.</p></div><div><a className="button button-gold" href={mainSystemUrl("/customer/moment/new")}><Camera size={16}/> Post a moment</a><a className="button button-glass" href={mainSystemUrl("/customer/moments")}>My moments</a></div></section>
  </main>;
}

function Home({ user }: { user: User | null }) {
  const { data, error } = useQuery({ queryKey: ["home"], queryFn: () => api<{ content: Record<string, string>; featured: RecordItem[]; upcoming: RecordItem[]; destinations: LocationItem[] }>("/home") });
  const saved = useSavedLocations(user);
  return <main>
    <section className="hero">
      <div className="hero-shape shape-one"/><div className="hero-shape shape-two"/>
      <div className="hero-image-note"><MapPin size={14}/> Mansalay, Oriental Mindoro, Philippines</div>
      <motion.div className="hero-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
        <span className="eyebrow"><span/> A living archive of place and people</span>
        <h1>{data?.content?.heroTitle ?? "Discover the Living Heritage of Mansalay"}</h1>
        <p>{data?.content?.heroDescription ?? "Explore the traditions, stories, and places documented by the CultureFrame community."}</p>
        <div className="button-row"><Link className="button button-gold" to="/heritage">Explore heritage <ArrowRight size={17}/></Link><a className="button button-glass" href={mainSystemUrl("/shop")}><ShoppingBag size={16}/> Shop local products</a></div>
      </motion.div>
      <div className="hero-photo-credit">Buktot Beach photo: <a href={buktotPhoto.sourceUrl} target="_blank" rel="noreferrer">{buktotPhoto.credit}</a> <span>·</span> <a href={buktotPhoto.licenseUrl} target="_blank" rel="noreferrer">{buktotPhoto.license}</a> <span>·</span> cropped for layout</div>
      <div className="hero-bottom"><span>13°31′ N&nbsp; · &nbsp;121°26′ E</span><a href="#intro">Scroll to explore <ArrowDown size={14}/></a></div>
    </section>
    {error && <div className="home-api-error"><ErrorPanel message={(error as Error).message}/></div>}
    <section className="section intro-section" id="intro">
      <div className="section-kicker">A place with stories</div><div className="intro-grid">
        <h2>Rooted in place.<br/><em>Shared with the world.</em></h2>
        <div><p>{data?.content?.about ?? "CultureFrame is a community-focused information portal for documenting cultural heritage in Mansalay, Oriental Mindoro. Explore records, stories, and local knowledge as they are carefully gathered and verified."}</p><Link className="text-link" to="/about">Learn about CultureFrame <ArrowRight size={16}/></Link></div>
      </div>
    </section>
    <section className="section unified-platform-section">
      <div className="unified-platform-panel">
        <div className="unified-platform-copy"><div className="section-kicker">One CultureFrame customer account</div><h2>Explore, rate, and shop<br/><em>without another visitor login.</em></h2><p>Your main CultureFrame account now carries into the visitor experience. Use the same account for your profile, cart, orders, wishlist, and verified on-site feedback.</p><a className="button button-gold" href={customerAccessUrl("/visitor/feedback")}>Connect my account <ArrowRight size={16}/></a></div>
        <div className="unified-platform-actions">
          <Link to="/locations"><span><Compass/></span><div><strong>Plan a visit</strong><small>Explore verified Mansalay destinations</small></div><ArrowRight/></Link>
          <a href={mainSystemUrl("/shop")}><span><ShoppingBag/></span><div><strong>Shop local products</strong><small>Use your main cart, wishlist, and orders</small></div><ArrowRight/></a>
          <Link to="/account"><span><UserRound/></span><div><strong>Open my workspace</strong><small>Shopping, visits, orders, and moments together</small></div><ArrowRight/></Link>
        </div>
      </div>
    </section>
    <section className="section categories-section"><div className="section-heading"><div><div className="section-kicker">Discover more</div><h2>Explore the many layers<br/><em>of Mansalay</em></h2></div><Link to="/search" className="text-link">Browse all records <ArrowRight size={16}/></Link></div>
      <div className="category-grid">{[
        ["01","Cultural heritage","Living knowledge, stories, and identity","/heritage",BookOpen],
        ["02","Historical sites","Places that hold a record of the past","/historical-sites",Compass],
        ["03","Traditions","Practices carried across generations","/traditions",Feather],
        ["04","Cultural events","Gatherings, celebrations, and community life","/events",CalendarDays],
        ["05","Attractions","Places and landscapes to discover","/attractions",MapPin],
        ["06","Festivals","Celebrations rooted in local identity","/festivals",Sparkles],
        ["07","Local products","Craft and livelihood with cultural context","/local-products",Leaf],
        ["08","Photo gallery","A visual record of this place","/gallery",Camera]
      ].map(([number, title, copy, link, Icon]) => {
        const IconComponent = Icon as typeof BookOpen;
        return <Link to={link as string} className="category-card category-card-photo glass" key={number as string}><span className="category-card-image" style={{ backgroundImage: `url(${categoryImages[link as string]})` }}/><span className="category-number">{number as string}</span><IconComponent className="category-icon"/><h3>{title as string}</h3><p>{copy as string}</p><span className="card-arrow"><ArrowRight size={16}/></span></Link>;
      })}</div>
    </section>
    <section className="section destinations-section">
      <div className="section-heading">
        <div><div className="section-kicker">Beaches, nature and culture</div><h2>Popular places<br/><em>around Mansalay</em></h2></div>
        <Link to="/locations" className="text-link">View the destination map <ArrowRight size={16}/></Link>
      </div>
      <p className="destinations-intro">Plan a visit using destinations listed by the Provincial Tourism Office. GPS-ready places can be rated only after CultureFrame confirms that you are on site.</p>
      <div className="destination-grid">
        {(data?.destinations ?? []).map((place, index) => {
          const photo = destinationPhotos[place.name.toLowerCase()] ?? buktotPhoto;
          return <article className="destination-card" key={place.id}>
          <div className={`destination-visual destination-tone-${index % 5} destination-visual-photo`}>
            <img src={photo.image} alt={photo.alt} loading="eager" decoding="async" onError={(event) => { event.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/>
            <span className="destination-category">{place.category}</span>
            <span className="destination-verified"><ShieldCheck size={13}/> GPS verified</span>
          </div>
          <div className="destination-copy">
            <h3>{place.name}</h3>
            <p className="destination-address"><MapPin size={14}/>{place.address}</p>
            <p>{place.description}</p>
            <SavePlaceButton place={place} saved={saved.savedIds.has(place.id)} busy={saved.savingId === place.id} onToggle={saved.toggle}/>
            <div className="destination-actions"><Link to={`/visitor/feedback?location=${encodeURIComponent(place.id)}`}>{user?.role === "VISITOR" ? "Rate on site" : "Sign in to rate"} <ArrowRight size={14}/></Link>{place.sourceUrl && <a href={place.sourceUrl} target="_blank" rel="noreferrer">Official listing</a>}</div>
            {photo && <div className="destination-photo-credit">Image: <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.credit}</a>{photo.license && <> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></>}</div>}
          </div>
        </article>})}
      </div>
      {!data?.destinations?.length && <div className="empty-state glass"><MapPin/><h3>Destination guide coming soon</h3><p>Verified places will appear here after their coordinates and source information are reviewed.</p></div>}
    </section>
    <section className="section culture-promotion-section">
      <div className="section-heading">
        <div><div className="section-kicker">Celebrate living culture</div><h2>Come for the places.<br/><em>Remember the people.</em></h2></div>
        <p className="culture-promotion-lead">Plan your visit around the stories, traditions, and celebrations that make Mansalay distinct—not only its scenery.</p>
      </div>
      <div className="culture-promotion-grid">
        {culturePromotions.map((feature) => <article className="culture-promotion-card" key={feature.title}>
          <div className="culture-promotion-image"><img src={feature.image} alt={feature.alt} loading="eager" decoding="async" onError={(event) => { event.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/><span>{feature.eyebrow}</span></div>
          <div className="culture-promotion-copy"><h3>{feature.title}</h3><p>{feature.copy}</p><div className="culture-promotion-actions"><Link to={feature.to}>{feature.cta} <ArrowRight size={14}/></Link><a href={feature.sourceUrl} target="_blank" rel="noreferrer">Image: {feature.credit}</a></div></div>
        </article>)}
      </div>
    </section>
    <section className="feature-section"><div className="feature-image"><img src={buktotPhoto.image} alt={buktotPhoto.alt} loading="lazy" decoding="async"/><span className="photo-caption">Buktot Beach · Photo: <a href={buktotPhoto.sourceUrl} target="_blank" rel="noreferrer">{buktotPhoto.credit}</a> · <a href={buktotPhoto.licenseUrl} target="_blank" rel="noreferrer">{buktotPhoto.license}</a></span></div><div className="feature-copy"><div className="section-kicker">Explore responsibly</div><h2>Every story deserves<br/><em>its source.</em></h2><p>CultureFrame is a growing information portal. Records are shared with their sources and publication status; culturally sensitive materials are included only with appropriate permission.</p><Link className="button button-dark" to="/locations">Explore locations <ArrowRight size={16}/></Link></div></section>
    <section className="section photo-showcase">
      <div className="section-heading">
        <div><div className="section-kicker">Mansalay, in photographs</div><h2>Places that tell<br/><em>a local story</em></h2></div>
        <Link to="/gallery" className="text-link">Explore the gallery <ArrowRight size={16}/></Link>
      </div>
      <p className="photo-showcase-intro">A first look at documented places in Mansalay. Each photo is credited to its creator and linked to its source and license.</p>
      <div className="heritage-photo-grid">
        {heritagePhotos.map((photo) => <article className="heritage-photo-card" key={photo.title}>
          <a className="heritage-photo-image" href={photo.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View source for ${photo.title}`}>
            <img src={photo.image} alt={photo.alt} loading="lazy" decoding="async"/>
            <span className="photo-image-label">{photo.category}</span>
          </a>
          <div className="heritage-photo-copy">
            <div className="section-kicker">Mansalay heritage</div>
            <h3>{photo.title}</h3>
            <p>{photo.description}</p>
            <div className="photo-attribution">Photo: <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.credit}</a> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></div>
          </div>
        </article>)}
      </div>
    </section>
    <section className="section records-section">
      <div className="section-heading"><div><div className="section-kicker">Gatherings and celebrations</div><h2>Featured events</h2></div><Link to="/events" className="text-link">Explore events <ArrowRight size={16}/></Link></div>
      <RecordGrid items={data?.upcoming ?? []} empty="Upcoming events will appear here when an administrator publishes them."/>
    </section>
    <section className="section records-section"><div className="section-heading"><div><div className="section-kicker">From the archive</div><h2>Featured heritage</h2></div><Link to="/heritage" className="text-link">View all <ArrowRight size={16}/></Link></div><RecordGrid items={data?.featured ?? []} empty="Published records will appear here as they are verified and added." /></section>
    <section className="cta-panel"><Globe2/><div><div className="section-kicker">Help the archive grow</div><h2>Have a story to share?</h2><p>Help us make local knowledge accessible and responsibly documented.</p></div><Link className="button button-gold" to="/visitor/feedback">Share feedback <ArrowRight size={16}/></Link></section>
  </main>;
}

function About() {
  return <main className="page-shell"><div className="page-hero"><div className="section-kicker">About CultureFrame</div><h1>A thoughtful home for<br/><em>Mansalay’s stories.</em></h1><p>A web-based cultural heritage information system designed to preserve, document, and share community knowledge responsibly.</p></div><div className="about-cards"><article className="glass"><ShieldCheck/><h2>Careful documentation</h2><p>Information is published only after administrator review. Sources and image permission details can accompany each record.</p></article><article className="glass"><BookOpen/><h2>Accessible knowledge</h2><p>Browse heritage records, traditions, places, cultural events, and local products through a searchable public portal.</p></article>  <article className="glass"><Sparkles/><h2>Community-led</h2><p>Visitors can browse and submit feedback; administrators maintain, review, and update the collection.</p></article></div></main>;
}

function ListingPage({ segment }: { segment: string }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ["listing", segment, q, page], queryFn: () => api<ListResult>(`/${segment}?q=${encodeURIComponent(q)}&page=${page}`) });
  const updateQuery = (value: string) => { setQ(value); setPage(1); };
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">CultureFrame archive</div><h1>{titleForPath[segment] ?? segment}</h1><p>{introForPath[segment] ?? "Browse published records and explore the stories available in the archive."}</p><label className="search-field"><Search size={18}/><input aria-label="Filter records" placeholder={`Search ${titleForPath[segment]?.toLowerCase() ?? "records"}…`} value={q} onChange={(e) => updateQuery(e.target.value)}/></label></div>{isLoading ? <Loading/> : error ? <ErrorPanel message={(error as Error).message}/> : <><RecordGrid items={data?.items ?? []} empty="No published records yet. Check back as verified records are added."/><Pagination page={data?.page ?? page} pages={data?.pages ?? 1} onPage={setPage}/></>}</main>;
}

function DetailPage({ segment }: { segment: string }) {
  const { slug = "" } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ["detail", segment, slug], queryFn: () => api<{ item: RecordItem }>(`/${segment}/${encodeURIComponent(slug)}`) });
  if (isLoading) return <Loading/>;
  if (error instanceof ApiError && error.status === 404) return <NotFound message="This published record could not be found."/>;
  if (error) return <main className="page-shell"><ErrorPanel message={error.message}/></main>;
  if (!data?.item) return <NotFound message="This published record could not be found."/>;
  const item = data.item;
  const payload = item.payload ?? {};
  return <main className="page-shell detail-shell"><div className="detail-meta"><Link to={`/${segment}`}>← Back to {titleForPath[segment]}</Link><span>{fmtKind(item.kind)}</span></div><article className="detail-article"><div className="section-kicker">{titleForPath[segment]}</div><h1>{item.title}</h1><div className="detail-cover"><img src={recordImage(item)} alt={item.title} loading="eager" decoding="async" onError={(event) => { event.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/></div>{item.summary && <p className="detail-summary">{item.summary}</p>}<div className="detail-divider"/><p className="detail-body">{item.description || "Additional information for this record has not yet been added."}</p>{item.culturalSignificance && <section><h2>Cultural significance</h2><p>{item.culturalSignificance}</p></section>}{item.historicalBackground && <section><h2>Historical background</h2><p>{item.historicalBackground}</p></section>}{typeof payload.eventDate === "string" && <section><h2>When</h2><p>{payload.eventDate}</p></section>}{typeof payload.location === "string" && <section><h2>Location</h2><p>{payload.location}</p></section>}{typeof payload.marketplacePath === "string" && <section className="detail-marketplace"><h2>Available through CultureFrame</h2><p>Continue with the same customer account you use for visitor features, cart, wishlist, checkout, and orders.</p><a className="button button-gold" href={mainSystemUrl(payload.marketplacePath)}>Browse the marketplace <ShoppingBag size={15}/></a></section>}{typeof payload.sourceUrl === "string" && <section><h2>Reference</h2><p><a className="text-link" href={payload.sourceUrl} target="_blank" rel="noreferrer">Open the reference source <ArrowRight size={14}/></a></p></section>}</article></main>;
}

function RecordGrid({ items, empty }: { items: RecordItem[]; empty: string }) {
  if (!items.length) return <div className="empty-state glass"><BookOpen/><h3>The archive is taking shape</h3><p>{empty}</p><Link className="text-link" to="/about">About this project <ArrowRight size={15}/></Link></div>;
  return <div className="record-grid">{items.map((item) => {
    const imageUrl = recordImage(item);
    return <Link to={`/${Object.keys(kindForPath).find((key) => kindForPath[key] === item.kind) ?? "heritage"}/${item.slug}`} className="record-card glass" key={item.id}><div className="record-art record-art-photo"><img src={imageUrl} alt={item.title} loading="eager" decoding="async" onError={(event) => { event.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/><span>{fmtKind(item.kind)}</span></div><div className="record-body"><div className="record-kind">{fmtKind(item.kind)}</div><h3>{item.title}</h3><p>{item.summary || item.description.slice(0, 140)}</p><span className="text-link">Read more <ArrowRight size={14}/></span></div></Link>;
  })}</div>;
}

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [value, setValue] = useState(q);
  useEffect(() => setValue(q), [q]);
  const searchParams = new URLSearchParams({ q, page: String(page) });
  if (category) searchParams.set("category", category);
  const { data, isLoading, error } = useQuery({ queryKey: ["search", q, category, page], queryFn: () => api<ListResult>(`/search?${searchParams.toString()}`), enabled: q.length > 0 });
  const submit = (e: FormEvent) => { e.preventDefault(); setParams(value ? { q: value, ...(category ? { category } : {}) } : {}); };
  const setCategory = (nextCategory: string) => setParams({ ...(q ? { q } : {}), ...(nextCategory ? { category: nextCategory } : {}) });
  const setPageParam = (nextPage: number) => setParams({ q, ...(category ? { category } : {}), page: String(nextPage) });
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">Search the archive</div><h1>Find a story.</h1><form className="search-field" onSubmit={submit}><Search/><input autoFocus aria-label="Search all records" placeholder="Search heritage, places, traditions…" value={value} onChange={(e) => setValue(e.target.value)}/><button className="button button-dark">Search</button></form>{q && <label className="search-filter"><span>Content type</span><select aria-label="Filter by content type" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All content</option>{Object.keys(kindForPath).map((type) => <option key={type} value={type}>{titleForPath[type]}</option>)}</select></label>}</div>{isLoading ? <Loading/> : error ? <ErrorPanel message={(error as Error).message}/> : q && <><p className="results-count">{data?.total ?? 0} result{data?.total === 1 ? "" : "s"} for “{q}”</p><RecordGrid items={data?.items ?? []} empty="No matches. Try a different keyword."/><Pagination page={data?.page ?? page} pages={data?.pages ?? 1} onPage={setPageParam}/></>}</main>;
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Pagination">
    <button className="button button-neutral" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span>Page {page} of {pages}</span>
    <button className="button button-neutral" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}

function GalleryPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["gallery"], queryFn: () => api<{ items: Array<{ id: string; filePath: string; altText: string; caption: string; photographer: string }> }>("/gallery") });
  const [active, setActive] = useState<number | null>(null);
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">Image archive</div><h1>Gallery</h1><p>Images are shown only when their media permission is approved.</p></div>{isLoading ? <Loading/> : error ? <ErrorPanel message={(error as Error).message}/> : data?.items.length ? <div className="gallery-grid">{data.items.map((image, index) => <button className="gallery-item" key={image.id} onClick={() => setActive(index)}><img src={apiAssetUrl(image.filePath)} alt={image.altText} loading="lazy" onError={(e) => { e.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/><span>{image.caption}<small>{image.photographer && `Photo: ${image.photographer}`}</small></span></button>)}</div> : <div className="empty-state glass"><Camera/><h3>No approved images yet</h3><p>Media will appear here after an administrator verifies its attribution and permissions.</p></div>}
    {active !== null && data?.items[active] && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Gallery image"><button className="lightbox-close" onClick={() => setActive(null)} aria-label="Close image"><X/></button><button aria-label="Previous image" onClick={() => setActive((active + data.items.length - 1) % data.items.length)}>‹</button><img src={apiAssetUrl(data.items[active].filePath)} alt={data.items[active].altText} onError={(e) => { e.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/><button aria-label="Next image" onClick={() => setActive((active + 1) % data.items.length)}>›</button></div>}
  </main>;
}

function Places3DMap({ places, focusId }: { places: LocationItem[]; focusId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
  const focused = places.find((place) => place.id === focusId) ?? places[0];
  useEffect(() => {
    const host = containerRef.current;
    if (!host || focused?.latitude == null || focused?.longitude == null) return;
    host.replaceChildren();
    if (!googleMapsApiKey) { setMapState("fallback"); return; }
    setMapState("loading");
    let cancelled = false;
    let renderTimeout: number | undefined;
    const initialize = async () => {
      let script = document.querySelector<HTMLScriptElement>('script[data-cultureframe-google-maps="true"]');
      if (!script) {
        script = document.createElement("script");
        script.dataset.cultureframeGoogleMaps = "true";
        script.async = true;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&v=beta&libraries=maps3d&loading=async`;
        document.head.append(script);
      }
      if (!customElements.get("gmp-map-3d")) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("Google Maps 3D timed out.")), 15_000);
          customElements.whenDefined("gmp-map-3d").then(() => { window.clearTimeout(timeout); resolve(); }, reject);
          script!.addEventListener("error", () => { window.clearTimeout(timeout); reject(new Error("Google Maps could not load.")); }, { once: true });
        });
      }
      if (cancelled) return;
      const map = document.createElement("gmp-map-3d");
      map.setAttribute("center", `${focused.latitude},${focused.longitude},80`);
      map.setAttribute("range", focusId ? "1100" : "2600");
      map.setAttribute("tilt", "67");
      map.setAttribute("heading", "28");
      map.setAttribute("mode", "HYBRID");
      map.setAttribute("gesture-handling", "greedy");
      map.setAttribute("description", `Google 3D view of ${focused.name}`);
      map.className = "google-map-element";
      let failed = false;
      const showFallback = () => {
        if (cancelled || failed) return;
        failed = true;
        window.clearTimeout(renderTimeout);
        host.replaceChildren();
        setMapState("error");
      };
      map.addEventListener("gmp-error", showFallback);
      map.addEventListener("gmp-steadychange", (event) => {
        if (cancelled || failed || !(event as Event & { isSteady?: boolean }).isSteady) return;
        window.clearTimeout(renderTimeout);
        setMapState("ready");
      });
      const marker = document.createElement("gmp-marker-3d");
      marker.setAttribute("position", `${focused.latitude},${focused.longitude},0`);
      marker.setAttribute("altitude-mode", "CLAMP_TO_GROUND");
      marker.setAttribute("label", focused.name);
      map.append(marker);
      host.replaceChildren(map);
      renderTimeout = window.setTimeout(showFallback, 30_000);
    };
    initialize().catch(() => { if (!cancelled) setMapState("error"); });
    return () => { cancelled = true; window.clearTimeout(renderTimeout); host.replaceChildren(); };
  }, [focusId, focused?.id, focused?.latitude, focused?.longitude, focused?.name, googleMapsApiKey]);
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${focused.latitude},${focused.longitude}`)}&z=16&output=embed&layer=s`;
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${focused.latitude},${focused.longitude}`)}`;
  return <div className="map-frame map-frame-3d google-map-frame" id="mansalay-3d-map">
    {mapState !== "ready" && <iframe className="google-map-fallback" src={embedUrl} title={`Google Maps view of ${focused.name}`} loading="eager" referrerPolicy="no-referrer-when-downgrade"/>}
    <div ref={containerRef} className={`google-map-host${mapState === "ready" ? " is-ready" : ""}`}/>
    <div className="map-3d-badge"><Globe2 size={15}/>{mapState === "ready" ? "Google Maps 3D · Hybrid" : `Google Maps · ${focused.name}`}</div>
    <a className="google-map-open" href={externalUrl} target="_blank" rel="noreferrer">Open in Google Maps <ArrowRight size={14}/></a>
    {mapState === "loading" && <div className="map-load-notice" role="status">Loading Google Maps 3D…</div>}
    {mapState === "fallback" && <div className="map-load-notice" role="status">Explore the place in the satellite map. Interactive 3D is temporarily unavailable.</div>}
    {mapState === "error" && <div className="map-load-notice" role="alert">Google 3D could not load. The satellite place preview remains available.</div>}
  </div>;
}

function LocationsPage({ user }: { user: User | null }) {
  const [params, setParams] = useSearchParams();
  const focusId = params.get("focus") ?? "";
  const { data, isLoading, error } = useQuery({ queryKey: ["locations"], queryFn: () => api<{ items: LocationItem[] }>("/locations") });
  const saved = useSavedLocations(user);
  const mapped = data?.items.filter((place) => place.verified && place.latitude != null && place.longitude != null) ?? [];
  const focusOnMap = (place: LocationItem) => {
    setParams({ focus: place.id });
    window.setTimeout(() => document.getElementById("mansalay-3d-map")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">Explore the area</div><h1>Locations</h1><p>Explore verified Mansalay destinations on an interactive 3D terrain map. Save places to your visit list, then use GPS verification only after signing in and arriving on site.</p></div>
    {isLoading ? <Loading/> : error ? <ErrorPanel message={(error as Error).message}/> : <>
      {mapped.length > 0 && <Places3DMap places={mapped} focusId={focusId}/>}
      <div className="location-list">{data?.items.map((place) => {
        const photo = destinationPhotos[place.name.toLowerCase()] ?? buktotPhoto;
        return <article className="location-card glass" key={place.id}><img className="location-card-image" src={photo.image} alt={photo.alt} loading="eager" onError={(event) => { event.currentTarget.src = "/images/placeholders/record-placeholder.svg"; }}/><div className="location-card-copy"><span className="location-category">{place.category}</span><h3>{place.name}</h3><p className="destination-address"><MapPin size={14}/>{place.address}</p><p>{place.description}</p><SavePlaceButton place={place} saved={saved.savedIds.has(place.id)} busy={saved.savingId === place.id} onToggle={saved.toggle}/>{place.verified && place.latitude != null && place.longitude != null ? <div className="location-actions"><button type="button" onClick={() => focusOnMap(place)}>View in 3D <ArrowRight size={14}/></button><Link to={`/visitor/feedback?location=${encodeURIComponent(place.id)}`}>{user?.role === "VISITOR" ? "Verify & rate" : "Sign in to verify"} <ArrowRight size={14}/></Link>{place.sourceUrl && <a target="_blank" rel="noreferrer" href={place.sourceUrl}>Tourism source <ArrowRight size={14}/></a>}</div> : <span className="muted">Map coordinates not verified</span>}</div></article>;
      })}</div>
      {!data?.items.length && <div className="empty-state glass"><MapPin/><h3>No verified locations yet</h3><p>Verified locations added by administrators will be listed here.</p></div>}
    </>}</main>;
}

function Field({ label, name, type = "text", required = false, minLength, defaultValue }: { label: string; name: string; type?: string; required?: boolean; minLength?: number; defaultValue?: string }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span><input name={name} type={type} required={required} minLength={minLength} defaultValue={defaultValue} autoComplete={name === "confirmPassword" ? "new-password" : name === "password" ? "current-password" : name === "email" ? "email" : undefined}/></label>;
}
function FeedbackPage({ user }: { user: User | null }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [verification, setVerification] = useState<GeofenceResult | null>(null);
  const [searchParams] = useSearchParams();
  const [locationId, setLocationId] = useState(searchParams.get("location") ?? "");
  const { data: locations, isLoading: loadingLocations, error: locationsError } = useQuery({
    queryKey: ["locations", "feedback"],
    queryFn: () => api<{ items: LocationItem[] }>("/locations")
  });
  const eligibleLocations = locations?.items.filter((location) =>
    location.verified && location.latitude != null && location.longitude != null
  ) ?? [];

  if (user?.role !== "VISITOR") {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    return <main className="page-shell form-shell"><section className="account-required glass"><span className="account-required-icon"><UserRound/></span><div className="section-kicker">One customer and visitor account</div><h1>Sign in with your main CultureFrame account.</h1><p>Verified ratings are connected to the same customer identity you use for shopping, carts, wishlists, and orders. No separate visitor registration or password is needed.</p><div className="account-required-actions"><a className="button button-gold" href={customerAccessUrl(returnTo)}>Continue with CultureFrame <ArrowRight size={16}/></a><a className="button button-dark" href={mainSystemUrl("/register")}>Create one account</a></div><small><ShieldCheck size={14}/> Your password stays with the main CultureFrame system. The visitor portal receives only a short-lived verified account handoff.</small></section></main>;
  }

  const verifyLocation = async () => {
    setError(""); setMessage(""); setVerification(null);
    if (!locationId) return setError("Choose the heritage site or attraction you are visiting.");
    if (!window.isSecureContext) return setError("GPS verification requires HTTPS, except when using localhost for development.");
    if (!navigator.geolocation) return setError("This browser does not support GPS location.");
    setCheckingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 30_000,
          timeout: 20_000
        });
      });
      const result = await api<GeofenceResult>("/visitor/location-verification", {
        method: "POST",
        body: JSON.stringify({
          locationId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: position.timestamp
        })
      });
      if (!result.allowed || !result.verificationToken) {
        setError(result.message);
        return;
      }
      setVerification(result);
      setMessage(result.message);
    } catch (issue) {
      if (typeof issue === "object" && issue !== null && "code" in issue) {
        const geoIssue = issue as GeolocationPositionError;
        const reason = geoIssue.code === geoIssue.PERMISSION_DENIED
          ? "Location permission was denied. Allow precise location access and try again."
          : geoIssue.code === geoIssue.TIMEOUT
            ? "GPS verification timed out. Move outdoors and try again."
            : "Your current GPS position is unavailable. Enable location services and try again.";
        setError(reason);
      } else {
        setError((issue as Error).message);
      }
    } finally {
      setCheckingLocation(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setMessage(""); setError("");
    if (!verification?.verificationToken) return setError("Verify that you are at the selected location before submitting feedback.");
    const formElement = e.currentTarget;
    const form = Object.fromEntries(new FormData(formElement).entries());
    try {
      const result = await api<{ message: string }>("/visitor/feedback", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          category: "On-site visit",
          rating: Number(form.rating),
          locationId,
          verificationToken: verification.verificationToken
        })
      });
      setMessage(result.message);
      formElement.reset();
      setLocationId("");
      setVerification(null);
    } catch (issue) { setError((issue as Error).message); }
  };
  const canSubmit = Boolean(verification?.allowed && verification.verificationToken);
  return <main className="page-shell form-shell">
    <div className="section-kicker">Verified site visit</div><h1>Rate a place you visited.</h1>
    <p>To keep ratings trustworthy, feedback is available only while you are physically at a verified Mansalay site.</p>
    <form className="glass content-form geofence-form" onSubmit={submit}>
      <section className="geofence-panel">
        <div className="geofence-heading"><span className="geofence-icon"><MapPin/></span><div><h2>Verify your current location</h2><p>Select the place, then allow GPS access. Verification expires after five minutes. If the detected coordinate is outside the site's allowed radius, feedback remains locked.</p></div></div>
        <label className="field"><span>Heritage site or attraction *</span><select value={locationId} onChange={(event) => { setLocationId(event.target.value); setVerification(null); setMessage(""); setError(""); }} required disabled={loadingLocations}><option value="">{loadingLocations ? "Loading verified locations…" : "Choose the place you are visiting"}</option>{eligibleLocations.map((location) => <option value={location.id} key={location.id}>{location.name}{location.address ? ` — ${location.address}` : ""}</option>)}</select></label>
        {locationsError && <div className="form-error">{(locationsError as Error).message}</div>}
        {!loadingLocations && !locationsError && eligibleLocations.length === 0 && <div className="form-error">No GPS-enabled locations are available. Ask an administrator to verify site coordinates.</div>}
        <button type="button" className="button button-location" onClick={verifyLocation} disabled={checkingLocation || !locationId}>{checkingLocation ? "Checking GPS…" : "Verify my location"} <Compass size={17}/></button>
        {verification?.allowed && <div className="location-verified"><Check size={18}/><div><strong>On-site location confirmed</strong><span>{Math.round(verification.distanceMeters ?? 0)} m from the site · GPS accuracy ±{Math.round(verification.accuracyMeters ?? 0)} m</span></div></div>}
        <p className="privacy-note"><ShieldCheck size={14}/> Your exact coordinates are used only for this verification and are not stored. The system keeps the site, distance, GPS accuracy, and verification time.</p>
      </section>
      <fieldset className="feedback-fields" disabled={!canSubmit}><Field label="Feedback subject" name="subject" required/><label className="field"><span>Rating *</span><select name="rating" required defaultValue="5"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select></label><label className="field"><span>Comment *</span><textarea name="message" rows={6} minLength={10} required placeholder="Share what you experienced at this place."/></label></fieldset>
      {error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}
      <button className="button button-dark" disabled={!canSubmit}>Submit verified feedback <ArrowRight size={16}/></button>
    </form>
  </main>;
}

function ConnectAccount({ onUser }: { onUser: (user: User) => void }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    const token = params.get("token");
    const returnTo = safeLocalPath(params.get("returnTo"));
    if (!token) { setError("The CultureFrame account link is missing. Please start again from the customer sign-in button."); return; }
    api<{ user: User }>("/integrations/cultureframe/session", { method: "POST", body: JSON.stringify({ token }) })
      .then((result) => { onUser(result.user); navigate(returnTo === "/account/connect" ? "/" : returnTo, { replace: true }); })
      .catch((issue) => setError((issue as Error).message));
  }, [navigate, onUser, params]);
  return <main className="page-shell account-connect-shell"><div className="glass account-connect-card">{error ? <><UserRound/><h1>Account connection needs attention.</h1><p>{error}</p><a className="button button-gold" href={customerAccessUrl("/")}>Return to CultureFrame sign in</a></> : <><span className="account-connect-loader"/><h1>Connecting your CultureFrame accountâ€¦</h1><p>Keeping your customer profile, shopping activity, and visitor feedback under one identity.</p></>}</div></main>;
}

function MainAdminAccess() {
  useEffect(() => { window.location.replace(customerAccessUrl("/admin/dashboard")); }, []);
  return <main className="page-shell account-connect-shell"><div className="glass account-connect-card"><span className="account-connect-loader"/><h1>Opening CultureFrame Adminâ€¦</h1><p>Visitor content is managed through the single main administrator account.</p></div></main>;
}
function AdminPage() {
  const location = useLocation();
  const route = location.pathname.replace(/\/+$/, "").split("/")[2] || "dashboard";
  const selectedSection = adminSections.find((item) => item.path === route);
  const section = selectedSection?.key ?? "";
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<RecordItem | null>(null);
  useEffect(() => { setNotice(""); setEditing(null); }, [location.pathname]);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", section],
    enabled: Boolean(selectedSection),
    queryFn: () => section === "dashboard" ? api<Record<string, unknown>>("/admin/dashboard")
      : section === "homepage" ? api<{ content: Record<string, unknown> }>("/admin/homepage")
      : section === "feedback" || section === "audit-logs" ? api<{ items: Array<Record<string, unknown>> }>(`/admin/${section}`)
      : section === "media" || section === "locations" ? api<{ items: Array<Record<string, unknown>> }>(`/admin/${section}`)
      : api<{ items: RecordItem[] }>(`/admin/content?kind=${section}`)
  });
  const submitRecord = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setNotice("");
    const formElement = e.currentTarget;
    const raw = Object.fromEntries(new FormData(formElement).entries());
    try {
      await api("/admin/content", { method: "POST", body: JSON.stringify({ ...raw, kind: section, publicationStatus: raw.publicationStatus || "DRAFT", featured: raw.featured === "on" }) });
      setNotice("Record saved."); formElement.reset(); await refetch();
    } catch (issue) { setNotice((issue as Error).message); }
  };
  const setStatus = async (id: string, publicationStatus: string) => {
    try { await api(`/admin/content/${id}`, { method: "PATCH", body: JSON.stringify({ publicationStatus }) }); setNotice("Publication status updated."); await refetch(); }
    catch (issue) { setNotice((issue as Error).message); }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Permanently delete this record?")) return;
    try { await api(`/admin/content/${id}`, { method: "DELETE" }); setNotice("Record deleted."); await refetch(); }
    catch (issue) { setNotice((issue as Error).message); }
  };
  const saveEdit = async (id: string, values: Record<string, unknown>) => {
    try {
      await api(`/admin/content/${id}`, { method: "PATCH", body: JSON.stringify(values) });
      setNotice("Record updated."); setEditing(null); await refetch();
    } catch (issue) { setNotice((issue as Error).message); }
  };
  if (!selectedSection) return <NotFound message="That administrator section does not exist." />;
  return <main className="admin-shell"><aside className="admin-sidebar"><Link to="/" className="brand"><span className="brand-mark">C</span><span>Culture<span className="gold">Frame</span><small>ADMIN CONSOLE</small></span></Link><nav className="admin-nav" aria-label="Administrator sections">{adminSections.map((item) => <Link key={item.key} to={`/admin/${item.path}`} className={section === item.key ? "active" : ""} aria-current={section === item.key ? "page" : undefined}>{item.label}</Link>)}</nav><Link to="/" className="admin-back">← Back to website</Link></aside><section className="admin-content"><div className="admin-top"><div><div className="section-kicker">CultureFrame CMS</div><h1>{selectedSection.label}</h1></div><span className="admin-badge"><ShieldCheck size={15}/> Administrator</span></div>{notice && <div className={notice.includes("updated") || notice.includes("saved") || notice.includes("deleted") ? "form-success" : "form-error"} role="status">{notice}</div>}{isLoading ? <Loading/> : error ? <ErrorPanel message={(error as Error).message}/> : section === "dashboard" ? <AdminStats data={data ?? {}}/> : section === "homepage" ? <HomepageEditor content={(data as {content: Record<string, unknown>})?.content ?? {}} onSaved={setNotice}/> : section === "feedback" || section === "audit-logs" ? <AdminRows rows={(data as {items: Array<Record<string, unknown>>})?.items ?? []} section={section} refresh={refetch} notice={setNotice}/> : section === "media" ? <MediaManager rows={(data as {items: Array<Record<string, unknown>>})?.items ?? []} refresh={refetch} notice={setNotice}/> : section === "locations" ? <LocationManager rows={(data as {items: Array<Record<string, unknown>>})?.items ?? []} refresh={refetch} notice={setNotice}/> : <><form className="glass admin-create" onSubmit={submitRecord}><h2>Add {selectedSection.label.toLowerCase()} record</h2><div className="form-row"><Field label="Title" name="title" required/><Field label="Slug (lowercase-and-hyphenated)" name="slug" required/></div><Field label="Summary" name="summary"/><label className="field"><span>Description</span><textarea name="description" rows={4}/></label><div className="form-row"><label className="field"><span>Publication status</span><select name="publicationStatus"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><label className="check-label"><input name="featured" type="checkbox"/> Feature on homepage</label></div><button className="button button-dark">Create record <Check size={16}/></button></form>{editing && <AdminEditForm item={editing} onCancel={()=>setEditing(null)} onSave={saveEdit}/>}<AdminContentList rows={(data as {items: RecordItem[]})?.items ?? []} onStatus={setStatus} onDelete={remove} onEdit={setEditing}/></>}</section></main>;
}

function AdminStats({ data }: { data: Record<string, unknown> }) {
  const stats = [["Administrator accounts",data.administrators],["Content records",data.contents],["Feedback submissions",data.feedback],["Media assets",data.media]];
  return <><div className="stats-grid">{stats.map(([label, value]) => <article className="glass stat-card" key={String(label)}><span>{String(label)}</span><strong>{value == null ? "—" : String(value)}</strong><small>Live database count</small></article>)}</div><div className="glass admin-note"><ShieldCheck/><div><h2>Publication responsibility</h2><p>Only records marked Published appear in public browsing and search. Confirm local facts, source references, and image permissions before publishing.</p></div></div></>;
}
function AdminContentList({ rows, onStatus, onDelete, onEdit }: { rows: RecordItem[]; onStatus: (id:string,status:string)=>void; onDelete: (id:string)=>void; onEdit:(item:RecordItem)=>void }) {
  return <div className="admin-record-list"><div className="table-head"><span>Record</span><span>Status</span><span>Actions</span></div>{rows.map((row) => <div className="table-row" key={row.id}><div><strong>{row.title}</strong><small>{row.slug}</small></div><select aria-label={`Status for ${row.title}`} value={row.publicationStatus} onChange={(e) => onStatus(row.id,e.target.value)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select><div className="row-actions"><button className="edit-link" onClick={() => onEdit(row)}>Edit</button><button className="danger-link" onClick={() => onDelete(row.id)}>Delete</button></div></div>)}{!rows.length && <p className="muted table-empty">No records in this collection yet.</p>}</div>;
}
function AdminEditForm({ item, onCancel, onSave }: { item:RecordItem; onCancel:()=>void; onSave:(id:string,values:Record<string,unknown>)=>void }) {
  const submit=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    const values=Object.fromEntries(new FormData(e.currentTarget).entries());
    onSave(item.id,{...values,featured:values.featured==="on"});
  };
  return <form className="glass admin-create" onSubmit={submit}><h2>Edit {item.title}</h2><div className="form-row"><Field label="Title" name="title" required defaultValue={item.title}/><Field label="Slug" name="slug" required defaultValue={item.slug}/></div><Field label="Summary" name="summary" defaultValue={item.summary}/><label className="field"><span>Description</span><textarea name="description" rows={4} defaultValue={item.description}/></label><div className="form-row"><label className="field"><span>Publication status</span><select name="publicationStatus" defaultValue={item.publicationStatus}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><label className="check-label"><input name="featured" type="checkbox" defaultChecked={item.featured}/> Feature on homepage</label></div><div className="button-row"><button type="submit" className="button button-dark">Save changes</button><button type="button" className="button button-neutral" onClick={onCancel}>Cancel</button></div></form>;
}
function HomepageEditor({ content, onSaved }: { content: Record<string, unknown>; onSaved: (text:string)=>void }) {
  const submit = async (e:FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values=Object.fromEntries(new FormData(e.currentTarget).entries());
    try { await api("/admin/homepage",{method:"PATCH",body:JSON.stringify(values)}); onSaved("Homepage content saved."); }
    catch (issue) { onSaved((issue as Error).message); }
  };
  return <form className="glass content-form" onSubmit={submit}><label className="field"><span>Hero heading</span><input name="heroTitle" defaultValue={String(content.heroTitle??"")}/></label><label className="field"><span>Hero description</span><textarea name="heroDescription" rows={3} defaultValue={String(content.heroDescription??"")}/></label><label className="field"><span>About introduction</span><textarea name="about" rows={5} defaultValue={String(content.about??"")}/></label><button className="button button-dark">Save homepage</button></form>;
}
function AdminRows({ rows, section, refresh, notice }: { rows:Array<Record<string,unknown>>; section:string; refresh:()=>void; notice:(s:string)=>void }) {
  const toggle = async (row:Record<string,unknown>) => {
    const id=String(row.id);
    try {
      if(section==="feedback") await api(`/admin/feedback/${id}`,{method:"PATCH",body:JSON.stringify({status:row.status==="NEW"?"REVIEWED":"RESOLVED"})});
      else return;
      notice("Status updated."); refresh();
    } catch(issue) { notice((issue as Error).message); }
  };
  return <div className="admin-record-list">{rows.map((row) => {
    const feedbackLocation = row.location as { name?: string } | null | undefined;
    const feedbackMeta = section === "feedback" && feedbackLocation?.name
      ? `${feedbackLocation.name} · ${Math.round(Number(row.geofenceDistanceMeters ?? 0))} m from site · GPS ±${Math.round(Number(row.geofenceAccuracyMeters ?? 0))} m`
      : "";
    return <div className="table-row" key={String(row.id)}><div><strong>{String(row.subject??row.email??row.action??row.name??"Record")}</strong><small>{feedbackMeta || String(row.message??row.entity??row.status??"")}</small>{feedbackMeta && <small>{String(row.message??"")}</small>}</div><span>{String(row.createdAt??"")}</span>{section==="feedback" && <button className="danger-link" onClick={()=>toggle(row)}>{row.status==="NEW"?"Mark reviewed":"Resolve"}</button>}</div>;
  })}{!rows.length&&<p className="muted table-empty">No {section} to show.</p>}</div>;
}
function MediaManager({ rows, refresh, notice }: { rows:Array<Record<string,unknown>>; refresh:()=>void; notice:(s:string)=>void }) {
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault(); const formElement=e.currentTarget; const form=new FormData(formElement);
    try { await api("/admin/media",{method:"POST",body:form}); notice("Image uploaded. It will remain hidden until permissions are approved."); formElement.reset(); refresh(); }
    catch(issue){notice((issue as Error).message);}
  };
  return <><form className="glass content-form" onSubmit={submit}><h2>Upload image with attribution</h2><label className="field"><span>Image (JPG, PNG, WebP; up to 5 MB)</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp" required/></label><Field label="Alt text" name="altText"/><Field label="Caption" name="caption"/><Field label="Photographer" name="photographer"/><Field label="Source URL" name="sourceUrl" type="url"/><Field label="License" name="license"/><label className="field"><span>Permission status</span><select name="permissionStatus"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option></select></label><button className="button button-dark">Upload image</button></form><AdminRows rows={rows} section="media" refresh={refresh} notice={notice}/></>;
}
function LocationManager({ rows, refresh, notice }: { rows:Array<Record<string,unknown>>; refresh:()=>void; notice:(s:string)=>void }) {
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault(); const formElement=e.currentTarget; const raw=Object.fromEntries(new FormData(formElement).entries());
    try { await api("/admin/locations",{method:"POST",body:JSON.stringify({...raw,sourceUrl:raw.sourceUrl||null,latitude:raw.latitude?Number(raw.latitude):null,longitude:raw.longitude?Number(raw.longitude):null,feedbackRadiusMeters:raw.feedbackRadiusMeters?Number(raw.feedbackRadiusMeters):150,verified:raw.verified==="on"})}); notice("Location saved.");formElement.reset();refresh(); }
    catch(issue){notice((issue as Error).message);}
  };
  return <><form className="glass content-form" onSubmit={submit}><h2>Add a verified location</h2><div className="form-row"><Field label="Name" name="name" required/><Field label="Category" name="category" required defaultValue="Sightseeing"/></div><Field label="Address" name="address"/><Field label="Official source URL" name="sourceUrl" type="url"/><label className="field"><span>Description</span><textarea name="description"/></label><div className="form-row"><label className="field"><span>Latitude</span><input name="latitude" type="number" step="any" min="-90" max="90"/></label><label className="field"><span>Longitude</span><input name="longitude" type="number" step="any" min="-180" max="180"/></label></div><label className="field"><span>Feedback GPS radius (meters)</span><input name="feedbackRadiusMeters" type="number" min="25" max="2000" step="25" defaultValue="150"/><small>Visitors must be inside this radius with GPS accuracy of 100 meters or better.</small></label><label className="check-label"><input type="checkbox" name="verified"/> Coordinates have been verified</label><button className="button button-dark">Save location</button></form><AdminRows rows={rows} section="locations" refresh={refresh} notice={notice}/></>;
}

function PolicyPage({title}:{title:string}) {
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">CultureFrame</div><h1>{title}</h1><p>This starter policy page must be reviewed and customized by the organization before public launch.</p></div><article className="policy-copy"><h2>Data and community knowledge</h2><p>CultureFrame stores administrator account information needed to operate the system. Public visitor feedback is available to authorized administrators. Do not upload sensitive cultural materials without permission.</p><h2>Location verification</h2><p>When a visitor chooses to rate a site, the browser shares a fresh GPS reading to confirm that the visitor is within the administrator-approved site radius. Exact visitor coordinates are not stored. The selected site, calculated distance, GPS accuracy, and verification time are retained with the feedback submission.</p><h2>Images and attribution</h2><p>Uploaded media is not publicly displayed until its permission status is approved. The organization is responsible for confirming licenses, attribution, and appropriate cultural permissions.</p><h2>Contact</h2><p>Contact details should be added by a CultureFrame administrator before launch.</p></article></main>;
}
function Loading(){return <div className="loading-state"><span className="spinner"/> Loading CultureFrame…</div>}
function ErrorPanel({message}:{message:string}){return <div className="error-panel" role="alert"><strong>Could not load this information.</strong><p>{message}</p><p>Confirm the API and database are running, then try again.</p></div>}
function NotFound({message="This page could not be found."}:{message?:string}){return <main className="page-shell not-found"><div className="section-kicker">404 · Not found</div><h1>That path has gone quiet.</h1><p>{message}</p><Link className="button button-dark" to="/">Return home <ArrowRight size={16}/></Link></main>}
function Footer(){return <footer className="footer"><div className="footer-main"><Link to="/" className="brand"><span className="brand-mark">C</span><span>Culture<span className="gold">Frame</span><small>MANSALAY · ORIENTAL MINDORO</small></span></Link><p>A connected visitor guide and cultural archive using the same CultureFrame customer account as the marketplace.</p><div className="footer-links"><a href={mainSystemUrl("/shop")}>Marketplace</a><a href={mainSystemUrl("/customer/dashboard")}>Customer account</a>{menu.map(([name,href])=><Link key={href} to={href}>{name}</Link>)}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CultureFrame · Mansalay, Oriental Mindoro</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></div></footer>}

export default App;
