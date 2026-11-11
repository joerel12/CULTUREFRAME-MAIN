import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowRight, BookOpen, CalendarDays, Camera, Check, ChevronDown, Compass, Feather, Globe2, Leaf, MapPin, Menu, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { api, apiAssetUrl, ApiError } from "./api";

type User = { id: string; firstName: string; lastName: string; email: string; role: "ADMIN" };
type RecordItem = { id: string; kind: string; title: string; slug: string; summary: string; description: string; culturalSignificance?: string; historicalBackground?: string; payload?: Record<string, unknown>; publicationStatus?: string; featured?: boolean };
type ListResult = { items: RecordItem[]; total?: number; pages?: number; page?: number };
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

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => { api<{ user: User }>("/auth/me").then((r) => setUser(r.user)).catch(() => {}).finally(() => setReady(true)); }, []);
  const logout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      queryClient.clear();
      window.location.assign("/");
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
        <Link to="/about">About</Link>
        <Link to="/search" aria-label="Search"><Search size={17}/></Link>
        {user ? <><Link className="nav-pill" to="/admin/dashboard">Admin dashboard</Link><button className="nav-text" onClick={logout}>Sign out</button></> : <Link to="/login">Administrator login</Link>}
      </nav>
    </header>
    <AnimatePresence mode="wait"><Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/about" element={<About/>}/>
      <Route path="/login" element={<AuthPage onUser={setUser}/>}/>
      <Route path="/forgot-password" element={<ResetPage mode="forgot"/>}/>
      <Route path="/reset-password" element={<ResetPage mode="reset"/>}/>
      <Route path="/search" element={<SearchPage/>}/>
      {menu.slice(0, 7).map(([_, path]) => {
        const segment = path.slice(1);
        return <Route key={path} path={path} element={<ListingPage segment={segment}/>}/>;
      })}
      {menu.slice(0, 7).map(([_, path]) => <Route key={`${path}-detail`} path={`${path}/:slug`} element={<DetailPage segment={path.slice(1)}/>}/>)}
      <Route path="/gallery" element={<GalleryPage/>}/>
      <Route path="/locations" element={<LocationsPage/>}/>
      <Route path="/privacy" element={<PolicyPage title="Privacy policy"/>}/>
      <Route path="/terms" element={<PolicyPage title="Terms and conditions"/>}/>
      <Route path="/visitor/feedback" element={<FeedbackPage/>}/>
      <Route path="/admin/*" element={<Protected user={user}><AdminPage/></Protected>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes></AnimatePresence>
    <Footer/>
  </>;
}

function Protected({ user, children }: { user: User | null; children: ReactNode }) {
  if (!user) return <Navigate to="/login" replace/>;
  return <>{children}</>;
}

