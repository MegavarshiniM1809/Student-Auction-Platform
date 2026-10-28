import { useState, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import { useSocket } from '../context/SocketContext';
import {
  Gavel, Bell, Plus, LayoutDashboard, LogOut, User,
  Menu, X, ShoppingBag,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotif();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)' }}>
              <Gavel size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:block">CampusBid</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/auctions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Explore
            </NavLink>
            {!user && (
              <Link to="/#how-it-works" className="nav-link">
                How it works
              </Link>
            )}
            {user && (
              <>
              <NavLink to="/my/listings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={15} /> My Listings
              </NavLink>
              <NavLink to="/my/bids" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ShoppingBag size={15} /> My Bids
              </NavLink>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Connection indicator */}
            {/*<div className={`hidden sm:flex items-center gap-1 text-xs ${connected ? 'text-green-400' : 'text-gray-500'}`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden lg:inline">{connected ? 'Live' : 'Offline'}</span>
            </div>
            */}
            {user ? (
              <>
                {/* Create listing */}
                <Link to="/auctions/create" className="btn btn-primary btn-sm hidden sm:inline-flex">
                  <Plus size={14} /> List Item
                </Link>

                {/* Notifications */}
                <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <Bell size={18} className="text-gray-300" />
                  {unreadCount > 0 && (
                    <span className="notif-dot flex items-center justify-center text-[9px] font-bold text-white" style={{ width: 16, height: 16, top: 0, right: 0, background: '#ef4444' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                    aria-expanded={dropdownOpen}
                    aria-controls="profile-dropdown"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)' }}>
                      {user.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-gray-200">{user.name?.split(' ')[0]}</span>
                  </button>
                  {dropdownOpen && (
                    <div id="profile-dropdown" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl glass-dark p-1 shadow-2xl">
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.department} · Year {user.year}</p>
                      </div>
                      <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-300 transition-colors">
                        <User size={14} /> Profile
                      </Link>
                      <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 transition-colors w-full">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Join</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/5">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 py-3 space-y-1 fade-in">
            <NavLink to="/auctions" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link block ${isActive ? 'active' : ''}`}>Explore</NavLink>
            {!user && (
              <Link to="/#how-it-works" onClick={() => setMobileOpen(false)} className="nav-link block">
                How it works
              </Link>
            )}
            {user && (
              <>
                <NavLink to="/auctions/create" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link block ${isActive ? 'active' : ''}`}>
                  <Plus size={14} className="inline mr-1" /> List Item
                </NavLink>
                <NavLink to="/my/listings" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link block ${isActive ? 'active' : ''}`}>My Listings</NavLink>
                <NavLink to="/my/bids" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link block ${isActive ? 'active' : ''}`}>My Bids</NavLink>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
