import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useParams
} from "react-router-dom";

import {
  Search,
  Plus,
  Package,
  ShieldCheck,
  MapPin,
  CalendarDays,
  LogOut,
  UserRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  ImagePlus,
  Trash2,
  Moon,
  Sun
} from "lucide-react";

import { api, token } from "./api";

const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

const categories = [
  "Electronics",
  "ID & Cards",
  "Books & Notes",
  "Accessories",
  "Stationery",
  "Clothing",
  "Bags",
  "Keys",
  "Other"
];

const getId = object => object?.id ?? object?._id;


// ==========================================
// MAIN APP
// ==========================================

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dark mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("cf_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cf_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(current =>
      current === "light" ? "dark" : "light"
    );
  };

  // Restore login session
  useEffect(() => {
    if (token()) {
      api("/auth/me")
        .then(data => setUser(data.user))
        .catch(() => {
          localStorage.removeItem("cf_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = () => {
    localStorage.removeItem("cf_token");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading">
        Opening CampusFind…
      </div>
    );
  }

  return (
    <AuthCtx.Provider value={{ user, setUser, logout }}>

      {/* HEADER */}

      <header className="topbar">

        <Link to="/" className="brand">
          <span className="brand-icon">
            <Package size={20} />
          </span>
          Campus<span>Find</span>
        </Link>

        <nav>
          <NavLink to="/">Explore</NavLink>

          {user && (
            <NavLink to="/dashboard">
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="nav-actions">

          {/* DARK MODE */}

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={
              theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
            aria-label={
              theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
          >
            {theme === "light"
              ? <Moon size={19} />
              : <Sun size={19} />
            }
          </button>

          {user ? (
            <>
              <span className="user-chip">
                <UserRound size={15} />
                {user.name?.split(" ")[0]}
              </span>

              <button
                className="icon-btn"
                title="Sign out"
                onClick={logout}
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <>
              <Link
                className="btn btn-ghost"
                to="/login"
              >
                Log in
              </Link>

              <Link
                className="btn btn-primary"
                to="/register"
              >
                Get started
              </Link>
            </>
          )}

        </div>
      </header>


      {/* MAIN CONTENT */}

      <main>
        <Routes>

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/login"
            element={<AuthPage mode="login" />}
          />

          <Route
            path="/register"
            element={<AuthPage mode="register" />}
          />

          <Route
            path="/new"
            element={
              <Protected>
                <NewItem />
              </Protected>
            }
          />

          <Route
            path="/item/:id"
            element={<ItemPage />}
          />

          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />

          <Route
            path="*"
            element={<Home />}
          />

        </Routes>
      </main>


      {/* FOOTER */}

      <footer>

        <div className="brand">
          <span className="brand-icon">
            <Package size={17} />
          </span>
          Campus<span>Find</span>
        </div>

        <span>
          Making campus a little more connected.
        </span>

        <span>
          Made with ❤️ by Atharv
        </span>

        <span>
          © {new Date().getFullYear()} CampusFind
        </span>

      </footer>

    </AuthCtx.Provider>
  );
}


// ==========================================
// PROTECTED ROUTE
// ==========================================

function Protected({ children }) {
  const { user } = useAuth();

  return user
    ? children
    : <AuthPage mode="login" />;
}


// ==========================================
// HOME PAGE
// ==========================================

function Home() {
  const [items, setItems] = useState([]);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  const [busy, setBusy] = useState(true);

  const { user } = useAuth();

  async function load() {
    setBusy(true);

    try {
      const params = new URLSearchParams({
        status: "all"
      });

      if (q.trim()) {
        params.set("q", q.trim());
      }

      if (type) {
        params.set("type", type);
      }

      if (category) {
        params.set("category", category);
      }

      if (location.trim()) {
        params.set("location", location.trim());
      }

      const data = await api(`/items?${params}`);

      setItems(data.items || []);

    } catch (error) {
      console.error("Failed to load listings:", error);
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [type, category]);

  return (
    <>

      {/* HERO SECTION */}

      <section className="hero">

        <div className="hero-glow" />

        <div className="hero-copy">

          <div className="eyebrow">
            <Sparkles size={14} />
            THE CAMPUS COMMUNITY NETWORK
          </div>

          <h1>
            Lost something?
            <br />
            <em>Find your way back.</em>
          </h1>

          <p>
            A smarter, safer way to reunite students with the
            things they misplace. Report it, search it, bring it home.
          </p>

          <div className="hero-buttons">

            <Link
              to="/new"
              className="btn btn-primary btn-large"
            >
              <Plus size={18} />
              Post an item
            </Link>

            <a
              href="#listings"
              className="btn btn-outline btn-large"
            >
              Explore listings
              <ArrowRight size={17} />
            </a>

          </div>

          <div className="trust-line">
            <ShieldCheck size={16} />
            Private verification keeps claims secure
          </div>

        </div>


        {/* HERO ART */}

        <div className="hero-art">

          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <div className="floating-card card-id">

            <div className="mini-icon purple">
              ▣
            </div>

            <div>
              <b>Student ID</b>
              <small>Library · 10:42 AM</small>
            </div>

            <span className="dot green" />

          </div>

          <div className="floating-card card-book">

            <div className="mini-icon orange">
              ▤
            </div>

            <div>
              <b>Physics notes</b>
              <small>Block C · Yesterday</small>
            </div>

            <span className="dot yellow" />

          </div>

          <div className="hero-cube">
            <Package size={72} strokeWidth={1.15} />
            <span>FOUND IT</span>
          </div>

          <div className="spark spark-a">✦</div>
          <div className="spark spark-b">✧</div>

        </div>

      </section>


      {/* PROCESS SECTION */}

      <section className="stats-strip">

        <div>
          <b>01</b>
          <span>Report what you lost</span>
        </div>

        <div>
          <b>02</b>
          <span>Discover matching finds</span>
        </div>

        <div>
          <b>03</b>
          <span>Verify & reunite</span>
        </div>

      </section>


      {/* LISTINGS */}

      <section
        className="content-section"
        id="listings"
      >

        <div className="section-heading">

          <div>
            <div className="eyebrow dark">
              COMMUNITY BOARD
            </div>

            <h2>Explore campus listings</h2>

            <p>
              Every post is a chance to return something important.
            </p>
          </div>

          {user && (
            <Link
              to="/new"
              className="btn btn-primary"
            >
              <Plus size={17} />
              Create listing
            </Link>
          )}

        </div>


        {/* FILTERS */}

        <div className="filters">

          <div className="search-box">
            <Search size={18} />

            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e =>
                e.key === "Enter" && load()
              }
              placeholder="Search items, keywords, places…"
            />
          </div>

          <select
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="">All posts</option>
            <option value="lost">Lost items</option>
            <option value="found">Found items</option>
          </select>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">All categories</option>

            {categories.map(category => (
              <option key={category}>
                {category}
              </option>
            ))}

          </select>

          <div className="search-box location-filter">
            <MapPin size={17} />

            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e =>
                e.key === "Enter" && load()
              }
              placeholder="Location"
            />
          </div>

          <button
            className="btn btn-dark"
            onClick={load}
          >
            Search
          </button>

        </div>


        {/* LISTING RESULTS */}

        {busy ? (

          <div className="empty">
            Loading listings…
          </div>

        ) : items.length ? (

          <div className="item-grid">

            {items.map(item => (
              <ItemCard
                item={item}
                key={getId(item)}
              />
            ))}

          </div>

        ) : (

          <div className="empty">

            <Package size={34} />

            <h3>No listings found</h3>

            <p>
              Try another search or be the first to post an item.
            </p>

            <Link
              to="/new"
              className="btn btn-primary"
            >
              Post an item
            </Link>

          </div>

        )}

      </section>


      {/* SAFETY BANNER */}

      <section className="safety-banner">

        <div className="safety-icon">
          <ShieldCheck size={27} />
        </div>

        <div>
          <b>Your details stay protected.</b>

          <p>
            Verification answers are private. Only the listing owner
            can review and approve a claim.
          </p>
        </div>

        <span className="safety-tag">
          SAFETY FIRST
        </span>

      </section>

    </>
  );
}


// ==========================================
// ITEM CARD
// ==========================================

function ItemCard({ item }) {
  const itemId = getId(item);

  return (
    <Link
      to={`/item/${itemId}`}
      className="item-card"
    >

      <div className="item-photo">

        {item.imageUrl ? (

          <img
            src={item.imageUrl}
            alt={item.title}
          />

        ) : (

          <div className="photo-placeholder">
            <Package size={35} />
            <span>NO PHOTO</span>
          </div>

        )}

        <span className={`type-pill ${item.type}`}>
          {item.type === "lost"
            ? "LOST ITEM"
            : "FOUND ITEM"}
        </span>

      </div>


      <div className="item-info">

        <div className="item-category">
          {item.category}
        </div>

        <h3>{item.title}</h3>

        <p>{item.description}</p>

        <div className="item-meta">

          <span>
            <MapPin size={14} />
            {item.location}
          </span>

          <span>
            <CalendarDays size={14} />
            {item.dateOccurred
              ? new Date(item.dateOccurred).toLocaleDateString()
              : "Date unavailable"}
          </span>

        </div>

      </div>

    </Link>
  );
}


// ==========================================
// AUTHENTICATION PAGE
// ==========================================

function AuthPage({ mode }) {
  const { setUser } = useAuth();

  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setError("");

    try {
      const data = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form)
      });

      localStorage.setItem("cf_token", data.token);

      setUser(data.user);

      nav("/dashboard");

    } catch (error) {
      setError(error.message);

    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">

      <div className="auth-panel">

        <div className="eyebrow dark">
          WELCOME TO CAMPUSFIND
        </div>

        <h2>
          {mode === "login"
            ? "Welcome back."
            : "Join your campus community."}
        </h2>

        <p>
          {mode === "login"
            ? "Sign in to manage your listings and claims."
            : "Create an account to help lost things find their way home."}
        </p>


        <form onSubmit={submit}>

          {mode === "register" && (

            <label>
              Full name

              <input
                required
                value={form.name}
                onChange={e =>
                  setForm({
                    ...form,
                    name: e.target.value
                  })
                }
                placeholder="Your name"
              />

            </label>

          )}


          <label>
            Campus email

            <input
              required
              type="email"
              value={form.email}
              onChange={e =>
                setForm({
                  ...form,
                  email: e.target.value
                })
              }
              placeholder="you@college.edu"
            />

          </label>


          <label>
            Password

            <input
              required
              minLength="8"
              type="password"
              value={form.password}
              onChange={e =>
                setForm({
                  ...form,
                  password: e.target.value
                })
              }
              placeholder="At least 8 characters"
            />

          </label>


          {error && (
            <div className="error">
              {error}
            </div>
          )}


          <button
            disabled={busy}
            className="btn btn-primary btn-full"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>

        </form>


        <div className="auth-switch">

          {mode === "login"
            ? "New to CampusFind?"
            : "Already have an account?"}

          {" "}

          <Link
            to={mode === "login" ? "/register" : "/login"}
          >
            {mode === "login"
              ? "Create an account"
              : "Sign in"}
          </Link>

        </div>

      </div>


      <div className="auth-aside">

        <div className="aside-mark">
          <Package size={42} />
        </div>

        <h3>
          Good things find their way back.
        </h3>

        <p>
          A community-powered lost and found space built for campus life.
        </p>

      </div>

    </div>
  );
}


// ==========================================
// CREATE NEW ITEM
// ==========================================

function NewItem() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    type: "lost",
    title: "",
    description: "",
    category: "Electronics",
    location: "",
    dateOccurred: new Date().toISOString().slice(0, 10),
    verificationQuestion: "",
    verificationAnswer: ""
  });

  const [photo, setPhoto] = useState(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  };

  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setError("");

    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, value);
    });

    if (photo) {
      data.append("photo", photo);
    }

    try {
      const result = await api("/items", {
        method: "POST",
        body: data
      });

      nav(`/item/${getId(result.item)}`);

    } catch (error) {
      setError(error.message);

    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-page">

      <div className="eyebrow dark">
        ADD TO THE COMMUNITY BOARD
      </div>

      <h2>Make a listing</h2>

      <p className="muted">
        Share enough detail to help someone recognize the item.
        Keep one identifying detail private.
      </p>


      <form
        className="listing-form"
        onSubmit={submit}
      >

        {/* ITEM TYPE */}

        <div className="type-toggle">

          <button
            type="button"
            className={
              form.type === "lost" ? "selected" : ""
            }
            onClick={() => set("type", "lost")}
          >
            I lost something
          </button>

          <button
            type="button"
            className={
              form.type === "found" ? "selected" : ""
            }
            onClick={() => set("type", "found")}
          >
            I found something
          </button>

        </div>


        {/* ITEM DETAILS */}

        <div className="form-grid">

          <label>
            Item name *

            <input
              required
              value={form.title}
              onChange={e =>
                set("title", e.target.value)
              }
              placeholder="e.g. Black scientific calculator"
            />
          </label>


          <label>
            Category *

            <select
              value={form.category}
              onChange={e =>
                set("category", e.target.value)
              }
            >
              {categories.map(category => (
                <option key={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>


          <label className="span-two">
            Description *

            <textarea
              required
              maxLength="1200"
              value={form.description}
              onChange={e =>
                set("description", e.target.value)
              }
              placeholder="Describe the item, visible features and any helpful context…"
            />
          </label>


          <label>
            Location *

            <input
              required
              value={form.location}
              onChange={e =>
                set("location", e.target.value)
              }
              placeholder="e.g. Main library, 2nd floor"
            />
          </label>


          <label>
            Date *

            <input
              required
              type="date"
              value={form.dateOccurred}
              onChange={e =>
                set("dateOccurred", e.target.value)
              }
            />
          </label>


          {/* IMAGE UPLOAD */}

          <label className="span-two upload-label">

            <span>
              <ImagePlus size={20} />

              Add a photo

              <small>
                JPG, PNG or WEBP · Max 5 MB
              </small>
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e =>
                setPhoto(e.target.files?.[0] || null)
              }
            />

            {photo && (
              <small>{photo.name}</small>
            )}

          </label>

        </div>


        {/* PRIVATE VERIFICATION */}

        <div className="private-box">

          <div className="private-heading">
            <ShieldCheck size={19} />
            Private ownership verification
          </div>

          <p>
            This question is not shown publicly. Claimants must answer it,
            and only you can review the result.
          </p>


          <label>
            Verification question *

            <input
              required
              value={form.verificationQuestion}
              onChange={e =>
                set("verificationQuestion", e.target.value)
              }
              placeholder="e.g. What sticker is on the back?"
            />
          </label>


          <label>
            Correct answer *

            <input
              required
              value={form.verificationAnswer}
              onChange={e =>
                set("verificationAnswer", e.target.value)
              }
              placeholder="Only you know this answer"
            />
          </label>


          <small>
            Tip: choose a detail that isn't visible in the photo
            or public description.
          </small>

        </div>


        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {/* FORM ACTIONS */}

        <div className="form-actions">

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => nav(-1)}
          >
            Cancel
          </button>

          <button
            disabled={busy}
            className="btn btn-primary"
          >
            {busy
              ? "Publishing…"
              : "Publish listing"}

            <ArrowRight size={17} />
          </button>

        </div>

      </form>

    </div>
  );
}


// ==========================================
// ITEM DETAILS PAGE
// ==========================================

function ItemPage() {
  const { id } = useParams();

  const { user } = useAuth();

  const [item, setItem] = useState(null);

  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");

  const [question, setQuestion] = useState("");

  const [matches, setMatches] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load item
  useEffect(() => {
    setItem(null);
    setError("");

    api(`/items/${id}`)
      .then(data => setItem(data.item))
      .catch(error => setError(error.message));

  }, [id]);


  // Load private verification question
  useEffect(() => {
    setQuestion("");

    if (!user) return;

    api(`/items/${id}/private-question`)
      .then(data => setQuestion(data.question))
      .catch(() => setQuestion(""));

  }, [id, user]);


  // Load possible matches
  useEffect(() => {
    setMatches([]);

    if (!user) return;

    api(`/items/${id}/matches`)
      .then(data => setMatches(data.matches || []))
      .catch(() => setMatches([]));

  }, [id, user]);


  // Submit claim
  async function claim(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const data = await api(`/items/${id}/claims`, {
        method: "POST",
        body: JSON.stringify({
          answer,
          explanation
        })
      });

      setMessage(data.message);

      setItem(current => ({
        ...current,
        status: "pending"
      }));

    } catch (error) {
      setError(error.message);
    }
  }


  if (!item) {
    return (
      <div className="loading">
        {error || "Loading item…"}
      </div>
    );
  }


  const mine = user &&
    String(getId(item.owner)) === String(user.id);


  return (
    <div className="detail-page">

      <Link
        to="/"
        className="back-link"
      >
        ← Back to listings
      </Link>


      <div className="detail-grid">


        {/* ITEM IMAGE */}

        <div className="detail-image">

          {item.imageUrl ? (

            <img
              src={item.imageUrl}
              alt={item.title}
            />

          ) : (

            <div className="photo-placeholder">
              <Package size={60} />
              <span>NO PHOTO</span>
            </div>

          )}

        </div>


        {/* ITEM INFORMATION */}

        <div className="detail-copy">

          <span className={`type-pill inline ${item.type}`}>
            {item.type.toUpperCase()} ITEM
          </span>

          <div className="item-category">
            {item.category}
          </div>

          <h2>{item.title}</h2>

          <p>{item.description}</p>


          {/* ITEM FACTS */}

          <div className="detail-facts">

            <span>
              <MapPin size={17} />
              {item.location}
            </span>

            <span>
              <CalendarDays size={17} />

              {item.dateOccurred
                ? new Date(item.dateOccurred).toLocaleDateString()
                : "Date unavailable"}
            </span>

            <span>
              <UserRound size={17} />
              {item.owner?.name || "Campus member"}
            </span>

          </div>


          <div className="status-line">
            Status: <b>{item.status}</b>
          </div>


          {/* OWNER VIEW */}

          {mine ? (

            <div className="notice">
              <ShieldCheck size={19} />

              This is your listing. Review incoming claims
              from your dashboard.
            </div>

          ) : user && item.status === "open" ? (


            /* CLAIM FORM */

            <form
              className="claim-box"
              onSubmit={claim}
            >

              <h3>
                Think this belongs to you?
              </h3>

              <p>
                Submit a claim with the private identifying detail
                and explain why you believe it's yours.
              </p>


              <label>
                {question || "Private verification answer"}

                <input
                  required
                  value={answer}
                  onChange={e =>
                    setAnswer(e.target.value)
                  }
                  placeholder="Your answer"
                />
              </label>


              <label>
                Why is this your item?

                <textarea
                  required
                  value={explanation}
                  onChange={e =>
                    setExplanation(e.target.value)
                  }
                  placeholder="Share a few details only the owner would know…"
                />
              </label>


              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              {message && (
                <div className="success">
                  {message}
                </div>
              )}


              <button className="btn btn-primary btn-full">
                Submit secure claim
              </button>

            </form>


          ) : !user ? (

            <div className="notice">
              Sign in to submit a claim.
              {" "}
              <Link to="/login">Log in</Link>
            </div>

          ) : (

            <div className="notice">
              This listing is not accepting claims right now.
            </div>

          )}


          {/* POSSIBLE MATCHES */}

          {!mine && matches.length > 0 && (

            <div className="matches">

              <h3>
                <Sparkles size={17} />
                Possible matches
              </h3>

              {matches.slice(0, 3).map(match => {

                const matchedItem = match.item;
                const matchedId = getId(matchedItem);

                if (!matchedItem || !matchedId) {
                  return null;
                }

                return (
                  <Link
                    key={matchedId}
                    to={`/item/${matchedId}`}
                  >
                    <span>
                      {matchedItem.title}
                    </span>

                    <b>
                      {match.score}% match
                    </b>

                  </Link>
                );
              })}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}


// ==========================================
// USER DASHBOARD
// ==========================================

function Dashboard() {
  const { user } = useAuth();

  const [mine, setMine] = useState([]);
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);

  const [tab, setTab] = useState("listings");

  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState(null);


  // Load dashboard data
  async function load() {
    try {
      setError("");

      const [itemsData, sentData, receivedData] =
        await Promise.all([
          api("/items?status=all"),
          api("/claims/mine"),
          api("/claims/received")
        ]);


      // Filter current user's listings
      setMine(
        (itemsData.items || []).filter(
          item =>
            String(getId(item.owner)) === String(user.id)
        )
      );

      setSent(sentData.claims || []);

      setReceived(receivedData.claims || []);

    } catch (error) {
      setError(error.message);
    }
  }


  useEffect(() => {
    load();
  }, []);


  // Approve or reject claim
  async function decide(id, status) {
    try {
      setError("");

      await api(`/claims/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      await load();

    } catch (error) {
      setError(error.message);
    }
  }


  // Delete listing
  async function deleteItem(item) {
    const itemId = getId(item);

    const confirmed = window.confirm(
      `Delete this ${item.type} listing: "${item.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(itemId);
    setError("");

    try {
      await api(`/items/${itemId}`, {
        method: "DELETE"
      });

      setMine(current =>
        current.filter(
          listing => String(getId(listing)) !== String(itemId)
        )
      );

    } catch (error) {
      setError(
        error.message || "Could not delete this listing."
      );

    } finally {
      setDeletingId(null);
    }
  }


  return (
    <div className="dashboard">


      {/* DASHBOARD HEADER */}

      <div className="section-heading">

        <div>

          <div className="eyebrow dark">
            YOUR CAMPUS ACTIVITY
          </div>

          <h2>
            Hey, {user.name?.split(" ")[0]} 👋
          </h2>

          <p>
            Keep track of your listings and item recovery journey.
          </p>

        </div>


        <Link
          to="/new"
          className="btn btn-primary"
        >
          <Plus size={17} />
          New listing
        </Link>

      </div>


      {/* DASHBOARD STATS */}

      <div className="dash-stats">

        <div>
          <Package />
          <b>{mine.length}</b>
          <span>Your listings</span>
        </div>

        <div>
          <ShieldCheck />
          <b>{sent.length}</b>
          <span>Claims submitted</span>
        </div>

        <div>
          <UserRound />
          <b>{received.length}</b>
          <span>Claims received</span>
        </div>

      </div>


      {/* DASHBOARD TABS */}

      <div className="tabs">

        {[
          ["listings", "My listings"],
          ["received", "Claims received"],
          ["sent", "Claims submitted"]
        ].map(([value, label]) => (

          <button
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
            key={value}
          >
            {label}
          </button>

        ))}

      </div>


      {error && (
        <div className="error">
          {error}
        </div>
      )}


      {/* MY LISTINGS */}

      {tab === "listings" && (

        <div className="dashboard-list">

          {mine.map(item => {

            const itemId = getId(item);

            return (
              <div
                className="dash-row"
                key={itemId}
              >

                <div className="dash-thumb">

                  {item.imageUrl
                    ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                      />
                    )
                    : <Package />
                  }

                </div>


                <div className="dash-main">

                  <b>{item.title}</b>

                  <span>
                    {item.type} · {item.location}
                  </span>

                </div>


                <span className="status-chip">
                  {item.status}
                </span>


                <Link
                  className="btn btn-ghost btn-small"
                  to={`/item/${itemId}`}
                >
                  View
                </Link>


                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  title={`Delete ${item.type} listing`}
                  onClick={() => deleteItem(item)}
                  disabled={deletingId === itemId}
                >
                  <Trash2 size={15} />

                  {deletingId === itemId
                    ? "Deleting…"
                    : "Delete"
                  }

                </button>

              </div>
            );
          })}


          {!mine.length && (
            <div className="empty">
              You haven't posted any items yet.
            </div>
          )}

        </div>

      )}


      {/* CLAIMS RECEIVED */}

      {tab === "received" && (

        <div className="dashboard-list">

          {received.map(claim => {

            const claimId = getId(claim);

            return (
              <div
                className="claim-row"
                key={claimId}
              >

                <div className="dash-main">

                  <b>
                    {claim.item?.title || "Listing"}
                  </b>

                  <span>
                    Claim by {claim.claimant?.name}
                    {" "}
                    ({claim.claimant?.email})
                  </span>

                  <small>
                    {claim.explanation}
                  </small>

                  <small>
                    Private verification:{" "}
                    {claim.answerCorrect
                      ? "Answer matched"
                      : "Answer did not match"}
                  </small>

                </div>


                <span className="status-chip">
                  {claim.status}
                </span>


                {claim.status === "pending" && (

                  <div className="decision">

                    <button
                      title="Approve"
                      disabled={!claim.answerCorrect}
                      onClick={() =>
                        decide(claimId, "approved")
                      }
                    >
                      <CheckCircle2 />
                    </button>


                    <button
                      title="Reject"
                      onClick={() =>
                        decide(claimId, "rejected")
                      }
                    >
                      <XCircle />
                    </button>

                  </div>

                )}

              </div>
            );
          })}


          {!received.length && (
            <div className="empty">
              No one has claimed your listings yet.
            </div>
          )}

        </div>

      )}


      {/* CLAIMS SUBMITTED */}

      {tab === "sent" && (

        <div className="dashboard-list">

          {sent.map(claim => {

            const claimId = getId(claim);

            return (
              <div
                className="dash-row"
                key={claimId}
              >

                <div className="dash-main">

                  <b>
                    {claim.item?.title || "Listing"}
                  </b>

                  <span>
                    Your claim · {claim.item?.location}
                  </span>

                </div>

                <span className="status-chip">
                  {claim.status}
                </span>

              </div>
            );
          })}


          {!sent.length && (
            <div className="empty">
              You haven't submitted any claims yet.
            </div>
          )}

        </div>

      )}

    </div>
  );
}


export default App;
