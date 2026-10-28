import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Gavel, User, Mail, Lock, BookOpen, Hash } from 'lucide-react';

const DEPARTMENTS = ['Computer Science', 'Mechanical', 'Electrical', 'Civil', 'Chemical', 'Electronics', 'IT', 'MBA', 'Arts', 'Science', 'Other'];

const Register = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authRegister(data);
      toast.success('Welcome to CampusBid! 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, icon: Icon, children, error }) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />}
        <div className={Icon ? 'pl-0' : ''}>{children}</div>
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error.message}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(245,158,11,0.06) 0%, transparent 60%)' }}>
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)' }}>
            <Gavel size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Join CampusBid</h1>
          <p className="text-gray-400 mt-1">Create your student account</p>
        </div>

        <div className="glass p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('name', { required: 'Name required' })} className={`input pl-9 ${errors.name ? 'input-error' : ''}`} placeholder="Your full name" />
              </div>
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">College Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} className={`input pl-9 ${errors.email ? 'input-error' : ''}`} placeholder="you@college.edu" type="email" />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 characters' } })} className={`input pl-9 ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" type="password" />
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Department</label>
                <div className="relative">
                  <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select {...register('department', { required: 'Required' })} className={`input pl-9 ${errors.department ? 'input-error' : ''}`}>
                    <option value="">Select...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department.message}</p>}
              </div>

              <div>
                <label className="label">Year</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select {...register('year', { required: 'Required' })} className={`input pl-9 ${errors.year ? 'input-error' : ''}`}>
                    <option value="">Year</option>
                    {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                {errors.year && <p className="text-red-400 text-xs mt-1">{errors.year.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Contact (optional)</label>
              <input {...register('contact')} className="input" placeholder="Phone / WhatsApp" />
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
