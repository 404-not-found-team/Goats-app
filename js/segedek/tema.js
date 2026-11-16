const savedTheme = localStorage.getItem('goats_theme') || 'discord-purple';
document.documentElement.setAttribute('data-theme', savedTheme);
