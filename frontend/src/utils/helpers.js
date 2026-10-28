/** Format paise to ₹ string */
export const formatCurrency = (paise) => {
  if (paise === undefined || paise === null) return '₹0.00';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

/** Time remaining object from now to target date */
export const getTimeRemaining = (closesAt) => {
  const now = Date.now();
  const target = new Date(closesAt).getTime();
  const total = target - now;
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((total % (1000 * 60)) / 1000),
    expired: false,
  };
};

export const STATUS_LABELS = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  BIDDING_CLOSED: 'Closed',
  UNSOLD: 'Unsold',
  AWAITING_SELLER_DECISION: 'Awaiting Decision',
  RESERVED: 'Reserved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PICKUP_FAILED: 'Pickup Failed',
};

export const STATUS_BADGE_CLASS = {
  ACTIVE: 'badge-active',
  DRAFT: 'badge-closed',
  BIDDING_CLOSED: 'badge-closed',
  UNSOLD: 'badge-unsold',
  AWAITING_SELLER_DECISION: 'badge-awaiting',
  RESERVED: 'badge-reserved',
  REJECTED: 'badge-rejected',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
  PICKUP_FAILED: 'badge-pickup_failed',
};

export const CATEGORIES = [
  'Books', 'Electronics', 'Clothing', 'Furniture',
  'Sports', 'Stationery', 'Vehicles', 'Appliances', 'Other'
];

export const CONDITIONS = ['New-like', 'Good', 'Fair', 'Poor'];
