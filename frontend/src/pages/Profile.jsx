import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { User, Mail, BookOpen, Phone, Hash, Link as SaveIcon } from 'lucide-react';

const DEPARTMENTS = ['Computer Science', 'Mechanical', 'Electrical', 'Civil', 'Chemical', 'Electronics', 'IT', 'MBA', 'Arts', 'Science', 'Other'];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: user?.name || '',
      department: user?.department || '',
      year: user?.year || '',
      contact: user?.contact || '',
    },
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { data: res } = await api.patch('/auth/profile', data);
      updateUser(res.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your student information</p>
      </div>

      {/* Avatar */}
      <div className="glass p-6 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)' }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <p className="text-xs text-gray-500 mt-0.5">{user?.department} · Year {user?.year}</p>
        </div>
      </div>

      <div className="glass p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label"><User size={13} className="inline mr-1" /> Full Name</label>
            <input {...register('name', { required: 'Required' })} className={`input ${errors.name ? 'input-error' : ''}`} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label"><Mail size={13} className="inline mr-1" /> Email</label>
            <input value={user?.email} disabled className="input opacity-50 cursor-not-allowed" />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label"><BookOpen size={13} className="inline mr-1" /> Department</label>
              <select {...register('department', { required: 'Required' })} className="input">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label"><Hash size={13} className="inline mr-1" /> Year</label>
              <select {...register('year', { required: 'Required' })} className="input">
                {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label"><Phone size={13} className="inline mr-1" /> Contact</label>
            <input {...register('contact')} className="input" placeholder="Phone / WhatsApp" />
          </div>

          <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
            {loading ? <span className="spinner" /> : <><SaveIcon size={14} /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