function Home() {
  const { data, error } = useQuery({ queryKey: ["home"], queryFn: () => api<{ content: Record<string, string>; featured: RecordItem[]; upcoming: RecordItem[] }>("/home") });
  return <main>
    <section className="hero">
      <div className="hero-shape shape-one"/><div className="hero-shape shape-two"/>
      <div className="hero-image-note"><MapPin size={14}/> Mansalay, Oriental Mindoro, Philippines</div>
      <motion.div className="hero-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
        <span className="eyebrow"><span/> A living archive of place and people</span>
        <h1>{data?.content?.heroTitle ?? "Discover the Living Heritage of Mansalay"}</h1>
        <p>{data?.content?.heroDescription ?? "Explore the traditions, stories, and places documented by the CultureFrame community."}</p>
        <div className="button-row"><Link className="button button-gold" to="/heritage">Explore heritage <ArrowRight size={17}/></Link><Link className="button button-glass" to="/about">Discover Mansalay</Link></div>
      </motion.div>
      <div className="hero-bottom"><span>13°31′ N&nbsp; · &nbsp;121°26′ E</span><a href="#intro">Scroll to explore <ArrowDown size={14}/></a></div>
    </section>
    {error && <div className="home-api-error"><ErrorPanel message={(error as Error).message}/></div>}
    <section className="section intro-section" id="intro">
      <div className="section-kicker">A place with stories</div><div className="intro-grid">
        <h2>Rooted in place.<br/><em>Shared with the world.</em></h2>
        <div><p>{data?.content?.about ?? "CultureFrame is a community-focused information portal for documenting cultural heritage in Mansalay, Oriental Mindoro. Explore records, stories, and local knowledge as they are carefully gathered and verified."}</p><Link className="text-link" to="/about">Learn about CultureFrame <ArrowRight size={16}/></Link></div>
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
        return <Link to={link as string} className="category-card glass" key={number as string}><span className="category-number">{number as string}</span><IconComponent className="category-icon"/><h3>{title as string}</h3><p>{copy as string}</p><span className="card-arrow"><ArrowRight size={16}/></span></Link>;
      })}</div>
    </section>
    <section className="feature-section"><div className="feature-image"><span className="image-placeholder-label">Community-contributed image<br/>awaiting verified media</span><span className="photo-caption">Mansalay · Oriental Mindoro</span></div><div className="feature-copy"><div className="section-kicker">Explore responsibly</div><h2>Every story deserves<br/><em>its source.</em></h2><p>CultureFrame is a growing information portal. Records are shared with their sources and publication status; culturally sensitive materials are included only with appropriate permission.</p><Link className="button button-dark" to="/locations">Explore locations <ArrowRight size={16}/></Link></div></section>
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
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">CultureFrame archive</div><h1>{titleForPath[segment] ?? segment}</h1><p>Browse published records and explore the stories available in the archive.</p><label className="search-field"><Search size={18}/><input aria-label="Filter records" placeholder={`Search ${titleForPath[segment]?.toLowerCase() ?? "records"}…`} value={q} onChange={(e) => updateQuery(e.target.value)}/></label></div>{isLoading ? <Loading/> : error ? <ErrorPanel message={(error as Error).message}/> : <><RecordGrid items={data?.items ?? []} empty="No published records yet. Check back as verified records are added."/><Pagination page={data?.page ?? page} pages={data?.pages ?? 1} onPage={setPage}/></>}</main>;
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
  return <main className="page-shell detail-shell"><div className="detail-meta"><Link to={`/${segment}`}>← Back to {titleForPath[segment]}</Link><span>{fmtKind(item.kind)}</span></div><article className="detail-article"><div className="section-kicker">{titleForPath[segment]}</div><h1>{item.title}</h1>{item.summary && <p className="detail-summary">{item.summary}</p>}<div className="detail-divider"/><p className="detail-body">{item.description || "Additional information for this record has not yet been added."}</p>{item.culturalSignificance && <section><h2>Cultural significance</h2><p>{item.culturalSignificance}</p></section>}{item.historicalBackground && <section><h2>Historical background</h2><p>{item.historicalBackground}</p></section>}{typeof payload.location === "string" && <section><h2>Location</h2><p>{payload.location}</p></section>}</article></main>;
}

