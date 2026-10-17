import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Experience,
  Product,
  TourismListing,
  experiences,
  formatETB,
  images,
  products,
  tourismListings,
} from "./data";

type IconName = "arrow" | "bag" | "heart" | "menu" | "minus" | "plus" | "search" | "trash" | "user" | "instagram" | "facebook";
type Cart = Record<string, number>;

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    bag: <><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    menu: <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
    minus: <path d="M5 12h14"/>,
    plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 14h10l1-14"/><path d="M10 11v6M14 11v6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
    facebook: <path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h2V3Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return <Link className="brand" to="/" aria-label="OmoBridge home"><span className="brand-mark"><i/><i/><i/></span><span>OmoBridge</span></Link>;
}

function ArrowLink({ children, to }: { children: ReactNode; to: string }) {
  return <Link className="arrow-link" to={to}>{children}<Icon name="arrow" size={18}/></Link>;
}

function Header({ cartCount }: { cartCount: number }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return <>
    <div className="announcement">Thoughtfully made in Ethiopia · Shared with the world</div>
    <header className="site-header">
      <Brand/>
      <nav className={open ? "nav open" : "nav"} aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink><NavLink to="/products">Shop Products</NavLink><NavLink to="/tourism">Explore Tourism</NavLink>
        <NavLink to="/services">Cultural Experiences</NavLink><NavLink to="/about">About OmoBridge</NavLink>
      </nav>
      <div className="header-actions">
        <Link to="/products" className="icon-label"><Icon name="search"/><span>Search</span></Link>
        <Link to="/login" className="icon-label account"><Icon name="user"/><span>Sign in</span></Link>
        <Link to="/cart" className="bag-button" aria-label={`Shopping bag with ${cartCount} items`}><Icon name="bag"/>{cartCount > 0 && <b>{cartCount}</b>}</Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu"><Icon name="menu"/></button>
      </div>
    </header>
  </>;
}

function Footer() {
  return <footer>
    <div className="footer-main section-shell">
      <div className="footer-brand"><Brand/><p>A marketplace for meaningful goods, remarkable places, and experiences hosted with care.</p><div className="social"><a href="https://instagram.com" aria-label="Instagram"><Icon name="instagram"/></a><a href="https://facebook.com" aria-label="Facebook"><Icon name="facebook"/></a></div></div>
      <div><h3>Discover</h3><Link to="/products">Shop Products</Link><Link to="/tourism">Explore Tourism</Link><Link to="/services">Cultural Experiences</Link><Link to="/about">Producers & Hosts</Link></div>
      <div><h3>OmoBridge</h3><Link to="/about">Our Story</Link><Link to="/about#how">How It Works</Link><Link to="/register">Sell or Host</Link><a href="mailto:hello@omobridge.example">Contact</a></div>
      <div><h3>Your account</h3><Link to="/login">Sign in</Link><Link to="/cart">Shopping Bag</Link><Link to="/booking">Reservations</Link><Link to="/about">Help Centre</Link></div>
    </div>
    <div className="footer-bottom section-shell"><span>© 2026 OmoBridge. Prototype experience.</span><div><Link to="/about">Privacy</Link><Link to="/about">Terms</Link><Link to="/about">Accessibility</Link></div></div>
  </footer>;
}

function PageHeader({ eyebrow, title, copy, children }: { eyebrow: string; title: string; copy: string; children?: ReactNode }) {
  return <section className="page-hero"><div className="section-shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p>{children}</div></section>;
}

function EmptyState({ title, text, action, to }: { title: string; text: string; action: string; to: string }) {
  return <div className="empty-state"><p className="eyebrow">Nothing here yet</p><h2>{title}</h2><p>{text}</p><Link className="button primary" to={to}>{action}</Link></div>;
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (id: string) => void }) {
  const [favorite, setFavorite] = useState(false);
  return <article className="product-card">
    <div className="product-image">
      <Link to={`/products/${product.id}`} aria-label={`View ${product.name}`}><img src={product.image} alt={product.name}/></Link>
      <button className={favorite ? "favorite active" : "favorite"} onClick={() => setFavorite(!favorite)} aria-label={`${favorite ? "Remove" : "Add"} ${product.name} ${favorite ? "from" : "to"} favorites`}><Icon name="heart" size={18}/></button>
    </div>
    <div className="product-content">
      <p className="maker">{product.producer}</p><h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
      <div className="product-bottom"><div><strong>{formatETB(product.price)}</strong><span>{product.availability}</span></div><button disabled={product.availability === "Unavailable"} onClick={() => onAdd(product.id)} aria-label={`Add ${product.name} to bag`}><Icon name="bag" size={19}/></button></div>
    </div>
  </article>;
}

function ExperienceCard({ experience }: { experience: Experience }) {
  return <article className="listing-card experience-card">
    <Link to={`/experiences/${experience.id}`}><img src={experience.image} alt={experience.title}/></Link>
    <div><p className="meta">{experience.location} · {experience.duration}</p><h3><Link to={`/experiences/${experience.id}`}>{experience.title}</Link></h3><p>Hosted by {experience.host}</p><div className="listing-card-bottom"><strong>{formatETB(experience.price)} / person</strong><ArrowLink to={`/experiences/${experience.id}`}>View</ArrowLink></div></div>
  </article>;
}

