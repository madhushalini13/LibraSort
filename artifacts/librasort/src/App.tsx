import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Database, GitCompareArrows,
  GraduationCap, Grid2X2, History, Info, Layers3, Library, LockKeyhole, LogOut, Menu,
  Moon, Pencil, Plus, Search, Settings2, ShieldCheck, Sparkles, Sun, Trash2, X,
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  BookStatus, OptimizationCriteria, getGetBooksQueryKey, getGetDashboardQueryKey,
  getGetOptimizationHistoryQueryKey, getGetProfileQueryKey, getGetBookQueryKey,
  useCreateBook, useDeleteBook, useGetBook, useGetBooks, useGetDashboard,
  getGetOptimizationQueryKey, useGetOptimization, useGetOptimizationHistory, useGetProfile, useHealthCheck,
  useRunOptimization, useUpdateBook, useUpdateProfile,
} from '@workspace/api-client-react';
import type { Book, BookInput, BookUpdate, Optimization, ProfileUpdate } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'dark',
  toggleTheme: () => undefined,
});

function readInitialTheme(): Theme {
  let theme: Theme = 'dark';
  try {
    theme = window.localStorage.getItem('librasort-theme') === 'light' ? 'light' : 'dark';
  } catch {
    // Keep the dark default when storage is unavailable.
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  return theme;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem('librasort-theme', theme);
    } catch {
      // The selected theme still applies for this session.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  return useContext(ThemeContext);
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

function clerkAppearance(theme: Theme) {
  const light = theme === 'light';
  return {
    theme: shadcn,
    cssLayerName: 'clerk',
    options: {
      logoPlacement: 'inside' as const,
      logoLinkUrl: basePath || '/',
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    },
    variables: {
      colorPrimary: light ? '#087f9f' : '#42c9f3',
      colorForeground: light ? '#17263b' : '#e2edf5',
      colorMutedForeground: light ? '#5d7085' : '#93a9bb',
      colorDanger: light ? '#bd3f40' : '#e97470',
      colorBackground: light ? '#ffffff' : '#0c1b2b',
      colorInput: light ? '#ffffff' : '#091725',
      colorInputForeground: light ? '#17263b' : '#e2edf5',
      colorNeutral: light ? '#d3deea' : '#29445b',
      fontFamily: 'Manrope, sans-serif',
      borderRadius: '0.65rem',
    },
    elements: {
      rootBox: 'w-full flex justify-center',
      cardBox: `rounded-2xl w-[440px] max-w-full overflow-hidden border ${light ? 'bg-white border-[#d6e0eb]' : 'bg-[#0c1b2b] border-[#29445b]'}`,
      card: '!shadow-none !border-0 !bg-transparent !rounded-none',
      footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
      headerTitle: `font-semibold tracking-tight ${light ? 'text-[#17263b]' : 'text-[#e2edf5]'}`,
      headerSubtitle: light ? 'text-[#5d7085]' : 'text-[#93a9bb]',
      socialButtonsBlockButtonText: `font-semibold ${light ? 'text-[#263b52]' : 'text-[#d8e5ee]'}`,
      formFieldLabel: light ? 'text-[#41566e]' : 'text-[#b8c9d6]',
      footerActionLink: light ? 'text-[#087f9f] font-semibold' : 'text-[#55d1f2] font-semibold',
      footerActionText: light ? 'text-[#5d7085]' : 'text-[#93a9bb]',
      dividerText: light ? 'text-[#697d92]' : 'text-[#8197aa]',
      identityPreviewEditButton: light ? 'text-[#087f9f]' : 'text-[#55d1f2]',
      formFieldSuccessText: light ? 'text-[#17734f]' : 'text-[#70d5b1]',
      alertText: light ? 'text-[#9e3035]' : 'text-[#ffc0ba]',
      logoBox: 'mb-2',
      logoImage: 'rounded-md',
      socialButtonsBlockButton: light
        ? 'bg-[#f5f8fc] border border-[#d6e0eb] hover:bg-[#edf3f8]'
        : 'bg-[#12263a] border border-[#29445b] hover:bg-[#173248]',
      formButtonPrimary: `text-[#06202b] ${light ? 'bg-[#45c2e3] hover:bg-[#69d0eb]' : 'bg-[#42c9f3] hover:bg-[#75dcf9]'}`,
      formFieldInput: light
        ? 'bg-white border-[#d6e0eb] text-[#17263b]'
        : 'bg-[#091725] border-[#29445b] text-[#e2edf5]',
      footerAction: `border-t ${light ? 'border-[#dce4ed]' : 'border-[#29445b]'}`,
      dividerLine: light ? 'bg-[#d6e0eb]' : 'bg-[#29445b]',
      alert: light ? 'bg-[#fff0ef] border-[#edc2c0]' : 'bg-[#542a32] border-[#87434a]',
      otpCodeFieldInput: light
        ? 'bg-white border-[#d6e0eb] text-[#17263b]'
        : 'bg-[#091725] border-[#29445b] text-[#e2edf5]',
      formFieldRow: 'mb-4',
      main: 'gap-4',
    },
  };
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'light'}
      title={`Switch to ${nextTheme} mode`}
      data-testid="button-theme-toggle"
    >
      <Icon size={15} aria-hidden="true" />
      <span>{nextTheme} mode</span>
    </button>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return <span className={`brand${light ? ' brand-light' : ''}`}><span className="brand-mark"><BookOpen size={17} /></span><span>LibraSort</span></span>;
}

function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return <div className="panel" aria-label="Loading"><div className="skeleton skeleton-line" style={{ width: '34%' }} />{Array.from({ length: rows }, (_, i) => <div className="skeleton skeleton-line" key={i} style={{ width: `${90 - (i % 3) * 13}%` }} />)}</div>;
}