function RecordGrid({ items, empty }: { items: RecordItem[]; empty: string }) {
  if (!items.length) return <div className="empty-state glass"><BookOpen/><h3>The archive is taking shape</h3><p>{empty}</p><Link className="text-link" to="/about">About this project <ArrowRight size={15}/></Link></div>;
  return <div className="record-grid">{items.map((item) => <Link to={`/${Object.keys(kindForPath).find((key) => kindForPath[key] === item.kind) ?? "heritage"}/${item.slug}`} className="record-card glass" key={item.id}><div className="record-art"><span>{fmtKind(item.kind)}</span><BookOpen/></div><div className="record-body"><div className="record-kind">{fmtKind(item.kind)}</div><h3>{item.title}</h3><p>{item.summary || item.description.slice(0, 140)}</p><span className="text-link">Read more <ArrowRight size={14}/></span></div></Link>)}</div>;
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

function LocationsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["locations"], queryFn: () => api<{ items: Array<{ id: string; name: string; address: string; description: string; latitude: number | null; longitude: number | null; verified: boolean }> }>("/locations") });
  const mapped = data?.items.filter((place) => place.verified && place.latitude != null && place.longitude != null) ?? [];
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">Explore the area</div><h1>Locations</h1><p>Only coordinates verified or provided by an administrator are shown on the map.</p></div>
    {isLoading ? <Loading/> : error ? <ErrorPanel message={(error as Error).message}/> : <>
      {mapped.length > 0 && <div className="map-frame"><MapContainer center={[mapped[0].latitude!, mapped[0].longitude!]} zoom={12} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        {mapped.map((place) => <Marker key={place.id} position={[place.latitude!, place.longitude!]}><Popup><strong>{place.name}</strong><br/>{place.address}</Popup></Marker>)}
      </MapContainer></div>}
      <div className="location-list">{data?.items.map((place) => <article className="location-card glass" key={place.id}><MapPin/><div><h3>{place.name}</h3><p>{place.address}</p><p>{place.description}</p>{place.verified && place.latitude != null && place.longitude != null ? <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=15/${place.latitude}/${place.longitude}`}>Open map <ArrowRight size={14}/></a> : <span className="muted">Map coordinates not verified</span>}</div></article>)}</div>
      {!data?.items.length && <div className="empty-state glass"><MapPin/><h3>No verified locations yet</h3><p>Verified locations added by administrators will be listed here.</p></div>}
    </>}</main>;
}

function AuthPage({ onUser }: { onUser: (user: User) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setBusy(true);
    const values = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const result = await api<{ user: User; redirect: string }>("/auth/login", { method: "POST", body: JSON.stringify(values) });
      onUser(result.user); navigate(result.redirect);
    } catch (issue) { setError((issue as Error).message); } finally { setBusy(false); }
  };
  return <main className="auth-page"><div className="auth-art"><span className="auth-coordinate">MANSALAY · ORIENTAL MINDORO</span><div className="auth-art-copy"><div className="section-kicker">CultureFrame</div><h2>Stories keep<br/><em>places alive.</em></h2><p>Administrator access for the CultureFrame information system.</p></div></div><form className="auth-card glass" onSubmit={submit}><div className="section-kicker">Administrator access</div><h1>Sign in</h1><p>Visitors can explore the public portal without an account.</p>{error && <div className="form-error" role="alert">{error}</div>}
    <Field label="Administrator email" name="email" type="email" required/>
    <Field label="Password" name="password" type="password" required minLength={10}/>
    <div className="auth-helper"><span>Administrator account provided by the system owner</span><Link to="/forgot-password">Forgot password?</Link></div>
    <button className="button button-dark full-width" disabled={busy}>{busy ? "Please wait…" : "Sign in"} <ArrowRight size={16}/></button>
  </form></main>;
}

function Field({ label, name, type = "text", required = false, minLength, defaultValue }: { label: string; name: string; type?: string; required?: boolean; minLength?: number; defaultValue?: string }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span><input name={name} type={type} required={required} minLength={minLength} defaultValue={defaultValue} autoComplete={name === "confirmPassword" ? "new-password" : name === "password" ? "current-password" : name === "email" ? "email" : undefined}/></label>;
}
function ResetPage({ mode }: { mode: "forgot" | "reset" }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setMessage("");
    const values = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const result = await api<{ message: string }>(mode === "forgot" ? "/auth/forgot-password" : "/auth/reset-password", { method: "POST", body: JSON.stringify(mode === "forgot" ? values : { ...values, token: params.get("token") }) });
      setMessage(result.message);
    } catch (issue) { setError((issue as Error).message); }
  };
  return <main className="auth-page reset-page"><form className="auth-card glass" onSubmit={submit}><div className="section-kicker">Account recovery</div><h1>{mode === "forgot" ? "Reset your password" : "Choose a new password"}</h1><p>{mode === "forgot" ? "If your account exists, we’ll issue reset instructions." : "Choose a strong password to secure your account."}</p>{mode === "forgot" ? <Field label="Email address" name="email" type="email" required/> : <Field label="New password" name="password" type="password" required minLength={10}/ >}{error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}<button className="button button-dark full-width">Continue</button><Link className="auth-switch" to="/login">Back to sign in</Link></form></main>;
}

function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setMessage(""); setError("");
    const formElement = e.currentTarget;
    const form = Object.fromEntries(new FormData(formElement).entries());
    try {
      const result = await api<{ message: string }>("/visitor/feedback", { method: "POST", body: JSON.stringify({ ...form, rating: Number(form.rating) }) });
      setMessage(result.message); formElement.reset();
    } catch (issue) { setError((issue as Error).message); }
  };
  return <main className="page-shell form-shell"><div className="section-kicker">Your voice matters</div><h1>Share feedback</h1><p>Tell us about your experience with CultureFrame.</p><form className="glass content-form" onSubmit={submit}><label className="field"><span>Feedback category *</span><select name="category" required><option value="">Choose one</option><option>Website experience</option><option>Content correction</option><option>Accessibility</option><option>Other</option></select></label><Field label="Subject" name="subject" required/><label className="field"><span>Rating *</span><select name="rating" required defaultValue="5"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select></label><label className="field"><span>Message *</span><textarea name="message" rows={6} minLength={10} required/></label>{error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}<button className="button button-dark">Submit feedback <ArrowRight size={16}/></button></form></main>;
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
  return <div className="admin-record-list">{rows.map((row) => <div className="table-row" key={String(row.id)}><div><strong>{String(row.subject??row.email??row.action??row.name??"Record")}</strong><small>{String(row.message??row.entity??row.status??"")}</small></div><span>{String(row.createdAt??"")}</span>{section==="feedback" && <button className="danger-link" onClick={()=>toggle(row)}>{row.status==="NEW"?"Mark reviewed":"Resolve"}</button>}</div>)}{!rows.length&&<p className="muted table-empty">No {section} to show.</p>}</div>;
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
    try { await api("/admin/locations",{method:"POST",body:JSON.stringify({...raw,latitude:raw.latitude?Number(raw.latitude):null,longitude:raw.longitude?Number(raw.longitude):null,verified:raw.verified==="on"})}); notice("Location saved.");formElement.reset();refresh(); }
    catch(issue){notice((issue as Error).message);}
  };
  return <><form className="glass content-form" onSubmit={submit}><h2>Add a verified location</h2><Field label="Name" name="name" required/><Field label="Address" name="address"/><label className="field"><span>Description</span><textarea name="description"/></label><div className="form-row"><Field label="Latitude" name="latitude" type="number"/><Field label="Longitude" name="longitude" type="number"/></div><label className="check-label"><input type="checkbox" name="verified"/> Coordinates have been verified</label><button className="button button-dark">Save location</button></form><AdminRows rows={rows} section="locations" refresh={refresh} notice={notice}/></>;
}

function PolicyPage({title}:{title:string}) {
  return <main className="page-shell"><div className="page-hero compact"><div className="section-kicker">CultureFrame</div><h1>{title}</h1><p>This starter policy page must be reviewed and customized by the organization before public launch.</p></div><article className="policy-copy"><h2>Data and community knowledge</h2><p>CultureFrame stores administrator account information needed to operate the system. Public visitor feedback is available to authorized administrators. Do not upload sensitive cultural materials without permission.</p><h2>Images and attribution</h2><p>Uploaded media is not publicly displayed until its permission status is approved. The organization is responsible for confirming licenses, attribution, and appropriate cultural permissions.</p><h2>Contact</h2><p>Contact details should be added by a CultureFrame administrator before launch.</p></article></main>;
}
function Loading(){return <div className="loading-state"><span className="spinner"/> Loading CultureFrame…</div>}
function ErrorPanel({message}:{message:string}){return <div className="error-panel" role="alert"><strong>Could not load this information.</strong><p>{message}</p><p>Confirm the API and database are running, then try again.</p></div>}
function NotFound({message="This page could not be found."}:{message?:string}){return <main className="page-shell not-found"><div className="section-kicker">404 · Not found</div><h1>That path has gone quiet.</h1><p>{message}</p><Link className="button button-dark" to="/">Return home <ArrowRight size={16}/></Link></main>}
function Footer(){return <footer className="footer"><div className="footer-main"><Link to="/" className="brand"><span className="brand-mark">C</span><span>Culture<span className="gold">Frame</span><small>MANSALAY · ORIENTAL MINDORO</small></span></Link><p>A community-focused digital archive sharing cultural heritage information for Mansalay.</p><div className="footer-links">{menu.map(([name,href])=><Link key={href} to={href}>{name}</Link>)}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CultureFrame · Mansalay, Oriental Mindoro</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></div></footer>}

export default App;