function Home({ onAdd }: { onAdd: (id: string) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const search = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim().toLowerCase();
    if (experiences.some((item) => `${item.title} ${item.category} ${item.location}`.toLowerCase().includes(term))) {
      navigate(`/services?q=${encodeURIComponent(query)}`);
    } else if (tourismListings.some((item) => `${item.title} ${item.location} ${item.type}`.toLowerCase().includes(term))) {
      navigate(`/tourism?q=${encodeURIComponent(query)}`);
    } else {
      navigate(`/products?q=${encodeURIComponent(query)}`);
    }
  };
  return <main>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">Ethiopia · People · Place · Culture</p><h1>Discover Ethiopia Through the People Who Make It.</h1><p className="hero-intro">Shop meaningful products made by local producers, explore remarkable destinations, and connect with the people and traditions that make every experience memorable.</p><div className="hero-actions"><Link className="button primary" to="/services">Explore Cultural Experiences</Link><Link className="button text-button" to="/products">Shop Local Products <Icon name="arrow" size={18}/></Link></div></div>
      <figure className="hero-image"><img src={images.hero} alt="A farmer carrying freshly gathered plants in the Ethiopian highlands"/><figcaption>Stories rooted in people and place</figcaption></figure>
      <form className="discovery-search" onSubmit={search}><label htmlFor="discover">What would you like to discover?</label><div><Icon name="search"/><input id="discover" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, places, or experiences"/><button type="submit">Explore</button></div><p>Try “coffee ceremony”, “Lalibela”, or “handwoven baskets”</p></form>
    </section>
    <section className="pathways section-shell"><div className="section-kicker">Begin your journey</div><div className="pathway-grid">
      <article className="pathway"><span>01 / Marketplace</span><h2>Shop Local</h2><p>Find pieces with a sense of place and meet the producers behind them.</p><ArrowLink to="/products">Browse products</ArrowLink></article>
      <article className="pathway path-place"><span>02 / Travel</span><h2>Explore Places</h2><p>Discover destinations, stays, guides, and thoughtfully hosted tours.</p><ArrowLink to="/tourism">Explore Ethiopia</ArrowLink></article>
      <article className="pathway path-culture"><span>03 / Connection</span><h2>Experience Culture</h2><p>Cook, make, listen, and learn through activities hosted by local people.</p><ArrowLink to="/services">Meet local hosts</ArrowLink></article>
    </div></section>
    <HomeExperiences/>
    <section className="products"><div className="section-shell"><div className="section-head product-heading"><div><p className="eyebrow">The local marketplace</p><h2>Made Locally.<br/>Chosen With Purpose.</h2></div><div><p>Explore distinctive products from Ethiopian makers and discover the people, skills, and stories behind them.</p><ArrowLink to="/products">View All Products</ArrowLink></div></div><div className="category-tabs home-tabs"><Link to="/products?category=Handcrafted%20Goods">Handcrafted Goods</Link><Link to="/products?category=Textiles">Textiles</Link><Link to="/products?category=Coffee%20%26%20Food">Coffee & Food</Link><Link to="/products?category=Home%20%26%20Living">Home & Living</Link></div><div className="product-grid">{products.slice(0,4).map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd}/>)}</div></div></section>
    <HomeDestinations/>
    <HomePeople/>
    <HowItWorks/>
    <Closing/>
  </main>;
}

function HomeExperiences() {
  return <section className="section-shell experiences"><div className="section-head"><div><p className="eyebrow">Hosted with heart</p><h2>More Than a Visit.<br/>A Real Connection.</h2></div><div><p>Meet local hosts, learn traditional skills, share food, and discover the stories behind the places you visit.</p><ArrowLink to="/services">Explore All Experiences</ArrowLink></div></div><div className="experience-layout">
    <article className="experience-feature"><div className="image-wrap"><Link to={`/experiences/${experiences[0].id}`}><img src={experiences[0].image} alt={experiences[0].title}/></Link></div><div className="experience-info"><div><p className="meta">Addis Ababa · 2 hours</p><h3>{experiences[0].title}</h3><p>Hosted by Bethlehem · From 950 ETB / person</p></div><ArrowLink to={`/experiences/${experiences[0].id}`}>View Experience</ArrowLink></div></article>
    <div className="experience-side">{experiences.slice(1,3).map((item) => <article key={item.id}><Link to={`/experiences/${item.id}`}><img src={item.image} alt={item.title}/></Link><div><p className="meta">{item.location} · {item.duration}</p><h3>{item.title}</h3><p>Hosted by {item.host} · From {formatETB(item.price)} / person</p><ArrowLink to={`/experiences/${item.id}`}>View Experience</ArrowLink></div></article>)}</div>
  </div><p className="prototype-note">Sample experiences shown for prototype purposes. Availability is not confirmed.</p></section>;
}