function ErrorMessage({ retry, message = 'We couldn’t load this view.' }: { retry: () => void; message?: string }) {
  return <div className="error-state" role="alert"><span>{message} Your records are unchanged.</span><button className="button button-danger" onClick={retry} data-testid="button-retry">Retry</button></div>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><div><div className="empty-icon"><Library size={20} /></div><b>{title}</b><p>{detail}</p>{action}</div></div>;
}

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  const prevUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (prevUserId.current !== undefined && prevUserId.current !== id) cache.clear();
    prevUserId.current = id;
  }), [addListener, cache]);
  return null;
}

function SignInPage() {
  return <div className="app-frame auth-frame"><div className="auth-brand"><Link href="/"><Brand /></Link><div className="auth-controls"><ThemeToggle /><span className="secure-tag"><LockKeyhole size={13} /> PRIVATE BY DESIGN</span></div></div><div className="auth-wrap"><div className="auth-aside"><span className="small-caps">Your reading, in order</span><h1>A clearer view of your library.</h1><p>Keep your personal collection close, and make the structure behind it visible.</p></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div></div>;
}

function SignUpPage() {
  return <div className="app-frame auth-frame"><div className="auth-brand"><Link href="/"><Brand /></Link><div className="auth-controls"><ThemeToggle /><span className="secure-tag"><LockKeyhole size={13} /> PRIVATE BY DESIGN</span></div></div><div className="auth-wrap"><div className="auth-aside"><span className="small-caps">Start with your own records</span><h1>Build a library that thinks with you.</h1><p>Every book and every arrangement belongs to your account alone.</p></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div></div>;
}

function LandingPage() {
  const health = useHealthCheck();
  return <main className="app-frame landing">
      <header className="site-header"><Link href="/" aria-label="LibraSort home"><Brand /></Link><nav className="public-nav"><ThemeToggle /><Link href="/about" className="nav-about">The method</Link><Link href="/sign-in" data-testid="link-sign-in">Sign in</Link><Link href="/sign-up" className="button button-primary" data-testid="link-get-started">Create account <ArrowRight size={14} /></Link></nav></header>
    <section className="hero">
      <div><div className="eyebrow">Personal library · Algorithmic order</div><h1>Your books.<br />A better <em>arrangement.</em></h1><p className="hero-copy">A private place for your collection, with a real sorting engine that turns data structures and algorithms into a library you can understand.</p><div className="hero-actions"><Link href="/sign-up" className="button button-primary" data-testid="link-start-library">Start your library <ArrowRight size={15} /></Link><Link href="/about" className="button button-secondary" data-testid="link-explore-method">Explore the method</Link></div><div className="hero-foot">{health.isLoading ? 'CHECKING SERVICE STATUS' : health.isError ? 'SERVICE STATUS UNAVAILABLE' : `SERVICE ${health.data?.status?.toUpperCase() ?? 'READY'} · YOUR DATA STAYS YOURS`}</div></div>
      <div className="hero-visual" aria-label="Abstract library shelf illustration"><div className="orbit" /><div className="visual-tag tag-top">OPTIMIZATION<strong>Deterministic DAA</strong></div><div className="visual-tag tag-bottom">YOUR COLLECTION<strong>One account. One library.</strong></div><div className="shelf-art"><div className="book-row"><span className="book-spine spine-a" /><span className="book-spine spine-b" /><span className="book-spine spine-c" /><span className="book-spine spine-d" /><span className="book-spine spine-e" /></div><div className="shelf-board" /><div className="shelf-caption"><span>Collection structure</span><span>01 / your own</span></div></div></div>
    </section>
    <section className="section"><div className="section-top"><div><div className="eyebrow">Built to be understood</div><h2>Not just sorted.<br />Explained.</h2></div><p className="section-intro">LibraSort connects everyday collection management with the algorithms behind it. Every optimization is a real operation on your own book records.</p></div><div className="principles">
      <article className="principle"><span className="principle-index">01</span><div><h3>A private collection, not a demo</h3><p>Add and manage your real books. Your account is the boundary: no shared catalogue, no sample content, no invented activity.</p></div></article>
      <article className="principle"><span className="principle-index">02</span><div><h3>Deterministic by design</h3><p>Choose a sort criterion and run the API-backed optimization. Inspect the actual before and after order, operation count, and complexity.</p></div></article>
      <article className="principle"><span className="principle-index">03</span><div><h3>Every position has a purpose</h3><p>Explore how grouping and shelf allocation translate an algorithm’s ordering into physical-looking shelf and position assignments.</p></div></article>
      <article className="principle"><span className="principle-index">04</span><div><h3>Made for the curious</h3><p>Use a personal library as a concrete way to study sorting, complexity, and the trade-offs behind data organization.</p></div></article>
    </div></section>
    <section className="section" style={{ paddingTop: 15 }}><div className="section-top"><div><div className="eyebrow">Your next step</div><h2>Begin with one book.</h2></div><Link href="/sign-up" className="button button-primary">Create your account <ArrowRight size={14} /></Link></div></section>
    <footer className="public-footer"><Link href="/" aria-label="LibraSort home"><Brand /></Link><span>Secure personal library · DAA exploration</span><Link href="/about" className="quiet-link">About LibraSort</Link></footer>
  </main>;
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Grid2X2 },
  { href: '/library', label: 'My library', icon: Library },
  { href: '/optimization', label: 'Optimize order', icon: Sparkles },
  { href: '/optimization/history', label: 'Run history', icon: History },
  { href: '/about', label: 'About the method', icon: GraduationCap },
  { href: '/profile', label: 'Profile', icon: Settings2 },
];

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Account';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const nav = <>{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={location === href || (href === '/library' && location.startsWith('/library/')) || (href === '/optimization/history' && location.startsWith('/optimization/history/')) ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon size={16} />{label}</Link>)}</>;
  return <div className="workspace">
    <aside className="sidebar"><Link href="/dashboard"><Brand /></Link><div className="side-label">Workspace</div><nav className="side-nav">{nav}</nav><div className="sidebar-bottom"><div className="sidebar-note"><b>Algorithms, made tangible</b><span>See your own collection become a working example of data organization.</span></div><div className="profile-mini"><div className="avatar">{initials}</div><div><b>{name}</b><small>Personal account</small></div></div></div></aside>
     <div className="workspace-main"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)} data-testid="button-mobile-menu"><Menu size={17} /></button><div className="crumb">LIBRASORT <span style={{ color: 'hsl(var(--muted-foreground))' }}>/</span> PRIVATE WORKSPACE</div><div className="topbar-right"><ThemeToggle /><span className="secure-tag"><span className="live-dot" /> YOUR SESSION IS PRIVATE</span></div></header>{menuOpen && <nav className="mobile-nav">{nav}</nav>}{children}</div>
  </div>;
}

