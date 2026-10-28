import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AuctionCard from '../components/AuctionCard';
import { Search as SearchIcon, Plus, TrendingUp, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { CATEGORIES, CONDITIONS } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'closing_soon', label: 'Closing Soon' },
  { value: 'lowest_bid', label: 'Lowest Bid' },
];

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Live' },
  { value: 'ENDED', label: 'Ended' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'COMPLETED', label: 'Completed' },
];

const Home = () => {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    status: 'ALL',
    page: 1,
  });
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] === undefined || params[key] === null) {
          delete params[key];
        }
      });
      const { data } = await api.get('/auctions', { params });
      setAuctions(data.auctions);
      setPagination({ total: data.total, pages: data.pages });
    } catch {
      toast.error('Failed to load auctions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAuctions(); }, [fetchAuctions]);

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  const clearFilters = () => setFilters({
    search: '',
    category: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    status: 'ALL',
    page: 1,
  });

  return (
    <div className="page-content max-w-7xl mx-auto px-4 sm:px-6 py-8 fade-in">
      {/* Hero Banner */}
      {!user && (
        <div className="glass mb-8 p-8 text-center overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))' }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 50%)' }} />
          <h1 className="text-4xl font-black gradient-text mb-3">Campus Marketplace</h1>
          <p className="text-gray-400 text-lg mb-6">Auction your used items. Bid on great deals. All within your campus.</p>
          <div className="flex justify-center gap-3">
            <Link to="/register" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div id="auction-search" className="relative">
          <SearchIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            aria-label="Search auctions"
            placeholder="Search by title or description..."
            value={filters.search}
            onChange={(event) => setFilter('search', event.target.value)}
          />
        </div>

        <section className="glass rounded-2xl p-4 sm:p-5" aria-label="Auction filters">
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Auction status</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by auction status">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter('status', tab.value)}
                  aria-pressed={filters.status === tab.value}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    filters.status === tab.value
                      ? 'border-amber-500 bg-amber-100 text-amber-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div>
              <label className="label">Category</label>
              <select className="input" value={filters.category} onChange={event => setFilter('category', event.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={filters.condition} onChange={event => setFilter('condition', event.target.value)}>
                <option value="">Any Condition</option>
                {CONDITIONS.map(condition => <option key={condition} value={condition}>{condition}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="min-price">Minimum price (₹)</label>
              <input
                id="min-price"
                className="input"
                type="number"
                min="0"
                placeholder="No minimum"
                value={filters.minPrice}
                onChange={event => setFilter('minPrice', event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="max-price">Maximum price (₹)</label>
              <input
                id="max-price"
                className="input"
                type="number"
                min="0"
                placeholder="No maximum"
                value={filters.maxPrice}
                onChange={event => setFilter('maxPrice', event.target.value)}
              />
            </div>
          </div>
          <button type="button" onClick={clearFilters} className="btn btn-secondary btn-sm mt-4">
            <RotateCcw size={14} /> Clear all filters
          </button>
        </section>
      </div>

      {/* Sort and result count */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-400">
          {loading ? 'Loading...' : `${pagination.total} auction${pagination.total !== 1 ? 's' : ''} found`}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="auction-sort" className="text-sm text-gray-500">Sort by</label>
          <select id="auction-sort" className="input w-full sm:w-48" value={filters.sort} onChange={event => setFilter('sort', event.target.value)}>
            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {user && (
            <Link to="/auctions/create" className="btn btn-primary btn-sm justify-center">
              <Plus size={14} /> List an Item
            </Link>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass h-80 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="empty-state">
          <TrendingUp size={48} className="text-gray-600" />
          <p className="text-lg font-medium">No auctions found</p>
          <p className="text-sm">Try adjusting your filters or be the first to list an item!</p>
          {user && (
            <Link to="/auctions/create" className="btn btn-primary mt-2">List an Item</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {auctions.map(auction => (
            <AuctionCard key={auction._id} auction={auction} onExpire={fetchAuctions} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button onClick={() => setFilter('page', filters.page - 1)} disabled={filters.page <= 1} className="btn btn-secondary btn-sm">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-gray-400">Page {filters.page} of {pagination.pages}</span>
          <button onClick={() => setFilter('page', filters.page + 1)} disabled={filters.page >= pagination.pages} className="btn btn-secondary btn-sm">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
