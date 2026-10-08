export function initThemePicker() {
  const get = id => document.getElementById(id);
  const themeDropdown = get('custom-theme-dropdown');
  const themeSelectedText = get('theme-dropdown-selected-text');
  const themeOptionsContainer = get('theme-dropdown-options');

  const themes = [
    { id: 'dark', name: 'Sötét' },
    { id: 'light', name: 'Világos' },
    { id: 'discord-brown', name: 'Barna' },
    { id: 'discord-purple', name: 'Mélylila' },
    { id: 'cyberpunk', name: 'Neon' }
  ];

  const currentTheme = localStorage.getItem('goats_theme') || 'dark';
  const foundTheme = themes.find(t => t.id === currentTheme);
  if (themeSelectedText && foundTheme) themeSelectedText.textContent = foundTheme.name;

  if (themeOptionsContainer) {
    themeOptionsContainer.innerHTML = '';
    themes.forEach(t => {
      const optionDiv = document.createElement('div');
      optionDiv.className = `dropdown-option ${t.id === currentTheme ? 'selected' : ''}`;
      optionDiv.textContent = t.name;

      optionDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        document.documentElement.setAttribute('data-theme', t.id);
        localStorage.setItem('goats_theme', t.id);
        themeSelectedText.textContent = t.name;
        themeOptionsContainer.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
        optionDiv.classList.add('selected');
        themeDropdown.classList.remove('open');
      });

      themeOptionsContainer.appendChild(optionDiv);
    });
  }

  themeDropdown?.addEventListener('click', (e) => {
    e.stopPropagation();
    themeDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => themeDropdown?.classList.remove('open'));
}