function Protected({ children }: { children: ReactNode }) {
  return <><Show when="signed-in"><AppShell>{children}</AppShell></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="small-caps">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function DashboardPage() {
  const query = useGetDashboard();
  const summary = query.data;
  const maxShelf = Math.max(1, ...(summary?.shelves.map((s) => s.count) ?? [1]));
  return <main className="page-content">
    <PageHeading eyebrow="Personal workspace" title="Your library, in focus." description="An honest overview of the books and arrangements in your collection." action={<Link href="/library" className="button button-primary"><Plus size={15} /> Manage books</Link>} />
    {query.isLoading ? <><div className="grid-metrics">{[1, 2, 3].map((i) => <div className="skeleton" key={i} style={{ height: 125 }} />)}</div><LoadingPanel /></> : query.isError || !summary ? <ErrorMessage retry={() => query.refetch()} message="Your dashboard could not be loaded." /> : <>
      <div className="grid-metrics"><div className="metric"><div className="metric-label">Books in your library</div><div className="metric-value" data-testid="metric-total-books">{summary.totalBooks}</div><div className="metric-foot">PERSONAL RECORDS</div></div><div className="metric"><div className="metric-label">Categories represented</div><div className="metric-value" data-testid="metric-category-count">{summary.categoryCount}</div><div className="metric-foot">DISTINCT GROUPS</div></div><div className="metric"><div className="metric-label">Shelves in use</div><div className="metric-value" data-testid="metric-shelf-count">{summary.shelfCount}</div><div className="metric-foot">ALLOCATED LOCATIONS</div></div></div>
      <div className="dashboard-columns">
        <section className="panel"><div className="panel-head"><div><div className="panel-title">Recently added</div><div className="panel-subtitle">Latest records from your library</div></div><Link href="/library" className="button button-ghost">View library <ArrowRight size={13} /></Link></div>
          {summary.recentBooks.length ? <div className="book-list">{summary.recentBooks.map((book) => <BookLine book={book} key={book.id} />)}</div> : <EmptyState title="Your shelf starts here" detail="Add your first book to see your library take shape. Nothing is pre-filled." action={<Link href="/library" className="button button-primary"><Plus size={14} /> Add a book</Link>} />}
        </section>
        <section className="panel"><div className="panel-head"><div><div className="panel-title">Shelf allocation</div><div className="panel-subtitle">Your current distribution by shelf</div></div><Layers3 size={17} color="#54c7e8" /></div>
          {summary.shelves.length ? <div className="shelf-bars">{summary.shelves.map((shelf) => <div className="shelf-row" key={shelf.shelf}><span>{shelf.shelf}</span><div className="shelf-track"><div className="shelf-fill" style={{ width: `${Math.max(5, shelf.count / maxShelf * 100)}%` }} /></div><b>{shelf.count}</b></div>)}</div> : <EmptyState title="No shelf allocation yet" detail="Books and their assigned locations will appear here." />}
        </section>
      </div>
      <section className="panel" style={{ marginTop: 16 }}><div className="panel-head"><div><div className="panel-title">Latest optimization</div><div className="panel-subtitle">A real run against your collection</div></div><Link href="/optimization/history" className="button button-ghost">Run history <ArrowRight size={13} /></Link></div>
        {summary.lastOptimization ? <OptimizationSummary run={summary.lastOptimization} /> : <EmptyState title="No optimization runs yet" detail="Once you have books, run the optimizer to inspect its ordering and shelf allocation." action={<Link href="/optimization" className="button button-secondary"><Sparkles size={14} /> Explore optimization</Link>} />}
      </section>
    </>}
  </main>;
}

function BookLine({ book }: { book: Book }) {
  return <Link href={`/library/${book.id}`} className="book-line" data-testid={`link-book-${book.id}`}><span className="book-glyph"><BookOpen size={15} /></span><span className="book-meta"><b>{book.title}</b><small>{book.author} · {book.category}</small></span><span className="book-location">{book.shelf} / {book.position}</span></Link>;
}

function OptimizationSummary({ run }: { run: Optimization }) {
  return <div className="history-item"><div className="history-badge"><GitCompareArrows size={17} /></div><div className="history-main"><b>{run.criteria} ordering</b><small>{run.algorithm} · {new Date(run.createdAt).toLocaleString()}</small></div><div className="history-numbers"><span>{run.booksProcessed} books</span><span>{run.positionsChanged} moved</span></div><Link href={`/optimization/history/${run.id}`} className="icon-button" aria-label="Inspect optimization"><ArrowRight size={14} /></Link></div>;
}

type BookFormData = { title: string; author: string; isbn: string; category: string; publicationYear: string; shelf: string; position: string; status: string };
const blankBook: BookFormData = { title: '', author: '', isbn: '', category: '', publicationYear: '', shelf: '', position: '1', status: 'available' };

function BookDialog({ book, onClose, onSubmit, pending, saveError = false }: { book?: Book; onClose: () => void; onSubmit: (data: BookInput | BookUpdate) => void; pending: boolean; saveError?: boolean }) {
  const [form, setForm] = useState<BookFormData>(book ? { title: book.title, author: book.author, isbn: book.isbn ?? '', category: book.category, publicationYear: book.publicationYear?.toString() ?? '', shelf: book.shelf, position: String(book.position), status: book.status } : blankBook);
  const [error, setError] = useState('');
  const set = (key: keyof BookFormData, value: string) => setForm((old) => ({ ...old, [key]: value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.category.trim() || !form.shelf.trim()) { setError('Title, author, category, and shelf are required.'); return; }
    const payload = { title: form.title.trim(), author: form.author.trim(), isbn: form.isbn.trim() || null, category: form.category.trim(), publicationYear: form.publicationYear ? Number(form.publicationYear) : null, shelf: form.shelf.trim(), position: Math.max(1, Number(form.position) || 1), status: form.status as BookInput['status'] };
    onSubmit(payload);
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="book-dialog-title"><header className="dialog-head"><div><h2 id="book-dialog-title">{book ? 'Edit book record' : 'Add a book'}</h2><p>Only your account can see or change this record.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog" data-testid="button-close-book-dialog"><X size={15} /></button></header>
    <form className="dialog-body" onSubmit={submit}><div className="form-grid">
      <div className="form-item full"><label htmlFor="book-title">Title</label><input id="book-title" className="field" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={240} required data-testid="input-book-title" /></div>
      <div className="form-item full"><label htmlFor="book-author">Author</label><input id="book-author" className="field" value={form.author} onChange={(e) => set('author', e.target.value)} maxLength={180} required data-testid="input-book-author" /></div>
      <div className="form-item"><label htmlFor="book-category">Category</label><input id="book-category" className="field" value={form.category} onChange={(e) => set('category', e.target.value)} maxLength={100} required data-testid="input-book-category" /></div>
      <div className="form-item"><label htmlFor="book-year">Publication year</label><input id="book-year" className="field" type="number" min="0" max="2100" value={form.publicationYear} onChange={(e) => set('publicationYear', e.target.value)} placeholder="Optional" data-testid="input-book-year" /></div>
      <div className="form-item"><label htmlFor="book-shelf">Shelf</label><input id="book-shelf" className="field" value={form.shelf} onChange={(e) => set('shelf', e.target.value)} maxLength={60} required data-testid="input-book-shelf" /></div>
      <div className="form-item"><label htmlFor="book-position">Position</label><input id="book-position" className="field" type="number" min="1" value={form.position} onChange={(e) => set('position', e.target.value)} required data-testid="input-book-position" /></div>
      <div className="form-item"><label htmlFor="book-isbn">ISBN</label><input id="book-isbn" className="field" value={form.isbn} onChange={(e) => set('isbn', e.target.value)} maxLength={32} placeholder="Optional" data-testid="input-book-isbn" /></div>
      <div className="form-item"><label htmlFor="book-status">Status</label><select id="book-status" className="select-field" style={{ width: '100%' }} value={form.status} onChange={(e) => set('status', e.target.value)} data-testid="select-book-status">{Object.values(BookStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
    </div>{(error || saveError) && <p role="alert" style={{ color: '#ffaaa6', fontSize: 11 }}>{error || 'The record could not be saved. Check your connection and try again.'}</p>}<div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={pending} data-testid="button-save-book">{pending ? 'Saving…' : book ? 'Save changes' : 'Add to library'}</button></div></form>
  </section></div>;
}

function LibraryPage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [shelf, setShelf] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('title-asc');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const cache = useQueryClient();
  const params = { q: q || undefined, category: category || undefined, shelf: shelf || undefined, status: status ? status as BookStatus : undefined, sort: sort as 'title-asc', page, pageSize: 10 };
  const books = useGetBooks(params);
  const create = useCreateBook();
  const remove = useDeleteBook();
  const rows = books.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((books.data?.total ?? 0) / (books.data?.pageSize ?? 10)));
  const invalidate = () => { void cache.invalidateQueries({ queryKey: getGetBooksQueryKey() }); void cache.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); };
  function createBook(data: BookInput | BookUpdate) { create.mutate({ data: data as BookInput }, { onSuccess: () => { setShowForm(false); invalidate(); }, onError: () => undefined }); }
  function deleteBook(book: Book) { if (!window.confirm(`Delete “${book.title}” from your library? This cannot be undone.`)) return; remove.mutate({ id: book.id }, { onSuccess: invalidate }); }
  return <main className="page-content">
    <PageHeading eyebrow="Your collection" title="My library" description="Search, arrange, and maintain your own book records." action={<button className="button button-primary" onClick={() => setShowForm(true)} data-testid="button-add-book"><Plus size={15} /> Add a book</button>} />
    <section className="panel"><div className="toolbar"><div className="search-wrap"><Search size={15} /><input className="field" placeholder="Search title, author, ISBN…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search books" data-testid="input-search-books" /></div>
      <select className="select-field" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filter by category" data-testid="select-category"><option value="">All categories</option>{(books.data?.categories ?? []).map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select className="select-field" value={shelf} onChange={(e) => { setShelf(e.target.value); setPage(1); }} aria-label="Filter by shelf" data-testid="select-shelf"><option value="">All shelves</option>{(books.data?.shelves ?? []).map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select className="select-field" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" data-testid="select-status"><option value="">Any status</option>{Object.values(BookStatus).map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select className="select-field" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort books" data-testid="select-sort"><option value="title-asc">Title A–Z</option><option value="title-desc">Title Z–A</option><option value="author">Author</option><option value="publication-year">Year</option><option value="category">Category</option><option value="shelf">Shelf</option><option value="position">Position</option></select>
    </div>
    {books.isLoading ? <LoadingPanel /> : books.isError ? <div style={{ padding: 18 }}><ErrorMessage retry={() => books.refetch()} message="Your book records could not be loaded." /></div> : rows.length ? <><div className="table-wrap"><table className="data-table"><thead><tr><th>Book</th><th>Category</th><th>Year</th><th>Shelf / position</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((book) => <tr key={book.id} data-testid={`row-book-${book.id}`}><td><Link className="table-title" href={`/library/${book.id}`} data-testid={`link-book-detail-${book.id}`}>{book.title}</Link><div style={{ color: '#71869a', fontSize: 10, marginTop: 4 }}>{book.author}{book.isbn ? ` · ${book.isbn}` : ''}</div></td><td>{book.category}</td><td>{book.publicationYear ?? '—'}</td><td>{book.shelf} <span style={{ color: '#587087' }}>/</span> {book.position}</td><td><span className="pill">{book.status}</span></td><td><div className="inline-actions"><Link className="icon-button" href={`/library/${book.id}`} aria-label={`View ${book.title}`}><ArrowRight size={14} /></Link><button className="icon-button" aria-label={`Delete ${book.title}`} onClick={() => deleteBook(book)} disabled={remove.isPending} data-testid={`button-delete-book-${book.id}`}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div><div className="pagination"><span>{books.data?.total ?? 0} records · page {page} of {pageCount}</span><div className="pager"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="button-previous-page"><ChevronLeft size={13} /> Previous</button><button className="button button-secondary" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} data-testid="button-next-page">Next <ChevronRight size={13} /></button></div></div></> : <EmptyState title={q || category || shelf || status ? 'No matching books' : 'Your library is empty'} detail={q || category || shelf || status ? 'Try a different search or clear filters. No records have been created for you.' : 'Add your first book to start building a personal collection.'} action={!q && !category && !shelf && !status ? <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add a book</button> : undefined} />}
    </section>
    {remove.isError && <div className="error-state" style={{ marginTop: 12 }} role="alert"><span>A book could not be deleted. Your record is unchanged.</span><button className="button button-danger" onClick={() => remove.reset()}>Dismiss</button></div>}
    {showForm && <BookDialog onClose={() => setShowForm(false)} onSubmit={createBook} pending={create.isPending} saveError={create.isError} />}
  </main>;
}

function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const bookQuery = useGetBook(id, { query: { queryKey: getGetBookQueryKey(id), enabled: !!id } });
  const update = useUpdateBook();
  const remove = useDeleteBook();
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [, setLocation] = useLocation();
  const book = bookQuery.data;
  function save(data: BookInput | BookUpdate) {
    update.mutate({ id, data: data as BookUpdate }, { onSuccess: (saved) => { cache.setQueryData(getGetBookQueryKey(id), saved); void cache.invalidateQueries({ queryKey: getGetBooksQueryKey() }); void cache.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setEditing(false); } });
  }
  function deleteCurrent() {
    if (!book || !window.confirm(`Delete “${book.title}” from your library? This cannot be undone.`)) return;
    remove.mutate({ id }, { onSuccess: () => { void cache.invalidateQueries({ queryKey: getGetBooksQueryKey() }); void cache.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation('/library'); } });
  }
  return <main className="page-content"><div style={{ marginBottom: 21 }}><Link href="/library" className="button button-ghost"><ArrowLeft size={14} /> Back to library</Link></div>
    {bookQuery.isLoading ? <LoadingPanel rows={7} /> : bookQuery.isError || !book ? <ErrorMessage retry={() => bookQuery.refetch()} message="This record is unavailable or could not be loaded." /> : <section className="panel">
      <div className="detail-hero"><div className="detail-cover"><BookOpen size={24} /></div><div style={{ flex: 1, minWidth: 0 }}><div className="small-caps">{book.category}</div><h1>{book.title}</h1><p>{book.author}</p></div><div className="inline-actions"><button className="button button-secondary" onClick={() => setEditing(true)} data-testid="button-edit-book"><Pencil size={14} /> Edit</button><button className="button button-danger" onClick={deleteCurrent} disabled={remove.isPending} data-testid="button-delete-book"><Trash2 size={14} /> Delete</button></div></div>
      <div style={{ padding: 23 }}>{remove.isError && <div className="error-state" style={{ marginBottom: 15 }} role="alert"><span>This book could not be deleted. Your record is unchanged.</span><button className="button button-danger" onClick={() => remove.reset()}>Dismiss</button></div>}<div className="details-grid"><div className="detail-cell"><span>Category</span><b>{book.category}</b></div><div className="detail-cell"><span>Publication year</span><b>{book.publicationYear ?? 'Not recorded'}</b></div><div className="detail-cell"><span>ISBN</span><b>{book.isbn || 'Not recorded'}</b></div><div className="detail-cell"><span>Status</span><b><span className="pill">{book.status}</span></b></div><div className="detail-cell"><span>Shelf</span><b>{book.shelf}</b></div><div className="detail-cell"><span>Position</span><b>{book.position}</b></div><div className="detail-cell"><span>Added</span><b>{new Date(book.createdAt).toLocaleDateString()}</b></div><div className="detail-cell"><span>Last updated</span><b>{new Date(book.updatedAt).toLocaleDateString()}</b></div></div></div>
    </section>}
    {editing && book && <BookDialog book={book} onClose={() => setEditing(false)} onSubmit={save} pending={update.isPending} saveError={update.isError} />}
  </main>;
}

function OrderColumn({ title, entries }: { title: string; entries: Optimization['beforeOrder'] }) {
  return <div className="compare-col"><div className="compare-head">{title} · {entries.length} books</div><div className="order-list">{entries.length ? entries.map((entry, index) => <div className="order-item" key={`${entry.id}-${index}`}><span className="order-num">{String(index + 1).padStart(2, '0')}</span><span style={{ minWidth: 0, flex: 1 }}><b>{entry.title}</b><small>{entry.author} · {entry.category}</small></span><small style={{ color: '#7790a3' }}>{entry.shelf}/{entry.position}</small></div>) : <div style={{ padding: 17, color: '#778da2', fontSize: 10 }}>No records in this arrangement.</div>}</div></div>;
}

function OptimizationPage() {
  const [criteria, setCriteria] = useState<Optimization['criteria']>('category');
  const run = useRunOptimization();
  const cache = useQueryClient();
  const results = run.data;
  function optimize() {
    run.mutate({ data: { criteria } }, { onSuccess: () => { void cache.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); void cache.invalidateQueries({ queryKey: getGetBooksQueryKey() }); void cache.invalidateQueries({ queryKey: getGetOptimizationHistoryQueryKey() }); } });
  }
  return <main className="page-content"><PageHeading eyebrow="Data structures & algorithms" title="Optimize your arrangement." description="Run the real optimizer against your current book records, then inspect exactly what changed." />
    <section className="panel"><div className="panel-head"><div><div className="panel-title">Choose a sort criterion</div><div className="panel-subtitle">The API applies the deterministic algorithm and allocates resulting positions.</div></div><Settings2 size={17} color="#54c7e8" /></div><div style={{ padding: 20 }}><div className="choice-list">{Object.values(OptimizationCriteria).map((item) => <button key={item} className={`choice${criteria === item ? ' selected' : ''}`} onClick={() => setCriteria(item)} data-testid={`choice-criteria-${item}`}><b>{item === 'publicationYear' ? 'Publication year' : item}</b><small>{item === 'category' ? 'Group related subjects together' : item === 'author' ? 'Arrange by author name' : item === 'title' ? 'Alphabetical title order' : 'Sort by publication date'}</small></button>)}</div><div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><button className="button button-primary" onClick={optimize} disabled={run.isPending} data-testid="button-run-optimization">{run.isPending ? <><span className="live-dot" /> Running against your books…</> : <><Sparkles size={15} /> Run optimization</>}</button><span style={{ color: '#788ea2', fontSize: 10 }}>This run uses your current library records.</span></div>{run.isError && <div style={{ marginTop: 16 }}><ErrorMessage retry={optimize} message="The optimization could not be completed." /></div>}</div></section>
    {results && <section className="optimization-result" aria-live="polite"><div className="result-banner"><div><strong>Optimization complete</strong><small>{results.algorithm} · Sorted by {results.criteria}</small></div><Link href={`/optimization/history/${results.id}`} className="button button-secondary">Open saved run <ArrowRight size={13} /></Link></div><div className="stat-chips"><span className="stat-chip">Books processed <b>{results.booksProcessed}</b></span><span className="stat-chip">Positions changed <b>{results.positionsChanged}</b></span><span className="stat-chip">Operations <b>{results.operationsCount}</b></span><span className="stat-chip">Runtime <b>{results.executionTimeMs} ms</b></span><span className="stat-chip">Time <b>{results.timeComplexity}</b></span><span className="stat-chip">Space <b>{results.spaceComplexity}</b></span></div><div className="compare-grid"><OrderColumn title="Before" entries={results.beforeOrder} /><OrderColumn title="After" entries={results.afterOrder} /></div></section>}
    {!results && <section className="panel" style={{ marginTop: 16 }}><EmptyState title="The comparison appears here" detail="Run the optimizer to see your actual current order beside the API’s resulting order. Nothing is simulated." /></section>}
  </main>;
}

function HistoryPage() {
  const history = useGetOptimizationHistory({ limit: 50 });
  return <main className="page-content"><PageHeading eyebrow="Saved runs" title="Optimization history" description="Review your real past runs and open any before-and-after comparison." action={<Link href="/optimization" className="button button-primary"><Sparkles size={14} /> Run optimization</Link>} />
    <section className="panel">{history.isLoading ? <LoadingPanel /> : history.isError ? <div style={{ padding: 18 }}><ErrorMessage retry={() => history.refetch()} message="Optimization history could not be loaded." /></div> : history.data?.length ? history.data.map((run) => <Link href={`/optimization/history/${run.id}`} className="history-item" key={run.id} data-testid={`link-optimization-${run.id}`}><div className="history-badge"><GitCompareArrows size={17} /></div><div className="history-main"><b>{run.criteria} ordering</b><small>{run.algorithm} · {new Date(run.createdAt).toLocaleString()}</small></div><div className="history-numbers"><span>{run.booksProcessed} processed</span><span>{run.positionsChanged} moved</span></div><ArrowRight size={15} color="#6f879b" /></Link>) : <EmptyState title="No saved runs yet" detail="Your optimization history will appear here after you run the algorithm on your books." action={<Link href="/optimization" className="button button-secondary"><Sparkles size={14} /> Go to optimization</Link>} />}</section>
  </main>;
}

function OptimizationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const query = useGetOptimization(id, { query: { queryKey: getGetOptimizationQueryKey(id), enabled: !!id } });
  const run = query.data;
  return <main className="page-content"><div style={{ marginBottom: 21 }}><Link href="/optimization/history" className="button button-ghost"><ArrowLeft size={14} /> Run history</Link></div>
    {query.isLoading ? <LoadingPanel rows={6} /> : query.isError || !run ? <ErrorMessage retry={() => query.refetch()} message="This optimization run could not be loaded." /> : <><PageHeading eyebrow="Saved optimization" title={`${run.criteria} arrangement`} description={`${run.algorithm} · ${new Date(run.createdAt).toLocaleString()}`} /><div className="result-banner"><div><strong>Run details</strong><small>Deterministic operation performed on your personal records.</small></div></div><div className="stat-chips"><span className="stat-chip">Books processed <b>{run.booksProcessed}</b></span><span className="stat-chip">Positions changed <b>{run.positionsChanged}</b></span><span className="stat-chip">Operations <b>{run.operationsCount}</b></span><span className="stat-chip">Runtime <b>{run.executionTimeMs} ms</b></span><span className="stat-chip">Time <b>{run.timeComplexity}</b></span><span className="stat-chip">Space <b>{run.spaceComplexity}</b></span></div><div className="compare-grid"><OrderColumn title="Before" entries={run.beforeOrder} /><OrderColumn title="After" entries={run.afterOrder} /></div></>}
  </main>;
}

