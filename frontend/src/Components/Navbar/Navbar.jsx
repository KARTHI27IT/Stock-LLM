
import './Navbar.css'

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg ">
      <div className="container-fluid" id = "navbar">
       
       <div>
         <h1>Stock LLM</h1>
       </div>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="me-0">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link active button" aria-current="page" href="#">
                Home
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link active button" aria-current="page" href="#">
                Login
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link active button" aria-current="page" href="#">
                Signup
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link active button" aria-current="page" href="#">
                Dashboard
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
