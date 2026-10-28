import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Countdown from '../components/Countdown';
import toast from 'react-hot-toast';
import { formatCurrency, STATUS_LABELS, STATUS_BADGE_CLASS } from '../utils/helpers';
import { format } from 'date-fns';
import { Tag, User, MapPin, ChevronUp, History, Gavel, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const AuctionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { joinAuction, leaveAuction, on } = useSocket();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [auctionRes, bidsRes] = await Promise.all([
        api.get(`/auctions/${id}`),
        api.get(`/auctions/${id}/bids`),
      ]);
      setAuction(auctionRes.data.auction);
      setBids(bidsRes.data.bids);

      // Try fetch transaction
      if (['RESERVED','COMPLETED','CANCELLED','PICKUP_FAILED','REJECTED'].includes(auctionRes.data.auction.status)) {
        try {
          const txRes = await api.get('/my/transactions');
          const tx = txRes.data.transactions.find(t => t.auctionId?._id === id || t.auctionId === id);
          if (tx) setTransaction(tx);
        } catch (_) {}
      }
    } catch (err) {
      toast.error('Failed to load auction');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    if (user) {
      joinAuction(id);
      const cleanupBid = on('new_bid', ({ bid, currentBid, leadingBidder, nextMinBid }) => {
        setBids(prev => [...prev, bid]);
        setAuction(prev => prev ? { ...prev, currentBid, leadingBidderId: leadingBidder, nextMinBid } : prev);
        toast(`New bid: ${formatCurrency(currentBid)}`, { icon: '🔨' });
      });
      const cleanupStatus = on('auction_status_changed', ({ status }) => {
        setAuction(prev => prev ? { ...prev, status } : prev);
      });
      return () => {
        leaveAuction(id);
        cleanupBid?.();
        cleanupStatus?.();
      };
    }
  }, [id, user]);

  const isSeller = user && auction?.sellerId?._id === user._id;
  const isLeader = user && auction?.leadingBidderId?._id === user._id;

  const minBid = auction
    ? auction.bidCount === 0
      ? auction.startingPrice
      : auction.currentBid + auction.minIncrement
    : 0;

  const placeBid = async () => {
    if (!user) return navigate('/login');
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setBidLoading(true);
    try {
      await api.post(`/auctions/${id}/bids`, { amount });
      toast.success(`Bid of ${formatCurrency(amount * 100)} placed! 🎉`);
      setBidAmount('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bid failed');
    } finally {
      setBidLoading(false);
    }
  };

  const makeDecision = async (decision) => {
    setDecisionLoading(decision);
    try {
      await api.post(`/auctions/${id}/decision`, { decision });
      toast.success(decision === 'APPROVED' ? 'Item reserved! Notify the winner.' : 'Bid rejected.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Decision failed');
    } finally {
      setDecisionLoading('');
    }
  };

  const handleHandover = async (type) => {
    if (!transaction) return;
    try {
      if (type === 'handover') await api.post(`/transactions/${transaction._id}/handover`);
      else if (type === 'cancel') await api.post(`/transactions/${transaction._id}/cancel`);
      else if (type === 'pickup-failed') await api.post(`/transactions/${transaction._id}/pickup-failed`);
      toast.success('Updated!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  if (loading || !auction) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const isActive = auction.status === 'ACTIVE';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Photos + Details */}
        <div className="lg:col-span-3 space-y-5">
          {/* Photo gallery */}
          <div className="glass overflow-hidden rounded-2xl">
            {auction.photos?.length > 0 ? (
              <>
                <img src={auction.photos[activePhoto]} alt={auction.title} className="w-full h-72 object-cover" />
                {auction.photos.length > 1 && (
                  <div className="flex gap-2 p-3">
                    {auction.photos.map((p, i) => (
                      <button key={i} onClick={() => setActivePhoto(i)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === activePhoto ? 'border-amber-400' : 'border-transparent'}`}>
                        <img src={p} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-72 flex items-center justify-center bg-gray-900 text-gray-600">
                <Tag size={56} />
              </div>
            )}
          </div>

          {/* Title + meta */}
          <div className="glass p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-white leading-snug">{auction.title}</h1>
              <span className={`badge flex-shrink-0 ${STATUS_BADGE_CLASS[auction.status]}`}>{STATUS_LABELS[auction.status]}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge badge-closed"><Tag size={11} className="mr-1" />{auction.category}</span>
              <span className="badge badge-closed">{auction.condition}</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{auction.description}</p>
            {auction.sellerId && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-sm text-gray-400">
                <User size={14} />
                <span>Listed by <strong className="text-gray-200">{auction.sellerId.name}</strong> · {auction.sellerId.department} · Year {auction.sellerId.year}</span>
              </div>
            )}
            {auction.handoverDetails && (
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span>{auction.handoverDetails}</span>
              </div>
            )}
          </div>

          {/* Bid History */}
          <div className="glass p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <History size={16} className="text-amber-400" /> Bid History ({bids.length})
            </h3>
            {bids.length === 0 ? (
              <p className="text-gray-500 text-sm">No bids yet. Be the first!</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[...bids].reverse().map((bid, i) => (
                  <div key={bid._id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${i === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/3'}`}>
                    <div className="flex items-center gap-2">
                      {i === 0 && <ChevronUp size={14} className="text-amber-400" />}
                      <span className="text-gray-300">{bid.bidderId?.name || 'Unknown'}</span>
                      <span className="text-gray-500 text-xs">· {bid.bidderId?.department}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${i === 0 ? 'text-amber-400' : 'text-gray-300'}`}>{formatCurrency(bid.amount)}</span>
                      <span className="text-gray-600 text-xs">{format(new Date(bid.createdAt), 'HH:mm, dd MMM')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price + Countdown */}
          <div className="glass p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">{auction.bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}</p>
              <p className="text-4xl font-black text-amber-400">{formatCurrency(auction.bidCount > 0 ? auction.currentBid : auction.startingPrice)}</p>
              {auction.leadingBidderId && (
                <p className="text-xs text-gray-400 mt-1">by {auction.leadingBidderId.name || 'Unknown'}</p>
              )}
            </div>
            <div className="text-xs text-gray-400">
              Min next bid: <span className="text-amber-300 font-semibold">{formatCurrency(minBid)}</span>
            </div>
            {isActive && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Closes in:</p>
                <Countdown closesAt={auction.closesAt} onExpire={fetchData} />
              </div>
            )}
          </div>

          {/* Bid Form */}
          {isActive && !isSeller && user && (
            <div className="glass p-5 space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Gavel size={16} className="text-amber-400" /> Place a Bid
              </h3>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  className="input pl-7"
                  placeholder={`Min: ₹${(minBid / 100).toFixed(2)}`}
                />
              </div>
              <p className="text-xs text-gray-500">Enter ₹{(minBid / 100).toFixed(2)} or more</p>
              <button onClick={placeBid} disabled={bidLoading} className="btn btn-primary w-full justify-center">
                {bidLoading ? <span className="spinner" /> : <><Gavel size={14} /> Place Bid</>}
              </button>
            </div>
          )}

          {/* Self-bid warning */}
          {isActive && isSeller && (
            <div className="glass p-4 flex items-center gap-2 text-amber-400 text-sm">
              <AlertCircle size={16} />
              <span>You cannot bid on your own listing</span>
            </div>
          )}

          {/* Not signed in */}
          {isActive && !user && (
            <div className="glass p-5 text-center space-y-3">
              <p className="text-gray-400 text-sm">Sign in to place a bid</p>
              <a href="/login" className="btn btn-primary w-full justify-center">Sign In to Bid</a>
            </div>
          )}

          {/* Seller Decision Panel */}
          {auction.status === 'AWAITING_SELLER_DECISION' && isSeller && (
            <div className="glass p-5 space-y-3 border border-amber-500/20">
              <h3 className="font-semibold text-amber-400">Auction Ended — Winner Decision</h3>
              <p className="text-sm text-gray-400">
                Winning bid: <strong className="text-white">{formatCurrency(auction.currentBid)}</strong> by <strong className="text-white">{auction.leadingBidderId?.name}</strong>
              </p>
              <div className="flex gap-2">
                <button onClick={() => makeDecision('APPROVED')} disabled={!!decisionLoading} className="btn btn-success flex-1 justify-center">
                  {decisionLoading === 'APPROVED' ? <span className="spinner" /> : <><CheckCircle size={14} /> Approve</>}
                </button>
                <button onClick={() => makeDecision('REJECTED')} disabled={!!decisionLoading} className="btn btn-danger flex-1 justify-center">
                  {decisionLoading === 'REJECTED' ? <span className="spinner" /> : <><XCircle size={14} /> Reject</>}
                </button>
              </div>
            </div>
          )}

          {/* Handover management for RESERVED */}
          {auction.status === 'RESERVED' && transaction && (
            <div className="glass p-5 space-y-3 border border-purple-500/20">
              <h3 className="font-semibold text-purple-400">🏷 Item Reserved</h3>
              <p className="text-xs text-gray-400">
                Pickup deadline: <strong>{transaction.pickupDeadline ? format(new Date(transaction.pickupDeadline), 'dd MMM yyyy') : 'N/A'}</strong>
              </p>
              {(isSeller || isLeader) && !transaction.finalOutcome && (
                <div className="space-y-2">
                  <button onClick={() => handleHandover('handover')} className="btn btn-success w-full justify-center btn-sm">
                    <CheckCircle size={13} /> Confirm Handover
                  </button>
                  {isSeller && (
                    <>
                      <button onClick={() => handleHandover('pickup-failed')} className="btn w-full justify-center btn-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        Pickup Failed
                      </button>
                      <button onClick={() => handleHandover('cancel')} className="btn btn-danger w-full justify-center btn-sm">
                        Cancel Transaction
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Outcome badges */}
          {['COMPLETED','CANCELLED','PICKUP_FAILED','REJECTED','UNSOLD'].includes(auction.status) && (
            <div className={`glass p-4 text-center badge w-full justify-center text-base py-3 ${STATUS_BADGE_CLASS[auction.status]}`}>
              {STATUS_LABELS[auction.status]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
