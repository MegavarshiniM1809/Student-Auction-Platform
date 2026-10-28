import { useNotif } from '../context/NotifContext';
import { format } from 'date-fns';
import { Bell, BellOff, CheckCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const NOTIF_ICONS = {
  OUTBID: '📉',
  AUCTION_CLOSED: '🔔',
  AUCTION_WON: '🏆',
  BID_APPROVED: '✅',
  BID_REJECTED: '❌',
  ITEM_RESERVED: '🎯',
  HANDOVER_CONFIRMED: '🤝',
  PICKUP_FAILED: '⚠️',
  AUCTION_CANCELLED: '🚫',
  NEW_BID_ON_YOUR_ITEM: '💰',
  GENERAL: '📢',
};

const Notifications = () => {
  const { notifications, unreadCount, markRead, markAllRead, enableBrowserNotifications, browserPermission } = useNotif();

  const handleEnableBrowser = async () => {
    const result = await enableBrowserNotifications();
    if (result === 'granted') alert('Browser notifications enabled! ✅');
    else if (result === 'denied') alert('Permission denied. Please enable in browser settings.');
    else if (result === 'unsupported') alert('Browser notifications not supported.');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 text-sm mt-0.5">{unreadCount} unread</p>
        </div>
        <div className="flex gap-2">
          {browserPermission !== 'granted' && (
            <button onClick={handleEnableBrowser} className="btn btn-secondary btn-sm">
              <Bell size={14} /> Enable Browser Notifications
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn btn-secondary btn-sm">
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <BellOff size={48} className="text-gray-600" />
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm">You'll be notified about bids, auction outcomes, and handovers.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif._id}
              onClick={() => !notif.isRead && markRead(notif._id)}
              className={`glass p-4 rounded-xl transition-all cursor-pointer flex gap-3 ${!notif.isRead ? 'border border-amber-500/20 bg-amber-500/5' : 'opacity-70 hover:opacity-100'}`}
            >
              <span className="text-xl flex-shrink-0">{NOTIF_ICONS[notif.type] || '📢'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 leading-snug">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-1">{format(new Date(notif.createdAt), 'dd MMM yyyy, HH:mm')}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                {!notif.isRead && <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5" />}
                {notif.auctionId && (
                  <Link to={`/auctions/${typeof notif.auctionId === 'object' ? notif.auctionId._id || notif.auctionId : notif.auctionId}`} onClick={e => e.stopPropagation()} className="text-gray-500 hover:text-amber-400 transition-colors">
                    <ExternalLink size={13} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