function ProfilePage() {
  const profileQuery = useGetProfile();
  const update = useUpdateProfile();
  const cache = useQueryClient();
  const { signOut } = useClerk();
  const profile = profileQuery.data;
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (profile) { setName(profile.name); setImage(profile.profileImage ?? ''); } }, [profile?.id]);
  function save(event: FormEvent) {
    event.preventDefault();
    const data: ProfileUpdate = { name: name.trim(), profileImage: image.trim() || null };
    update.mutate({ data }, { onSuccess: () => { setNotice('Profile saved.'); void cache.invalidateQueries({ queryKey: getGetProfileQueryKey() }); }, onError: () => setNotice('Your profile could not be updated. Please retry.') });
  }
  return <main className="page-content"><PageHeading eyebrow="Account settings" title="Your profile" description="Manage the profile details associated with your private library." />
    {profileQuery.isLoading ? <LoadingPanel rows={4} /> : profileQuery.isError || !profile ? <ErrorMessage retry={() => profileQuery.refetch()} message="Your profile could not be loaded." /> : <div className="profile-layout"><section className="panel profile-card"><div className="profile-banner"><div className="avatar avatar-large">{(profile.name || profile.email).slice(0, 1).toUpperCase()}</div><div><h2>{profile.name}</h2><p>{profile.email}</p></div></div><form className="profile-form" onSubmit={save}><div className="form-item"><label htmlFor="profile-name">Display name</label><input id="profile-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} required data-testid="input-profile-name" /></div><div className="form-item"><label htmlFor="profile-image">Profile image URL <span style={{ color: '#70859a' }}>(optional)</span></label><input id="profile-image" className="field" value={image} onChange={(e) => setImage(e.target.value)} maxLength={2048} placeholder="https://" data-testid="input-profile-image" /></div><div className="form-item"><label>Email address</label><div className="field" style={{ display: 'flex', alignItems: 'center', color: '#748ba0' }}>{profile.email}</div></div>{notice && <div role="status" style={{ color: notice.startsWith('Profile saved') ? '#73d8b8' : '#ffaaa6', fontSize: 11 }}>{notice}</div>}<button className="button button-primary" disabled={update.isPending} data-testid="button-save-profile">{update.isPending ? 'Saving…' : 'Save profile'}</button></form></section><aside className="panel profile-aside"><h3>Account & privacy</h3><div className="security-row"><ShieldCheck size={16} /><span>Your book records are scoped to your signed-in account.</span></div><div className="security-row"><Database size={16} /><span>Profile created {new Date(profile.createdAt).toLocaleDateString()}.</span></div><div className="security-row"><LockKeyhole size={16} /><span>Authentication is managed securely by Clerk.</span></div><button className="button button-secondary" style={{ marginTop: 18, width: '100%' }} onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-log-out"><LogOut size={14} /> Sign out</button></aside></div>}
  </main>;
}

