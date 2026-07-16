'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { APP_VERSION } from '@/lib/version';

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
        <div className="navbar-logo-group">
          <div className="navbar-logo gradient-text">REVIBE</div>
          <span className="navbar-version" title={`App version ${APP_VERSION}`}>v{APP_VERSION}</span>
        </div>
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
        <div className="navbar-user">
          <div className="navbar-avatar">{initials}</div>
          <div className="navbar-user-meta">
            <div className="navbar-email">{displayName}</div>
            {role && (
              <span className={`navbar-role-tag ${isTrainer ? 'is-trainer' : 'is-trainee'}`}>
                {isTrainer ? 'Trainer' : 'Trainee'}
              </span>
            )}
          </div>
        </div>

        <button onClick={handleSignOut} className="navbar-signout" title="Sign out" aria-label="Sign out">
          <i className="material-icons">logout</i>
        </button>
      </div>
    </nav>
  );
}
