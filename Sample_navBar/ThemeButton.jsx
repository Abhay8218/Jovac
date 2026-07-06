const ThemeButton = ({darkMode, toggleTheme}) => {
    return (
        <button onClick={toggleTheme}>
            {darkMode ? 'LightMode' : 'DarkMode'}
        </button>
    )
}
export default ThemeButton;