function AboutPage() {
  return <main className="page-content"><section className="about-hero"><div className="eyebrow">A working algorithm, not a mock</div><h1>See the structure behind the shelf.</h1><p>LibraSort makes a familiar problem—organizing books—into an approachable way to explore sorting and allocation. Optimization operates on your actual account records and stores a traceable before-and-after result.</p></section>
    <div className="algorithm-layout"><section className="panel algorithm-card"><div className="small-caps">How a run works</div><h3>Sort · group · allocate</h3><p>Select one criterion: category, author, title, or publication year. The API applies its deterministic ordering algorithm to your collection, then assigns the resulting arrangement to shelf positions. Each run exposes its algorithm name, time and space complexity, operation count, runtime, and every resulting entry.</p><div className="code-fragment"><span className="soft">// conceptual flow — actual execution is server-side</span><br /><span className="cyan">records</span> = <span className="gold">your current books</span><br /><span className="cyan">ordered</span> = <span className="gold">sort(records, criterion)</span><br /><span className="cyan">arranged</span> = <span className="gold">allocate(ordered, shelves)</span><br /><span className="soft">return before, after, complexity, operations</span></div></section>
      <section className="panel algorithm-card"><div className="small-caps">What to inspect</div><h3>Evidence from every optimization</h3><p>Open a run to compare the exact original and resulting order. Position changes and execution details come from that API result—LibraSort does not approximate the output or manufacture analytics.</p><div className="details-grid" style={{ marginTop: 19 }}><div className="detail-cell"><span>Input</span><b>Your library</b></div><div className="detail-cell"><span>Sort key</span><b>Selected by you</b></div><div className="detail-cell"><span>Output</span><b>Saved comparison</b></div><div className="detail-cell"><span>Ownership</span><b>Account-scoped</b></div></div></section></div>
    <div className="panel" style={{ marginTop: 15, padding: 22, display: 'flex', gap: 13, alignItems: 'flex-start' }}><CircleHelp size={17} color="#56c9e9" /><div><b style={{ fontSize: 12 }}>A note on the algorithm</b><p style={{ color: '#8fa4b7', fontSize: 11, lineHeight: 1.8, margin: '7px 0 0' }}>The algorithm name and complexity are returned by the optimization API. The interface reports those values as provided, so the method remains inspectable and grounded in the actual implementation.</p></div></div>
  </main>;
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/dashboard" /></Show><Show when="signed-out"><LandingPage /></Show></>;
}

