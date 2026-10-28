import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, STATUS_LABELS, STATUS_BADGE_CLASS } from '../utils/helpers';
import { ShoppingBag, Tag, TrendingUp, Trophy, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Countdown from '../components/Countdown';

const MyBids = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = useCallback(async () => {
    try {
      const { data } = await api.get('/my/bids');
      setItems(data.auctions);
    } catch { toast.error('Failed to load your bids'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBids(); }, [fetchBids]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Bids</h1>
        <p className="text-gray-400 text-sm mt-1">Auctions you've participated in</p>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass h-28 animate-pulse rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={48} className="text-gray-600" />
          <p className="text-lg font-medium">No bids yet</p>
          <p className="text-sm">Start bidding on items available on campus!</p>
          <Link to="/" className="btn btn-primary mt-2">Explore Auctions</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(({ auction, myHighestBid }) => {
            const isLeading = auction.leadingBidderId?._id === user?._id;
            return (
              <Link key={auction._id} to={`/auctions/${auction._id}`} className="block">
                <div className={`glass p-4 transition-all rounded-2xl border ${isLeading && auction.status === 'ACTIVE' ? 'border-green-500/20' : 'border-transparent'} hover:border-amber-500/20`}>
                  <div className="flex gap-4 items-start">
                    {auction.photos?.[0] ? (
                      <img src={auction.photos[0]} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Tag size={24} className="text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <h3 className="font-semibold text-white text-base leading-snug">{auction.title}</h3>
                        <span className={`badge flex-shrink-0 ${STATUS_BADGE_CLASS[auction.status]}`}>{STATUS_LABELS[auction.status]}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm items-center">
                        <span className="text-gray-400 flex items-center gap-1">
                          <TrendingUp size={13} /> My highest: <span className="text-white font-semibold">{formatCurrency(myHighestBid)}</span>
                        </span>
                        <span className="text-gray-400">
                          Current: <span className="text-amber-400 font-semibold">{formatCurrency(auction.currentBid > 0 ? auction.currentBid : auction.startingPrice)}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {isLeading && auction.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                            <Trophy size={10} /> You're leading!
                          </span>
                        )}
                        {!isLeading && auction.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                            <AlertCircle size={10} /> You've been outbid
                          </span>
                        )}
                        {auction.status === 'ACTIVE' && (
                          <div className="text-xs text-gray-400">
                            <Countdown closesAt={auction.closesAt} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBids;