function HomeDestinations() {
  return <section className="section-shell destinations"><div className="section-head"><div><p className="eyebrow">Travel with context</p><h2>Find Your Way<br/>Into Ethiopia.</h2></div><div><p>Begin with a place, then find the local guides, stays, and experiences that can help you know it more deeply.</p><ArrowLink to="/tourism">Explore Tourism</ArrowLink></div></div><div className="destination-grid">
    <article className="destination-main"><img src={images.simien} alt="Layered peaks in the Simien Mountains"/><div className="destination-overlay"><p>Amhara Region</p><h3>Simien Mountains</h3><span>Trekking · Local guides · Nature stays</span><ArrowLink to="/tourism/simien-guided-trek">Explore the highlands</ArrowLink></div></article>
    <article className="destination-small"><img src={images.lalibela} alt="Traditional homes in a green landscape"/><div><p>North Wollo</p><h3>Lalibela</h3><span>Heritage · Architecture · Community tours</span><ArrowLink to="/tourism/lalibela-heritage-day">Discover Lalibela</ArrowLink></div></article>
    <article className="destination-small"><img src={images.highlands} alt="Green Ethiopian highlands"/><div><p>Eastern Ethiopia</p><h3>Harar & Beyond</h3><span>Old city · Food · Hosted walks</span><ArrowLink to="/tourism">Explore the east</ArrowLink></div></article>
  </div><div className="travel-services"><p>Plan the practical details</p><Link to="/tourism?type=Accommodation">Places to stay <Icon name="arrow" size={17}/></Link><Link to="/tourism?type=Guide">Local guides <Icon name="arrow" size={17}/></Link><Link to="/tourism?type=Tour">Tours & transfers <Icon name="arrow" size={17}/></Link></div></section>;
}

function HomePeople() {
  const people = [
    { name: "Mulu & the Entoto Makers", place: "Addis Ababa", craft: "Clay & homeware", intro: "A small workshop shaping useful objects with local clay.", image: images.portrait, link: "/products?search=clay" },
    { name: "Bethlehem Assefa", place: "Addis Ababa", craft: "Coffee & storytelling", intro: "A host sharing the rituals and conversations around coffee.", image: images.host, link: `/experiences/${experiences[0].id}` },
    { name: "Hana Kebede", place: "Bahir Dar", craft: "Textiles & natural dye", intro: "A textile maker working with handwoven cotton and natural color.", image: images.maker, link: `/experiences/natural-dye-workshop` },
  ];
  return <section className="people"><div className="section-shell"><div className="section-head"><div><p className="eyebrow">Meet the community</p><h2>Behind Every Discovery<br/>Is a Person.</h2></div><div><p>OmoBridge is designed to bring makers, hosts, and travelers closer—so value stays connected to the people who create it.</p></div></div><div className="people-grid">{people.map((person) => <article key={person.name}><img src={person.image} alt={`Portrait of ${person.name}`}/><div><p className="meta">{person.place} · {person.craft}</p><h3>{person.name}</h3><p>{person.intro}</p><ArrowLink to={person.link}>Discover their work</ArrowLink></div></article>)}</div></div></section>;
}

function HowItWorks() {
  return <section className="section-shell how" id="how"><div className="how-intro"><p className="eyebrow">Simple by design</p><h2>Two Ways to Discover</h2><p>Shop and travel with clarity. Products go to your bag; experiences follow a separate reservation path.</p></div><div className="journeys"><article><p className="journey-label">For shoppers</p><ol><li><span>01</span><div><h3>Discover local products</h3><p>Browse by category, maker, or material.</p></div></li><li><span>02</span><div><h3>Review the details</h3><p>Check price, story, and availability.</p></div></li><li><span>03</span><div><h3>Complete your purchase</h3><p>Add to your bag and follow checkout.</p></div></li></ol></article><article><p className="journey-label">For travelers</p><ol><li><span>01</span><div><h3>Find a place or experience</h3><p>Explore hosts, guides, and activities.</p></div></li><li><span>02</span><div><h3>Compare your options</h3><p>Review details, prices, and open dates.</p></div></li><li><span>03</span><div><h3>Request a reservation</h3><p>Submit your details and await confirmation.</p></div></li></ol></article></div></section>;
}

function Closing() {
  return <section className="closing"><img src={images.highlands} alt="The Ethiopian highlands stretching toward the horizon"/><div><p className="eyebrow">This is only the beginning</p><h2>Come Curious.<br/>Leave Connected.</h2><p>Discover the products, places, and people that make Ethiopia unforgettable.</p><div><Link className="button light" to="/services">Explore Experiences</Link><Link className="button outline-light" to="/products">Shop Local</Link></div></div></section>;
}