function AboutRoute() {
  return <><Show when="signed-in"><AppShell><AboutPage /></AppShell></Show><Show when="signed-out"><main className="app-frame"><header className="site-header"><Link href="/"><Brand /></Link><nav className="public-nav"><ThemeToggle /><Link href="/">Home</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up" className="button button-primary">Create account <ArrowRight size={14} /></Link></nav></header><AboutPage /><footer className="public-footer"><Link href="/"><Brand /></Link><span>Secure personal library · DAA exploration</span></footer></main></Show></>;
}

function Router() {
  return <Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/dashboard"><Protected><DashboardPage /></Protected></Route>
    <Route path="/library"><Protected><LibraryPage /></Protected></Route>
    <Route path="/library/:id"><Protected><BookDetailPage /></Protected></Route>
    <Route path="/optimization"><Protected><OptimizationPage /></Protected></Route>
    <Route path="/optimization/history"><Protected><HistoryPage /></Protected></Route>
    <Route path="/optimization/history/:id"><Protected><OptimizationDetailPage /></Protected></Route>
    <Route path="/profile"><Protected><ProfilePage /></Protected></Route>
    <Route path="/about" component={AboutRoute} />
    <Route component={() => <main className="app-frame" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><div className="panel" style={{ padding: 36, textAlign: 'center' }}><Info size={25} color="#54c7e8" /><h1 style={{ fontSize: 24 }}>Page not found</h1><p style={{ color: '#8ca0b4', fontSize: 12 }}>This LibraSort route does not exist.</p><Link href="/" className="button button-primary">Return home</Link></div></main>} />
  </Switch>;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance(theme)} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to access your library.' } }, signUp: { start: { title: 'Create your private library', subtitle: 'Start with your own books and records.' } } }}
    routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><ClerkCacheInvalidator /><Router /></QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment.');
  return <ThemeProvider><WouterRouter base={basePath}><ClerkRoutes /></WouterRouter></ThemeProvider>;
}

export default App;