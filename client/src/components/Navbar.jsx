import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        EventHub
      </Link>

      <nav className="navbar__links" aria-label="Main navigation">
        <NavLink to="/events" className={({ isActive }) => isActive ? 'navbar__link navbar__link--active' : 'navbar__link'}>
          Events
        </NavLink>

        {user?.role === 'organizer' && (
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'navbar__link navbar__link--active' : 'navbar__link'}>
            Dashboard
          </NavLink>
        )}

        {user?.role === 'attendee' && (
          <NavLink to="/bookings" className={({ isActive }) => isActive ? 'navbar__link navbar__link--active' : 'navbar__link'}>
            My Bookings
          </NavLink>
        )}
      </nav>

      <div className="navbar__auth">
        {user ? (
          <>
            <span className="navbar__user">
              {user.name} <em>({user.role})</em>
            </span>
            <button onClick={handleLogout} className="btn btn--outline">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn--outline">Login</Link>
            <Link to="/register" className="btn btn--primary">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