function ProductsPage({ onAdd }: { onAdd: (id: string) => void }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || params.get("search") || "";
  const category = params.get("category") || "All";
  const availability = params.get("availability") || "All";
  const sort = params.get("sort") || "featured";
  const max = Number(params.get("max") || 8000);
  const set = (key: string, value: string) => { const next = new URLSearchParams(params); value && value !== "All" && value !== "featured" ? next.set(key, value) : next.delete(key); setParams(next); };
  const filtered = useMemo(() => products.filter((p) => `${p.name} ${p.producer} ${p.category}`.toLowerCase().includes(query.toLowerCase()) && (category === "All" || p.category === category) && (availability === "All" || p.availability === availability) && p.price <= max).sort((a,b) => sort === "price-low" ? a.price-b.price : sort === "price-high" ? b.price-a.price : a.name.localeCompare(b.name)), [query, category, availability, sort, max]);
  return <><PageHeader eyebrow="The local marketplace" title="Goods With a Sense of Place." copy="Browse prototype listings from Ethiopian makers and producer communities."/ >
    <div className="catalog-layout section-shell">
      <aside className="filters"><h2>Filter products</h2><label>Search<input value={query} onChange={(e) => set("q", e.target.value)} placeholder="Product or producer"/></label><label>Category<select value={category} onChange={(e) => set("category", e.target.value)}><option>All</option>{[...new Set(products.map((p) => p.category))].map((v) => <option key={v}>{v}</option>)}</select></label><label>Availability<select value={availability} onChange={(e) => set("availability", e.target.value)}><option>All</option><option>In stock</option><option>Low stock</option><option>Made to order</option><option>Unavailable</option></select></label><label>Maximum price <span>{formatETB(max)}</span><input type="range" min="500" max="8000" step="100" value={max} onChange={(e) => set("max", e.target.value)}/></label><button className="clear-button" onClick={() => setParams({})}>Clear all filters</button></aside>
      <section className="catalog-results"><div className="result-bar"><p>{filtered.length} products</p><label>Sort by<select value={sort} onChange={(e) => set("sort", e.target.value)}><option value="featured">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>{filtered.length ? <div className="product-grid catalog-grid">{filtered.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd}/>)}</div> : <EmptyState title="No products match those filters." text="Try broadening your search or resetting the filters." action="Clear filters" to="/products"/>}</section>
    </div></>;
}

function ProductDetail({ onAdd }: { onAdd: (id: string, quantity?: number) => void }) {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const [quantity, setQuantity] = useState(1);
  if (!product) return <NotFound type="product"/>;
  const categoryMatches = products.filter((p) => p.category === product.category && p.id !== product.id);
  const related = (categoryMatches.length >= 3 ? categoryMatches : products.filter((p) => p.id !== product.id)).slice(0,3);
  return <div className="detail-page section-shell"><nav className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/products">Products</Link><span>/</span><span>{product.name}</span></nav><section className="product-detail"><div className="detail-gallery"><img src={product.image} alt={product.name}/><div><img src={product.image} alt={`${product.name} detail view`}/><img src={product.image} alt={`${product.name} alternate view`}/></div></div><div className="detail-copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><Link className="producer-link" to={`/products?search=${encodeURIComponent(product.producer)}`}>By {product.producer}</Link><p className="detail-price">{formatETB(product.price)}</p><p className={`availability ${product.availability === "Unavailable" ? "unavailable" : ""}`}>{product.availability}</p><p className="detail-description">{product.description}</p><dl><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Fulfillment</dt><dd>Prototype listing; timing shown at checkout</dd></div></dl><div className="purchase-row"><Quantity value={quantity} setValue={setQuantity}/><button className="button primary" disabled={product.availability === "Unavailable"} onClick={() => onAdd(product.id, quantity)}>{product.availability === "Unavailable" ? "Currently unavailable" : "Add to bag"}</button></div><p className="prototype-note">No live inventory or payment connection is enabled in this prototype.</p></div></section><Related title="You may also like">{related.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd}/>)}</Related></div>;
}

function Quantity({ value, setValue, min = 1 }: { value: number; setValue: (value: number) => void; min?: number }) {
  return <div className="quantity" aria-label="Quantity selector"><button onClick={() => setValue(Math.max(min, value-1))} aria-label="Decrease quantity"><Icon name="minus" size={16}/></button><span aria-live="polite">{value}</span><button onClick={() => setValue(value+1)} aria-label="Increase quantity"><Icon name="plus" size={16}/></button></div>;
}

function TourismPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || ""; const type = params.get("type") || "All"; const location = params.get("location") || "All"; const sort = params.get("sort") || "name";
  const set = (key: string, value: string) => { const next = new URLSearchParams(params); value !== "All" && value !== "name" && value ? next.set(key,value) : next.delete(key); setParams(next); };
  const list = tourismListings.filter((x) => `${x.title} ${x.location} ${x.provider}`.toLowerCase().includes(q.toLowerCase()) && (type === "All" || x.type === type) && (location === "All" || x.location === location)).sort((a,b) => sort === "price" ? a.price-b.price : a.title.localeCompare(b.title));
  return <><PageHeader eyebrow="Travel with context" title="Find Your Way Into Ethiopia." copy="Discover sample stays, local guides, tours, and destinations—kept separate from the product marketplace."/><div className="listing-controls section-shell"><label><Icon name="search"/><input value={q} onChange={(e) => set("q",e.target.value)} placeholder="Search places or providers"/></label><select aria-label="Service type" value={type} onChange={(e) => set("type",e.target.value)}><option>All</option><option>Tour</option><option>Accommodation</option><option>Guide</option></select><select aria-label="Location" value={location} onChange={(e) => set("location",e.target.value)}><option>All</option>{[...new Set(tourismListings.map((x) => x.location))].map((x) => <option key={x}>{x}</option>)}</select><select aria-label="Sort tourism listings" value={sort} onChange={(e) => set("sort",e.target.value)}><option value="name">Sort: name</option><option value="price">Sort: price</option></select><button onClick={() => setParams({})}>Clear</button></div><section className="section-shell listing-section">{list.length ? <div className="tourism-grid">{list.map((item) => <TourismCard key={item.id} item={item}/>)}</div> : <EmptyState title="No travel services found." text="Try a different destination or service type." action="View all tourism" to="/tourism"/>}</section></>;
}

