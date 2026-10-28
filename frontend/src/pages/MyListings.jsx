import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, STATUS_LABELS, STATUS_BADGE_CLASS } from '../utils/helpers';
import { format } from 'date-fns';
import { Plus, Gavel, Tag, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import Countdown from '../components/Countdown';

const MyListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      const { data } = await api.get('/my/listings');
      setListings(data.auctions);
    } catch { toast.error('Failed to load listings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Listings</h1>
          <p className="text-gray-400 text-sm mt-1">Auctions you've created</p>
        </div>
        <Link to="/auctions/create" className="btn btn-primary">
          <Plus size={16} /> New Listing
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass h-32 animate-pulse rounded-2xl" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <Gavel size={48} className="text-gray-600" />
          <p className="text-lg font-medium">No listings yet</p>
          <p className="text-sm">List your first item to start auctioning!</p>
          <Link to="/auctions/create" className="btn btn-primary mt-2">List an Item</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map(auction => (
            <Link key={auction._id} to={`/auctions/${auction._id}`} className="block">
              <div className="glass p-4 hover:border-amber-500/20 border border-transparent transition-all rounded-2xl">
                <div className="flex gap-4 items-start">
                  {auction.photos?.[0] ? (
                    <img src={auction.photos[0]} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Tag size={24} className="text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-white text-lg leading-snug">{auction.title}</h3>
                      <span className={`badge flex-shrink-0 ${STATUS_BADGE_CLASS[auction.status]}`}>{STATUS_LABELS[auction.status]}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-gray-400"><TrendingUp size={13} />
                        {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
                      </span>
                      {auction.bidCount > 0 && (
                        <span className="text-amber-400 font-semibold">{formatCurrency(auction.currentBid)}</span>
                      )}
                      {auction.bidCount === 0 && (
                        <span className="text-gray-400">Starts at {formatCurrency(auction.startingPrice)}</span>
                      )}
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock size={13} />
                        {auction.status === 'ACTIVE' ? <Countdown closesAt={auction.closesAt} /> : format(new Date(auction.closesAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    {auction.status === 'AWAITING_SELLER_DECISION' && auction.leadingBidderId && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ⚡ Action required: Review winner — {auction.leadingBidderId.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListings;
