import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import '../../styles/layout/app-shell.css';
import '../../styles/layout/header.css';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { errorMessage } from '../../services/api-client';
import { cx } from '../../utils/cx';
import { Button, ButtonLink } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Spinner } from '../ui/Spinner';
import { NotificationBell } from '../requests/NotificationBell';
import { OfflineBanner } from './OfflineBanner';
import { ThemeToggle } from './ThemeToggle';
import { UpdatePrompt } from './UpdatePrompt';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const CITIZEN_NAV: NavItem[] = [
  { to: '/requests', label: 'My requests', icon: 'bx-list-ul', end: true },
  { to: '/requests/new', label: 'Report issue', icon: 'bx-plus-circle' },
  { to: '/notifications', label: 'Updates', icon: 'bx-bell' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'bx-bar-chart-alt-2', end: true },
  { to: '/admin/requests', label: 'Requests', icon: 'bx-task' },
];

function MainNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="nav" aria-label="Main">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end ?? false} className="nav__link">
          <Icon name={item.icon} className="nav__icon" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSignOut = async () => {
    // A guest session cannot be recovered after signing out.
    if (
      user?.isGuest &&
      !window.confirm(
        'Leave guest mode? You will no longer be able to follow the reports you sent from this device.',
      )
    ) {
      return;
    }
    try {
      await signOut();
      void navigate('/login', { replace: true });
    } catch (error) {
      toast.show({ tone: 'error', title: 'Sign out failed', message: errorMessage(error) });
    }
  };

  return (
    <div className="user-menu">
      {user && <span className="user-menu__name">{user.isGuest ? 'Guest' : user.fullName}</span>}
      <Button
        variant="ghost"
        icon="bx-log-out"
        aria-label="Sign out"
        title="Sign out"
        onClick={() => void handleSignOut()}
      />
    </div>
  );
}

export function AppShell() {
  const { status, user } = useAuth();
  const navItems = user ? (user.role === 'admin' ? ADMIN_NAV : CITIZEN_NAV) : [];

  return (
    <div className={cx('app-shell', navItems.length > 0 && 'app-shell--with-nav')}>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <UpdatePrompt />
      <OfflineBanner />
      <header className="header">
        <div className="header__inner">
          <Link to="/" className="header__brand">
            <img className="header__logo" src="/favicon.svg" alt="" width="32" height="32" />
            <span className="header__brand-text">Murang&rsquo;a Services</span>
          </Link>
          {navItems.length > 0 && <MainNav items={navItems} />}
          <div className="header__actions">
            {user?.role === 'citizen' && <NotificationBell userId={user.id} />}
            <ThemeToggle />
            {status === 'authenticated' ? (
              <UserMenu />
            ) : (
              status === 'anonymous' && (
                <ButtonLink variant="secondary" size="sm" to="/login">
                  Sign in
                </ButtonLink>
              )
            )}
          </div>
        </div>
      </header>
      {user?.isGuest && (
        <div className="banner banner--guest" role="status">
          <Icon name="bx-user" className="banner__icon" />
          Guest mode: your reports are anonymous and can be followed on this device until you sign
          out.
          <Link to="/register">Create an account</Link>
        </div>
      )}
      <main id="main" className="app-shell__main" tabIndex={-1}>
        <Suspense fallback={<Spinner label="Loading page" />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="footer">
        County Government of Murang&rsquo;a &middot; Public service requests
      </footer>
    </div>
  );
}