function TourismCard({ item }: { item: TourismListing }) {
  return <article className="tourism-card"><Link to={`/tourism/${item.id}`}><img src={item.image} alt={item.title}/></Link><div><p className="meta">{item.type} · {item.location}</p><h2><Link to={`/tourism/${item.id}`}>{item.title}</Link></h2><p>{item.summary}</p><span>By {item.provider}</span><div><strong>From {formatETB(item.price)}</strong><ArrowLink to={`/tourism/${item.id}`}>View details</ArrowLink></div></div></article>;
}

function TourismDetail() {
  const { id } = useParams(); const item = tourismListings.find((x) => x.id === id);
  if (!item) return <NotFound type="travel listing"/>;
  return <div className="editorial-detail"><div className="editorial-detail-image"><img src={item.image} alt={item.title}/></div><div className="editorial-detail-copy"><p className="eyebrow">{item.type} · {item.location}</p><h1>{item.title}</h1><p className="detail-lead">{item.summary}</p><dl><div><dt>Provider</dt><dd>{item.provider}</dd></div><div><dt>Starting price</dt><dd>{formatETB(item.price)}</dd></div><div><dt>Availability</dt><dd>Request current dates</dd></div></dl><p className="prototype-note">This is an illustrative tourism listing. Availability and service details are not confirmed.</p><Link className="button primary" to={`/booking?travel=${item.id}`}>Request details</Link><ArrowLink to="/tourism">Back to tourism</ArrowLink></div></div>;
}

function ServicesPage() {
  const [params,setParams] = useSearchParams(); const q=params.get("q")||""; const category=params.get("category")||"All"; const location=params.get("location")||"All"; const sort=params.get("sort")||"name";
  const set=(k:string,v:string)=>{const n=new URLSearchParams(params); v!=="All"&&v!=="name"&&v?n.set(k,v):n.delete(k);setParams(n)};
  const list=experiences.filter((x)=>`${x.title} ${x.host}`.toLowerCase().includes(q.toLowerCase())&&(category==="All"||x.category===category)&&(location==="All"||x.location===location)).sort((a,b)=>sort==="price"?a.price-b.price:a.title.localeCompare(b.title));
  return <><PageHeader eyebrow="Hosted with heart" title="Culture Is Something You Take Part In." copy="Browse prototype activities hosted by local people and providers. Reservations remain separate from product purchases."/><div className="listing-controls section-shell"><label><Icon name="search"/><input value={q} onChange={(e)=>set("q",e.target.value)} placeholder="Search experiences or hosts"/></label><select aria-label="Experience category" value={category} onChange={(e)=>set("category",e.target.value)}><option>All</option>{[...new Set(experiences.map((x)=>x.category))].map((x)=><option key={x}>{x}</option>)}</select><select aria-label="Experience location" value={location} onChange={(e)=>set("location",e.target.value)}><option>All</option>{[...new Set(experiences.map((x)=>x.location))].map((x)=><option key={x}>{x}</option>)}</select><select aria-label="Sort experiences" value={sort} onChange={(e)=>set("sort",e.target.value)}><option value="name">Sort: name</option><option value="price">Sort: price</option></select><button onClick={()=>setParams({})}>Clear</button></div><section className="section-shell listing-section">{list.length?<div className="experience-grid">{list.map((x)=><ExperienceCard key={x.id} experience={x}/>)}</div>:<EmptyState title="No experiences match." text="Try changing the location or activity type." action="View all experiences" to="/services"/>}</section></>;
}

function ExperienceDetail() {
  const {id}=useParams(); const item=experiences.find((x)=>x.id===id); if(!item)return <NotFound type="experience"/>;
  const related=experiences.filter((x)=>x.id!==item.id&&x.category===item.category).slice(0,3);
  return <div className="detail-page section-shell"><nav className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/services">Experiences</Link><span>/</span><span>{item.title}</span></nav><section className="experience-detail"><img src={item.image} alt={item.title}/><div><p className="eyebrow">{item.category} · {item.location}</p><h1>{item.title}</h1><p className="detail-lead">{item.description}</p><dl><div><dt>Host</dt><dd>{item.host}</dd></div><div><dt>Duration</dt><dd>{item.duration}</dd></div><div><dt>Price</dt><dd>{formatETB(item.price)} per person</dd></div><div><dt>Sample dates</dt><dd>{item.dates.map((d)=><span className="date-chip" key={d}>{new Date(`${d}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>)}</dd></div></dl><Link className="button primary" to={`/booking?experience=${item.id}`}>Book Experience</Link><p className="prototype-note">Dates and availability are sample data and are not confirmed until the prototype flow is completed.</p></div></section><Related title="Related experiences">{related.length?related.map((x)=><ExperienceCard key={x.id} experience={x}/>):experiences.filter((x)=>x.id!==item.id).slice(0,3).map((x)=><ExperienceCard key={x.id} experience={x}/>)}</Related></div>;
}

