import { useState, useEffect } from 'react';
import { getTimeRemaining } from '../utils/helpers';

const Countdown = ({ closesAt, onExpire }) => {
  const [time, setTime] = useState(() => getTimeRemaining(closesAt));

  useEffect(() => {
    if (time.expired) { onExpire?.(); return; }
    const id = setInterval(() => {
      const t = getTimeRemaining(closesAt);
      setTime(t);
      if (t.expired) { clearInterval(id); onExpire?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [closesAt, onExpire]);

  if (time.expired) {
    return <span className="badge badge-closed">Auction Ended</span>;
  }

  const isUrgent = time.total < 1000 * 60 * 60; // < 1 hour

  return (
    <div className="flex items-center gap-2">
      {isUrgent && (
        <div className="flex items-center gap-1 text-xs text-red-400 font-semibold">
          <div className="live-dot" />
          <span>Closing Soon</span>
        </div>
      )}
      <div className="flex gap-1">
        {time.days > 0 && (
          <div className="countdown-unit">
            <span className="countdown-number">{time.days}</span>
            <span className="countdown-label">Days</span>
          </div>
        )}
        <div className="countdown-unit">
          <span className={`countdown-number ${isUrgent ? 'text-red-400' : ''}`}>
            {String(time.hours).padStart(2, '0')}
          </span>
          <span className="countdown-label">Hrs</span>
        </div>
        <div className="countdown-unit">
          <span className={`countdown-number ${isUrgent ? 'text-red-400' : ''}`}>
            {String(time.minutes).padStart(2, '0')}
          </span>
          <span className="countdown-label">Min</span>
        </div>
        <div className="countdown-unit">
          <span className={`countdown-number ${isUrgent ? 'text-red-400' : ''}`}>
            {String(time.seconds).padStart(2, '0')}
          </span>
          <span className="countdown-label">Sec</span>
        </div>
      </div>
    </div>
  );
};

export default Countdown;
