import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, STATUS_LABELS, STATUS_BADGE_CLASS, CATEGORIES, CONDITIONS } from '../utils/helpers';
import { format } from 'date-fns';
import { Plus, Gavel, Tag, Clock, TrendingUp, Pencil, X, Save, Ban, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Countdown from '../components/Countdown';

const toDateTimeLocal = (date) => format(new Date(date), "yyyy-MM-dd'T'HH:mm");

const MyListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAuction, setEditingAuction] = useState(null);
  const [editValues, setEditValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [cancellingAuction, setCancellingAuction] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [expiredAuctionIds, setExpiredAuctionIds] = useState(() => new Set());
  const [minClosingDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));

  const fetchListings = useCallback(async () => {
    try {
      const { data } = await api.get('/my/listings');
      setListings(data.auctions);
    } catch { toast.error('Failed to load listings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const startEditing = (auction) => {
    setEditingAuction(auction);
    setEditValues({
      title: auction.title,
      category: auction.category,
      condition: auction.condition,
      description: auction.description,
      startingPrice: auction.startingPrice / 100,
      minIncrement: auction.minIncrement / 100,
      closesAt: toDateTimeLocal(auction.closesAt),
      handoverDetails: auction.handoverDetails || '',
      existingPhotos: [...(auction.photos || [])],
      newFiles: [],
      newPreviews: [],
    });
  };

  const saveChanges = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(editValues).forEach(([field, value]) => {
        if (field !== 'existingPhotos' && field !== 'newFiles' && field !== 'newPreviews') {
          formData.append(field, value);
        }
      });
      formData.append('existingPhotos', JSON.stringify(editValues.existingPhotos));
      editValues.newFiles.forEach((file) => formData.append('photos', file));
      const { data } = await api.patch(`/auctions/${editingAuction._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setListings((current) => current.map((auction) => (
        auction._id === data.auction._id ? { ...auction, ...data.auction } : auction
      )));
      closeEditor();
      toast.success('Auction updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update auction.');
    } finally {
      setSaving(false);
    }
  };

  const cancelAuction = async (event) => {
    event.preventDefault();
    const auction = cancellingAuction;
    if (!auction) return;
    if (auction.bidCount > 0 && !cancelReason.trim()) {
      toast.error('Enter a cancellation reason.');
      return;
    }

    setCancellingId(auction._id);
    try {
      const { data } = await api.post(`/auctions/${auction._id}/cancel`, { reason: cancelReason });
      setListings((current) => current.map((item) => (
        item._id === data.auction._id ? { ...item, ...data.auction } : item
      )));
      toast.success('Auction cancelled.');
      setCancellingAuction(null);
      setCancelReason('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel auction.');
    } finally {
      setCancellingId('');
    }
  };

  const addEditPhotos = (event) => {
    const remaining = Math.max(0, 5 - editValues.existingPhotos.length - editValues.newFiles.length);
    const selected = Array.from(event.target.files || []).slice(0, remaining);
    setEditValues((current) => ({
      ...current,
      newFiles: [...current.newFiles, ...selected],
      newPreviews: [...current.newPreviews, ...selected.map((file) => URL.createObjectURL(file))],
    }));
    event.target.value = '';
  };

  const closeEditor = () => {
    editValues?.newPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setEditingAuction(null);
    setEditValues(null);
  };

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
          {listings.map((auction) => {
            const canCancel = auction.status === 'ACTIVE' && !expiredAuctionIds.has(auction._id);
            const canEdit = canCancel && auction.bidCount === 0;

            return (
            <article key={auction._id} className="glass rounded-2xl border border-transparent p-4 transition-all hover:border-amber-500/20">
              <Link to={`/auctions/${auction._id}`} className="block">
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
                        {auction.status === 'ACTIVE' ? (
                          <Countdown
                            closesAt={auction.closesAt}
                            onExpire={() => setExpiredAuctionIds((current) => new Set(current).add(auction._id))}
                          />
                        ) : format(new Date(auction.closesAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    {auction.status === 'AWAITING_SELLER_DECISION' && auction.leadingBidderId && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ⚡ Action required: Review winner — {auction.leadingBidderId.name}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              {canEdit && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                  <button type="button" onClick={() => startEditing(auction)} className="btn btn-secondary btn-sm">
                    <Pencil size={14} /> Edit auction
                  </button>
                </div>
              )}
              {canCancel && (
                <div className={`${canEdit ? '' : 'mt-4 border-t border-slate-200 pt-3'} flex flex-wrap gap-2`}>
                  <button
                    type="button"
                    onClick={() => { setCancellingAuction(auction); setCancelReason(''); }}
                    disabled={cancellingId === auction._id}
                    className="btn btn-danger btn-sm"
                  >
                    {cancellingId === auction._id ? <span className="spinner" /> : <Ban size={14} />}
                    Cancel auction
                  </button>
                </div>
              )}
              {auction.status === 'ACTIVE' && auction.bidCount > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm">
                  <p className="text-gray-500">Core listing details are locked after the first bid.</p>
                  <Link to={`/auctions/${auction._id}`} className="text-amber-700 font-semibold hover:underline">
                    Add update or manage cancellation
                  </Link>
                </div>
              )}
              {auction.status === 'AWAITING_SELLER_DECISION' && (
                <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-gray-500">
                  Auction ended. Review the existing Reject flow on the auction detail page if you cannot proceed.
                </p>
              )}
            </article>
            );
          })}
        </div>
      )}

      {editingAuction && editValues && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-auction-title"
            className="glass my-auto w-full max-w-2xl rounded-2xl p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-auction-title" className="text-xl font-bold text-slate-800">Edit auction</h2>
                <p className="mt-1 text-sm text-gray-500">You can edit this listing until it receives its first bid.</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close edit auction"
                className="rounded-lg p-2 text-gray-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveChanges} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="label" htmlFor="edit-photos">Photos (up to 5)</label>
                <div className="flex flex-wrap gap-2">
                  {editValues.existingPhotos.map((photo) => (
                    <div key={photo} className="relative">
                      <img src={photo} className="h-16 w-16 rounded-lg object-cover" alt="" />
                      <button type="button" onClick={() => setEditValues({ ...editValues, existingPhotos: editValues.existingPhotos.filter((item) => item !== photo) })} className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white" aria-label="Remove photo">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {editValues.newPreviews.map((preview, index) => (
                    <div key={preview} className="relative">
                      <img src={preview} className="h-16 w-16 rounded-lg object-cover" alt="" />
                      <button type="button" onClick={() => {
                        URL.revokeObjectURL(preview);
                        setEditValues({
                          ...editValues,
                          newFiles: editValues.newFiles.filter((_, fileIndex) => fileIndex !== index),
                          newPreviews: editValues.newPreviews.filter((_, previewIndex) => previewIndex !== index),
                        });
                      }} className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white" aria-label="Remove photo">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                {editValues.existingPhotos.length + editValues.newFiles.length < 5 && (
                  <label htmlFor="edit-photos" className="btn btn-secondary btn-sm mt-2 inline-flex cursor-pointer">
                    <Upload size={14} /> Add photos
                  </label>
                )}
                <input id="edit-photos" type="file" accept="image/*" multiple onChange={addEditPhotos} className="hidden" />
              </div>
              <div>
                <label className="label" htmlFor="edit-title">Title</label>
                <input id="edit-title" className="input" required minLength={3} value={editValues.title} onChange={(event) => setEditValues({ ...editValues, title: event.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="edit-category">Category</label>
                  <select id="edit-category" className="input" required value={editValues.category} onChange={(event) => setEditValues({ ...editValues, category: event.target.value })}>
                    {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="edit-condition">Condition</label>
                  <select id="edit-condition" className="input" required value={editValues.condition} onChange={(event) => setEditValues({ ...editValues, condition: event.target.value })}>
                    {CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="edit-description">Description</label>
                <textarea id="edit-description" className="input resize-y" rows={4} required minLength={20} value={editValues.description} onChange={(event) => setEditValues({ ...editValues, description: event.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="edit-starting-price">Starting price (₹)</label>
                  <input id="edit-starting-price" className="input" type="number" min="1" step="0.01" required value={editValues.startingPrice} onChange={(event) => setEditValues({ ...editValues, startingPrice: event.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="edit-min-increment">Minimum increment (₹)</label>
                  <input id="edit-min-increment" className="input" type="number" min="1" step="0.01" required value={editValues.minIncrement} onChange={(event) => setEditValues({ ...editValues, minIncrement: event.target.value })} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="edit-closes-at">Closing date and time</label>
                <input id="edit-closes-at" className="input" type="datetime-local" min={minClosingDate} required value={editValues.closesAt} onChange={(event) => setEditValues({ ...editValues, closesAt: event.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="edit-handover">Campus handover details</label>
                <textarea id="edit-handover" className="input resize-y" rows={2} value={editValues.handoverDetails} onChange={(event) => setEditValues({ ...editValues, handoverDetails: event.target.value })} />
              </div>
              <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-200 pt-4 sm:flex-row">
                <button type="button" onClick={closeEditor} className="btn btn-secondary justify-center">
                  <X size={15} /> Close
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary justify-center">
                  {saving ? <span className="spinner" /> : <Save size={15} />}
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {cancellingAuction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="cancel-auction-title" className="glass w-full max-w-lg rounded-2xl p-5 shadow-2xl sm:p-7">
            <h2 id="cancel-auction-title" className="text-xl font-bold text-slate-800">Cancel auction?</h2>
            <p className="mt-2 text-sm text-gray-600">
              {cancellingAuction.bidCount > 0
                ? 'This cancellation and your reason will be public, and every participating bidder will be notified.'
                : 'This cannot be undone. No reason is required before the first bid.'}
            </p>
            {cancellingAuction.bidCount > 0 && (
              <form onSubmit={cancelAuction} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="cancel-reason" className="label">Cancellation reason</label>
                  <textarea id="cancel-reason" className="input resize-y" rows={4} maxLength={1000} required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
                  <p className="mt-1 text-xs text-gray-500">{cancelReason.length}/1000</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setCancellingAuction(null)} className="btn btn-secondary">Keep auction</button>
                  <button type="submit" disabled={!!cancellingId} className="btn btn-danger">
                    {cancellingId ? <span className="spinner" /> : <Ban size={14} />} Confirm cancellation
                  </button>
                </div>
              </form>
            )}
            {cancellingAuction.bidCount === 0 && (
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setCancellingAuction(null)} className="btn btn-secondary">Keep auction</button>
                <button type="button" onClick={cancelAuction} disabled={!!cancellingId} className="btn btn-danger">
                  {cancellingId ? <span className="spinner" /> : <Ban size={14} />} Confirm cancellation
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default MyListings;