function Related({title,children}:{title:string;children:ReactNode}){return <section className="related"><div className="section-kicker">{title}</div><div className="related-grid">{children}</div></section>}

function BookingPage() {
  const [params]=useSearchParams(); const initial=params.get("experience")||experiences[0].id;
  const [experienceId,setExperienceId]=useState(initial); const item=experiences.find((x)=>x.id===experienceId)||experiences[0];
  const [date,setDate]=useState(item.dates[0]||""); const [guests,setGuests]=useState(1); const [step,setStep]=useState<"details"|"review"|"confirmed">("details"); const [errors,setErrors]=useState<Record<string,string>>({});
  const [form,setForm]=useState({name:"",email:"",phone:""});
  useEffect(()=>setDate(item.dates[0]||""),[experienceId]);
  const review=(e:FormEvent)=>{e.preventDefault();const next:Record<string,string>={};if(!date)next.date="Choose an available date.";if(!form.name.trim())next.name="Enter the lead visitor's name.";if(!/^[^@]+@[^@]+\.[^@]+$/.test(form.email))next.email="Enter a valid email address.";if(!form.phone.trim())next.phone="Enter a phone number.";setErrors(next);if(!Object.keys(next).length)setStep("review")};
  if(step==="confirmed")return <div className="flow-page section-shell"><div className="confirmation"><p className="eyebrow">Prototype request complete</p><h1>Your reservation request has been recorded.</h1><p>This prototype has reached its confirmation state. No real provider reservation or payment was made.</p><dl><div><dt>Experience</dt><dd>{item.title}</dd></div><div><dt>Date</dt><dd>{date}</dd></div><div><dt>Guests</dt><dd>{guests}</dd></div><div><dt>Prototype total</dt><dd>{formatETB(item.price*guests)}</dd></div></dl><Link className="button primary" to="/services">Explore more experiences</Link></div></div>;
  return <div className="flow-page section-shell"><div className="flow-heading"><p className="eyebrow">Reservation prototype · {step==="details"?"Step 1 of 2":"Step 2 of 2"}</p><h1>{step==="details"?"Plan your experience":"Review your request"}</h1><p>No payment is collected in this prototype.</p></div><div className="flow-layout">{step==="details"?<form className="form-card" onSubmit={review}>
    <Field label="Experience"><select value={experienceId} onChange={(e)=>setExperienceId(e.target.value)}>{experiences.map((x)=><option value={x.id} key={x.id}>{x.title}</option>)}</select></Field>
    <div className="form-row"><Field label="Available date" error={errors.date}><select value={date} onChange={(e)=>setDate(e.target.value)}><option value="">Choose a date</option>{item.dates.map((d)=><option key={d} value={d}>{new Date(`${d}T12:00:00`).toLocaleDateString()}</option>)}</select></Field><Field label="Guests"><input type="number" min="1" max="8" value={guests} onChange={(e)=>setGuests(Math.max(1,Number(e.target.value)))}/></Field></div>
    <Field label="Lead visitor name" error={errors.name}><input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></Field><Field label="Email address" error={errors.email}><input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></Field><Field label="Phone number" error={errors.phone}><input type="tel" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></Field><button className="button primary" type="submit">Review request</button>
  </form>:<div className="form-card review-card"><h2>Visitor and experience</h2><dl><div><dt>Experience</dt><dd>{item.title}</dd></div><div><dt>Date</dt><dd>{date}</dd></div><div><dt>Guests</dt><dd>{guests}</dd></div><div><dt>Lead visitor</dt><dd>{form.name}</dd></div><div><dt>Contact</dt><dd>{form.email}<br/>{form.phone}</dd></div></dl><div className="flow-actions"><button className="button secondary" onClick={()=>setStep("details")}>Edit details</button><button className="button primary" onClick={()=>setStep("confirmed")}>Submit prototype request</button></div></div>}<OrderSummary title={item.title} image={item.image} lines={[["Price per person",formatETB(item.price)],["Guests",String(guests)]]} total={item.price*guests}/></div></div>;
}

function Field({label,error,children}:{label:string;error?:string;children:ReactNode}){return <label className={`field ${error?"has-error":""}`}><span>{label}</span>{children}{error&&<small>{error}</small>}</label>}

