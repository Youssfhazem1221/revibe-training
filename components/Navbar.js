'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar({ title = 'Dashboard' }) {
  const { user, role, isTrainer, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();

  const navLinks = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'dashboard',
      forTrainer: false,
      forTrainee: true
    },
    {
      name: 'My Learning',
      path: '/dashboard/my-learning',
      icon: 'school',
      forTrainer: false,
      forTrainee: true
    },
    {
      name: 'Analytics',
      path: '/dashboard/analytics',
      icon: 'analytics',
      forTrainer: true,
      forTrainee: false
    },
    {
      name: 'Users',
      path: '/dashboard/users',
      icon: 'people',
      forTrainer: true,
      forTrainee: false
    }
  ];

  const visibleLinks = navLinks.filter(link => {
    if (isTrainer && link.forTrainer) return true;
    if (!isTrainer && link.forTrainee) return true;
    return false;
  });

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo gradient-text">REVIBE</div>
        <div className="navbar-divider"></div>
        <div className="navbar-page-title">{title}</div>
      </div>

      {/* Navigation Links */}
      <div className="navbar-nav">
        {visibleLinks.map(link => (
          <button
            key={link.path}
            className={`navbar-nav-link ${pathname === link.path ? 'active' : ''}`}
            onClick={() => router.push(link.path)}
            title={link.name}
          >
            <i className="material-icons">{link.icon}</i>
            <span>{link.name}</span>
          </button>
        ))}
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
