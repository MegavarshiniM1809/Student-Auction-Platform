import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AuctionCard from '../components/AuctionCard';
import { Search, SlidersHorizontal, Plus, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES, CONDITIONS } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'closing_soon', label: 'Closing Soon' },
  { value: 'lowest_bid', label: 'Lowest Bid' },
];

const STATUS_TABS = [
  { value: 'ACTIVE', label: 'Live' },
  { value: 'AWAITING_SELLER_DECISION', label: 'Ended' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'COMPLETED', label: 'Completed' },
];

const Home = () => {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', condition: '', sort: 'newest', status: 'ACTIVE', page: 1 });
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showFilters, setShowFilters] = useState(false);

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
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

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 p-1 glass rounded-xl overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter('status', tab.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.status === tab.value ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-10"
              placeholder="Search by title or description..."
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary ${showFilters ? 'border-amber-500/50 text-amber-400' : ''}`}>
            <SlidersHorizontal size={16} /> Filters
          </button>
          <select className="input w-full sm:w-40" value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {showFilters && (
          <div className="glass p-4 rounded-xl fade-in grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={filters.condition} onChange={e => setFilter('condition', e.target.value)}>
                <option value="">Any Condition</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Min Price (₹)</label>
              <input className="input" type="number" placeholder="0" value={filters.minPrice || ''} onChange={e => setFilter('minPrice', e.target.value)} />
            </div>
            <div>
              <label className="label">Max Price (₹)</label>
              <input className="input" type="number" placeholder="Any" value={filters.maxPrice || ''} onChange={e => setFilter('maxPrice', e.target.value)} />
            </div>
            <button onClick={() => setFilters({ search: '', category: '', condition: '', sort: 'newest', status: filters.status, page: 1 })} className="btn btn-secondary btn-sm col-span-full w-fit">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {loading ? 'Loading...' : `${pagination.total} auction${pagination.total !== 1 ? 's' : ''} found`}
        </p>
        {user && (
          <Link to="/auctions/create" className="btn btn-primary btn-sm">
            <Plus size={14} /> List an Item
          </Link>
        )}
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