function CartPage({ cart, setQuantity, remove }: { cart: Cart; setQuantity: (id:string,q:number)=>void; remove:(id:string)=>void }) {
  const items=Object.entries(cart).map(([id,quantity])=>({product:products.find((p)=>p.id===id),quantity})).filter((x):x is {product:Product;quantity:number}=>Boolean(x.product));
  const subtotal=items.reduce((sum,x)=>sum+x.product.price*x.quantity,0);
  if(!items.length)return <div className="section-shell flow-page"><EmptyState title="Your shopping bag is empty." text="Browse locally made goods and add something meaningful." action="Shop products" to="/products"/></div>;
  return <div className="flow-page section-shell"><div className="flow-heading"><p className="eyebrow">Physical products</p><h1>Your Shopping Bag</h1><p>Product purchases are handled separately from experience reservations.</p></div><div className="cart-layout"><section className="cart-items">{items.map(({product,quantity})=><article key={product.id}><Link to={`/products/${product.id}`}><img src={product.image} alt={product.name}/></Link><div><p className="maker">{product.producer}</p><h2><Link to={`/products/${product.id}`}>{product.name}</Link></h2><p>{formatETB(product.price)} each</p><Quantity value={quantity} setValue={(q)=>setQuantity(product.id,q)}/></div><div className="cart-line-total"><strong>{formatETB(product.price*quantity)}</strong><button onClick={()=>remove(product.id)} aria-label={`Remove ${product.name}`}><Icon name="trash" size={18}/> Remove</button></div></article>)}</section><div className="cart-summary"><h2>Bag summary</h2><p><span>Subtotal</span><strong>{formatETB(subtotal)}</strong></p><p><span>Delivery</span><span>Calculated at checkout</span></p><div><span>Estimated total</span><strong>{formatETB(subtotal)}</strong></div><Link className="button primary" to="/checkout">Continue to checkout</Link><ArrowLink to="/products">Keep shopping</ArrowLink></div></div></div>;
}

function CheckoutPage({cart,clearCart}:{cart:Cart;clearCart:()=>void}) {
  const navigate=useNavigate(); const items=Object.entries(cart).map(([id,q])=>({p:products.find((p)=>p.id===id),q})).filter((x):x is {p:Product;q:number}=>!!x.p); const subtotal=items.reduce((s,x)=>s+x.p.price*x.q,0); const delivery=items.length?250:0;
  const [step,setStep]=useState<"details"|"review"|"complete">("details"); const [errors,setErrors]=useState<Record<string,string>>({}); const [form,setForm]=useState({name:"",email:"",address:"",city:"",phone:""});
  if(!items.length&&step!=="complete")return <div className="flow-page section-shell"><EmptyState title="Your bag is empty." text="Add products before starting checkout." action="Shop products" to="/products"/></div>;
  const submit=(e:FormEvent)=>{e.preventDefault();const n:Record<string,string>={};Object.entries(form).forEach(([k,v])=>{if(!v.trim())n[k]="This field is required."});if(form.email&&!/^[^@]+@[^@]+\.[^@]+$/.test(form.email))n.email="Enter a valid email.";setErrors(n);if(!Object.keys(n).length)setStep("review")};
  const complete=()=>{clearCart();setStep("complete")};
  if(step==="complete")return <div className="flow-page section-shell"><div className="confirmation"><p className="eyebrow">Prototype order complete</p><h1>Your prototype order has been placed.</h1><p>No real payment was processed and no money was charged. This demonstrates the completion state only.</p><button className="button primary" onClick={()=>navigate("/products")}>Continue shopping</button></div></div>;
  return <div className="flow-page section-shell"><div className="flow-heading"><p className="eyebrow">Checkout prototype · {step==="details"?"Step 1 of 2":"Step 2 of 2"}</p><h1>{step==="details"?"Delivery details":"Review your order"}</h1><p>No real payment is collected.</p></div><div className="flow-layout">{step==="details"?<form className="form-card" onSubmit={submit}><Field label="Full name" error={errors.name}><input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></Field><Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></Field><Field label="Phone" error={errors.phone}><input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></Field><Field label="Delivery address" error={errors.address}><input value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/></Field><Field label="City" error={errors.city}><input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/></Field><button className="button primary">Review order</button></form>:<div className="form-card review-card"><h2>Delivery</h2><p>{form.name}<br/>{form.address}, {form.city}<br/>{form.phone}<br/>{form.email}</p><h2>Prototype payment</h2><p>Payment details are intentionally not collected. Completing this step does not charge you.</p><div className="flow-actions"><button className="button secondary" onClick={()=>setStep("details")}>Edit details</button><button className="button primary" onClick={complete}>Place prototype order</button></div></div>}<OrderSummary title={`${items.length} product${items.length===1?"":"s"}`} lines={[["Subtotal",formatETB(subtotal)],["Delivery",formatETB(delivery)]]} total={subtotal+delivery}/></div></div>;
}

function OrderSummary({title,image,lines,total}:{title:string;image?:string;lines:[string,string][];total:number}){return <aside className="order-summary">{image&&<img src={image} alt=""/>}<h2>{title}</h2>{lines.map(([a,b])=><p key={a}><span>{a}</span><span>{b}</span></p>)}<div><span>Prototype total</span><strong>{formatETB(total)}</strong></div></aside>}

