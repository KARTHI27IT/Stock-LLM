import './Navbar.css';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const Navbar = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setIsLoggedIn(true);
      setUserEmail(email);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid" id="navbar">
        <div>
          <h1>Stock LLM</h1>
        </div>
        <div className="me-0">
          <ul className="navbar-nav">
            {!isLoggedIn && (
              <>
                <li className="nav-item">
                  <Link className="nav-link active button" to="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link active button" to="/signup">
                    Signup
                  </Link>
                </li>
              </>
            )}

            {isLoggedIn && (
              <>
                <li className="nav-item">
                  <Link className="nav-link active button" to="/dashboard">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item mt-2">
                  <button className="nav-link active button" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
