const savedTheme = localStorage.getItem('goats_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('goats_theme', themeName);
}