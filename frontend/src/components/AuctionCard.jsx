import { Link } from 'react-router-dom';
import { formatCurrency, STATUS_LABELS, STATUS_BADGE_CLASS } from '../utils/helpers';
import Countdown from './Countdown';
import { Tag, Clock, TrendingUp, User } from 'lucide-react';

const AuctionCard = ({ auction, onExpire }) => {
  const {
    _id, title, category, condition, photos, currentBid, startingPrice,
    bidCount, closesAt, status, sellerId, leadingBidderId,
  } = auction;

  const displayBid = currentBid > 0 ? currentBid : startingPrice;
  const isActive = status === 'ACTIVE';

  return (
    <Link to={`/auctions/${_id}`} className="block">
      <div className="glass auction-card overflow-hidden">
        {/* Image */}
        <div className="relative h-44 bg-gray-900 overflow-hidden rounded-t-2xl">
          {photos?.[0] ? (
            <img
              src={photos[0]}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <Tag size={40} />
            </div>
          )}
          {/* Condition badge */}
          <div className="absolute top-3 left-3">
            <span className="badge" style={{ background: 'rgba(0,0,0,0.6)', color: '#d1d5db', backdropFilter: 'blur(8px)' }}>
              {condition}
            </span>
          </div>
          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Category */}
          <div className="flex items-center gap-1 text-xs text-amber-400/80">
            <Tag size={11} />
            <span>{category}</span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">{title}</h3>

          {/* Bid info */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">
                {bidCount > 0 ? 'Current bid' : 'Starting from'}
              </p>
              <p className="text-xl font-bold text-amber-400">{formatCurrency(displayBid)}</p>
            </div>
            {bidCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <TrendingUp size={12} />
                <span>{bidCount} bid{bidCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Seller */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={11} />
            <span>{sellerId?.name || 'Unknown'}</span>
            {sellerId?.year && <span>· Year {sellerId.year}</span>}
          </div>

          {/* Countdown */}
          {isActive && (
            <div className="pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <Clock size={11} />
                <span>Closes in</span>
              </div>
              <Countdown closesAt={closesAt} onExpire={onExpire} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default AuctionCard;