function AboutPage(){return <main><section className="about-hero"><img src={images.hero} alt="A local producer in the Ethiopian highlands"/><div><p className="eyebrow">About OmoBridge</p><h1>A bridge between the people who make a place and those who come to know it.</h1></div></section><section className="about-story section-shell"><div><p className="eyebrow">Our purpose</p><h2>Commerce, travel, and culture—held together by people.</h2></div><div><p>OmoBridge is a prototype marketplace designed to connect Ethiopian producers and artisans with customers, while helping travelers discover local hosts, guides, and cultural experiences.</p><p>The two journeys remain distinct: physical products move through a shopping bag and checkout, while travel services use a reservation request built around dates, guests, and provider availability.</p></div></section><HomePeople/><HowItWorks/></main>}

function AuthPage({mode}:{mode:"login"|"register"}){
  const [loading,setLoading]=useState(false);const [message,setMessage]=useState("");const [errors,setErrors]=useState<Record<string,string>>({});const [form,setForm]=useState({name:"",email:"",password:""});
  const submit=(e:FormEvent)=>{e.preventDefault();const next:Record<string,string>={};if(mode==="register"&&!form.name.trim())next.name="Enter your name.";if(!/^[^@]+@[^@]+\.[^@]+$/.test(form.email))next.email="Enter a valid email.";if(form.password.length<6)next.password="Use at least 6 characters.";setErrors(next);if(Object.keys(next).length)return;setLoading(true);window.setTimeout(()=>{setLoading(false);setMessage(mode==="login"?"Prototype sign-in complete. No real account session was created.":"Prototype registration complete. No real account was created.")},700)};
  return <div className="auth-page"><div className="auth-image"><img src={images.woven} alt="Handwoven Ethiopian craft"/></div><div className="auth-panel"><Brand/><form onSubmit={submit}><p className="eyebrow">Prototype account</p><h1>{mode==="login"?"Welcome back":"Join OmoBridge"}</h1><p>{mode==="login"?"Sign in to view your prototype account.":"Create a prototype profile for shopping and reservations."}</p>{mode==="register"&&<Field label="Full name" error={errors.name}><input autoComplete="name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></Field>}<Field label="Email address" error={errors.email}><input type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></Field><Field label="Password" error={errors.password}><input type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/></Field><button className="button primary" disabled={loading}>{loading?"Please wait…":mode==="login"?"Sign in":"Create prototype account"}</button>{message&&<div className="form-success" role="status">{message}</div>}<p className="auth-switch">{mode==="login"?"New to OmoBridge?":"Already have an account?"} <Link to={mode==="login"?"/register":"/login"}>{mode==="login"?"Register":"Sign in"}</Link></p></form></div></div>
}

function NotFound({type="page"}:{type?:string}){return <div className="flow-page section-shell"><EmptyState title={`We couldn't find that ${type}.`} text="The link may be outdated, or this prototype listing may no longer exist." action="Return home" to="/"/></div>}

function AppShell(){
  const [cart,setCart]=useState<Cart>(()=>{try{return JSON.parse(localStorage.getItem("omobridge-cart")||"{}")}catch{return{}}});
  const [toast,setToast]=useState("");
  useEffect(()=>localStorage.setItem("omobridge-cart",JSON.stringify(cart)),[cart]);
  const add=(id:string,quantity=1)=>{const product=products.find((p)=>p.id===id);if(!product||product.availability==="Unavailable")return;setCart((c)=>({...c,[id]:(c[id]||0)+quantity}));setToast(`${product.name} added to your bag`);window.setTimeout(()=>setToast(""),2400)};
  const setQuantity=(id:string,q:number)=>setCart((c)=>({...c,[id]:Math.max(1,q)}));const remove=(id:string)=>setCart((c)=>{const n={...c};delete n[id];return n});const cartCount=Object.values(cart).reduce((a,b)=>a+b,0);
  const location=useLocation();useEffect(()=>window.scrollTo(0,0),[location.pathname]);
  return <div className="app"><Header cartCount={cartCount}/><Routes><Route path="/" element={<Home onAdd={add}/>}/><Route path="/products" element={<ProductsPage onAdd={add}/>}/><Route path="/products/:id" element={<ProductDetail onAdd={add}/>}/><Route path="/tourism" element={<TourismPage/>}/><Route path="/tourism/:id" element={<TourismDetail/>}/><Route path="/services" element={<ServicesPage/>}/><Route path="/experiences/:id" element={<ExperienceDetail/>}/><Route path="/booking" element={<BookingPage/>}/><Route path="/cart" element={<CartPage cart={cart} setQuantity={setQuantity} remove={remove}/>}/><Route path="/checkout" element={<CheckoutPage cart={cart} clearCart={()=>setCart({})}/>}/><Route path="/about" element={<AboutPage/>}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/><Route path="*" element={<NotFound/>}/></Routes><Footer/><div className={toast?"toast show":"toast"} role="status">{toast}</div></div>
}

export default function App(){return <BrowserRouter><AppShell/></BrowserRouter>}
