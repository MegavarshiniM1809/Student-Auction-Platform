import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Gavel,
  Handshake,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotifProvider } from './context/NotifContext';
import { SocketProvider } from './context/SocketContext';
import AuctionDetail from './pages/AuctionDetail';
import CreateListing from './pages/CreateListing';
import Home from './pages/Home';
import Login from './pages/Login';
import MyBids from './pages/MyBids';
import MyListings from './pages/MyListings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Register from './pages/Register';

const FEATURES = [
  {
    number: '01',
    icon: Gavel,
    title: 'Create an auction',
    description:
      'Give pre-loved essentials a second life. Share the details, set a starting price, and let your campus find them.',
    link: '/auctions/create',
    linkLabel: 'List an item',
    accent: 'amber',
  },
  {
    number: '02',
    icon: TrendingUp,
    title: 'Bid with confidence',
    description:
      'Find useful things from fellow students and take part in clear, competitive campus auctions.',
    link: '/auctions',
    linkLabel: 'Explore auctions',
    accent: 'purple',
  },
  {
    number: '03',
    icon: Handshake,
    title: 'See what happens next',
    description:
      'Follow your bids and listings from auction close through seller decisions and campus handover.',
    link: '/my/bids',
    linkLabel: 'View your activity',
    accent: 'green',
  },
];

const STEPS = [
  { icon: BookOpen, label: 'Find something useful' },
  { icon: Gavel, label: 'Place a thoughtful bid' },
  { icon: Handshake, label: 'Meet on campus' },
];

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <>
      <main>
        <section className="home-hero relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="absolute -left-40 top-8 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="home-hero-inner mx-auto grid max-w-7xl items-center gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-10 lg:py-[clamp(2rem,5vh,3.5rem)] xl:gap-14">
            <div className="home-hero-copy fade-in max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-3.5 py-2 text-xs font-semibold tracking-wide text-amber-200 sm:mb-6">
                <Sparkles size={14} />
                A smarter marketplace for your campus
              </div>
              <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Bid smart.
                <br />
                Win big.
                <br />
                <span className="gradient-text">CampusBid.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:mt-6 sm:text-lg sm:leading-8">
                Buy and sell pre-loved essentials through student auctions made for your college community. Good finds stay close, and every deal starts with a bid.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
                <Link to="/auctions" className="btn btn-primary justify-center px-6 py-3">
                  Explore Auctions <ArrowRight size={17} />
                </Link>
                <Link
                  to={user ? '/auctions/create' : '/register'}
                  className="btn btn-secondary justify-center px-6 py-3"
                >
                  {user ? 'List an Item' : 'Get Started'}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400 sm:mt-7">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  Student-to-student
                </span>
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck size={16} className="text-amber-300" />
                  Transparent bidding
                </span>
              </div>
            </div>

            <div className="home-hero-showcase relative mx-auto w-full max-w-xl lg:ml-auto">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-amber-400/10 via-transparent to-violet-500/15 blur-xl" aria-hidden="true" />
              <div className="glass relative overflow-hidden rounded-[1.75rem] p-5 shadow-2xl shadow-black/10 sm:p-6">
                <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-violet-500 text-white">
                      <Gavel size={19} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">CampusBid</p>
                      <p className="text-xs text-gray-400">Your campus, in circulation</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    MADE FOR CAMPUS
                  </span>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                    A better way to pass it on
                  </p>
                  <h2 className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl">
                    Useful things.
                    <br />
                    New owners.
                    <br />
                    Same campus.
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
                    From first bid to handover, keep the exchange in your student community.
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                    {STEPS.map(({ icon: Icon, label }, index) => (
                      <div key={label} className="relative min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 sm:p-4">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-amber-300">
                          <Icon size={17} />
                        </div>
                        <p className="text-[11px] font-medium leading-4 text-gray-300 sm:text-xs">
                          {label}
                        </p>
                        {index < STEPS.length - 1 && (
                          <ArrowRight
                            size={13}
                            className="absolute -right-2.5 top-6 z-10 text-gray-500"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-300/10 bg-violet-400/[0.06] px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-400/10 text-violet-300">
                    <Handshake size={18} />
                  </div>
                  <p className="text-xs leading-5 text-gray-300">
                    <span className="font-semibold text-white">Keep it local.</span>{' '}
                    Connect with students and arrange a campus handover.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">How it works</p>
                <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  A campus marketplace that keeps things moving.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-gray-400">
                Give useful items another chapter, discover what you need, and make the exchange with fellow students.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {FEATURES.map(({ number, icon: Icon, title, description, link, linkLabel, accent }) => {
                const requiresSignIn = number === '03' && !user;

                return (
                  <article
                    key={number}
                    className="group glass rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] sm:p-7"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-[0.15em] text-gray-500">{number}</span>
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          accent === 'amber'
                            ? 'bg-amber-400/10 text-amber-300'
                            : accent === 'purple'
                              ? 'bg-violet-400/10 text-violet-300'
                              : 'bg-emerald-400/10 text-emerald-300'
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                    </div>
                    <h3 className="mt-7 text-xl font-bold text-white">{title}</h3>
                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-gray-400">{description}</p>
                    <Link
                      to={requiresSignIn ? '/login' : link}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200"
                    >
                      {requiresSignIn ? 'Sign in to track activity' : linkLabel}
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <div className="relative overflow-hidden rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-400/[0.10] via-white/[0.03] to-violet-500/[0.10] px-6 py-10 text-center sm:px-12 sm:py-14">
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
            <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Your campus is full of good finds</p>
            <h2 className="relative mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to make your next campus find?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
              Explore the marketplace or join CampusBid to start buying and selling with fellow students.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/auctions" className="btn btn-primary justify-center px-6 py-3">
                Explore Auctions <ArrowRight size={17} />
              </Link>
              <Link to={user ? '/auctions/create' : '/register'} className="btn btn-secondary justify-center px-6 py-3">
                {user ? 'List an Item' : 'Create your account'}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] bg-black/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <Link to="/" className="flex w-fit items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-violet-500 text-white">
              <Gavel size={17} />
            </span>
            <span className="font-bold text-white">CampusBid</span>
            <span className="ml-1 border-l border-white/10 pl-3 text-xs text-gray-500">Student Auction Platform</span>
          </Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-400">
            <Link to="/auctions" className="transition-colors hover:text-white">Explore auctions</Link>
            <Link to="/register" className="transition-colors hover:text-white">Get started</Link>
            <Link to="/login" className="transition-colors hover:text-white">Sign in</Link>
            <Link to="/#how-it-works" className="transition-colors hover:text-white">How it works</Link>
          </nav>
          <p className="text-xs text-gray-500">Built for better campus exchanges.</p>
        </div>
      </footer>
    </>
  );
};

const AppLayout = () => (
  <div className="campusbid-shell">
    <Navbar />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auctions" element={<Home />} />
      <Route path="/auctions/create" element={<CreateListing />} />
      <Route path="/auctions/:id" element={<AuctionDetail />} />
      <Route path="/my/listings" element={<MyListings />} />
      <Route path="/my/bids" element={<MyBids />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
  </div>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <NotifProvider>
          <AppLayout />
        </NotifProvider>
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
