'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar({ title = 'Dashboard' }) {
  const { user, role, isTrainer, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo gradient-text">REVIBE</div>
        <div className="navbar-divider"></div>
        <div className="navbar-page-title">{title}</div>
      </div>
      
      <div className="navbar-actions">
        {role && (
          <div className={`badge ${isTrainer ? 'badge-pink' : 'badge-purple'}`}>
            {isTrainer ? 'TRAINER' : 'TRAINEE'}
          </div>
        )}
        
        <div className="navbar-user">
          <div className="navbar-avatar">{initials}</div>
          <div className="navbar-email">{displayName}</div>
        </div>
        
        <button onClick={handleSignOut} className="btn btn-ghost btn-sm" title="Sign Out">
          <i className="material-icons">logout</i>
        </button>
      </div>
    </nav>
  );
}
