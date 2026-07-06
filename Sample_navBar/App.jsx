import { useState } from "react";
import "./App.css";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import ThemeButton from "./Components/ThemeButton";

function App() {
  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleClick = () => {
    alert("Welcome user");
  };

  return (
    <div className={darkMode ? "dark" : "light"}>
      <Navbar />

      <div className="theme-toggle-row">
        <ThemeButton darkMode={darkMode} toggleTheme={toggleTheme} />
      </div>

      <main>
        <div className="intro-container">
          <h1 className="intro-title">What is React?</h1>
          <p className="intro-text">
            React (also known as React.js or ReactJS) is a free,
            open-source JavaScript library developed by Meta
            (formerly Facebook) for building interactive user
            interfaces (UIs) for web and native applications.
            It is widely popular for creating Single Page
            Applications (SPAs) because it enables developers
            to build fast, scalable web apps that update
            dynamically without refreshing the entire browser.
          </p>
          <br />
          <br />
          <button onClick={handleClick}>
            Click
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;