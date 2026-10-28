import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Upload, X, Image as ImgIcon, Calendar, IndianRupee, Tag, AlignLeft } from 'lucide-react';
import { CATEGORIES, CONDITIONS } from '../utils/helpers';

const CreateListing = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, watch } = useForm({ defaultValues: { minIncrement: '50' } });
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);

  const handleImages = (e) => {
    const selected = Array.from(e.target.files).slice(0, 5);
    setFiles(selected);
    setPreviews(selected.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  // Min closing date: 1 hour from now
  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      files.forEach(f => formData.append('photos', f));
      const { data: res } = await api.post('/auctions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Listing created! 🎉');
      navigate(`/auctions/${res.auction._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">List an Item</h1>
        <p className="text-gray-400 text-sm mt-1">Fill in the details to start your auction</p>
      </div>

      <div className="glass p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Photos */}
          <div>
            <label className="label">Photos (up to 5)</label>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-4 hover:border-amber-500/30 transition-colors">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload size={24} className="text-gray-400" />
                <span className="text-sm text-gray-400">Click to upload photos</span>
                <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
              </label>
            </div>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {previews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} className="w-20 h-20 object-cover rounded-lg" alt="" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="label">Item Title *</label>
            <input {...register('title', { required: 'Title required', minLength: { value: 3, message: 'Min 3 chars' } })} className={`input ${errors.title ? 'input-error' : ''}`} placeholder="e.g. Used bicycle in great condition" />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Category + Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label"><Tag size={13} className="inline mr-1" /> Category *</label>
              <select {...register('category', { required: 'Required' })} className={`input ${errors.category ? 'input-error' : ''}`}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label">Condition *</label>
              <select {...register('condition', { required: 'Required' })} className={`input ${errors.condition ? 'input-error' : ''}`}>
                <option value="">Select...</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.condition && <p className="text-red-400 text-xs mt-1">{errors.condition.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label"><AlignLeft size={13} className="inline mr-1" /> Description *</label>
            <textarea {...register('description', { required: 'Description required', minLength: { value: 20, message: 'Min 20 chars' } })} rows={4} className={`input resize-none ${errors.description ? 'input-error' : ''}`} placeholder="Describe the item's condition, age, accessories included..." />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label"><IndianRupee size={13} className="inline mr-1" /> Starting Price (₹) *</label>
              <input {...register('startingPrice', { required: 'Required', min: { value: 1, message: 'Min ₹1' } })} type="number" step="0.01" className={`input ${errors.startingPrice ? 'input-error' : ''}`} placeholder="e.g. 500" />
              {errors.startingPrice && <p className="text-red-400 text-xs mt-1">{errors.startingPrice.message}</p>}
            </div>
            <div>
              <label className="label">Min Increment (₹) *</label>
              <input {...register('minIncrement', { required: 'Required', min: { value: 1, message: 'Min ₹1' } })} type="number" step="0.01" className={`input ${errors.minIncrement ? 'input-error' : ''}`} placeholder="e.g. 50" />
              {errors.minIncrement && <p className="text-red-400 text-xs mt-1">{errors.minIncrement.message}</p>}
            </div>
          </div>

          {/* Closing date */}
          <div>
            <label className="label"><Calendar size={13} className="inline mr-1" /> Auction Closing Date & Time *</label>
            <input {...register('closesAt', { required: 'Required' })} type="datetime-local" min={minDate} className={`input ${errors.closesAt ? 'input-error' : ''}`} />
            {errors.closesAt && <p className="text-red-400 text-xs mt-1">{errors.closesAt.message}</p>}
          </div>

          {/* Handover details */}
          <div>
            <label className="label">Campus Handover Details</label>
            <textarea {...register('handoverDetails')} rows={2} className="input resize-none" placeholder="e.g. Main gate, Block A lobby, available Mon-Fri 10am-5pm" />
          </div>

          <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
            {loading ? <span className="spinner" /> : '🚀 Publish Auction'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateListing;
