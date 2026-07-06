const Navbar = () => {
  return (
    <nav className="navbar">
      <h2 className="logo">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm6PBPcx0VR__gHIk14fso2avMv-BKwOfOtIUFGACooQ&s"
          className="react-logo"
        />
        My React App
      </h2>

      <ul className="nav-links">
        <li><a href="">Home</a></li>
        <li><a href="">Search</a></li>
        <li><a href="">Profile</a></li>
      </ul>
    </nav>
  );
};

export default Navbar;