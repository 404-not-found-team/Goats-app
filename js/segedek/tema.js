const savedTheme = localStorage.getItem('goats_theme') || 'discord-purple';
document.documentElement.setAttribute('data-theme', savedTheme);

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('goats_theme', themeName);
}