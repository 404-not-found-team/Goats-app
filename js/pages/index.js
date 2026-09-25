document.addEventListener('DOMContentLoaded', () => {
    const isLogged = !!localStorage.getItem('goats_group_code');

    const kijelentkezettDiv = document.getElementById('kijelentkezett-nezet');
    const bejelentkezettDiv = document.getElementById('bejelentkezett-nezet');

    if (isLogged) {
        if (kijelentkezettDiv) kijelentkezettDiv.style.display = 'none';
        if (bejelentkezettDiv) bejelentkezettDiv.style.display = 'grid'; // vagy 'flex', a régi CSS-edtől függően
    } else {
        if (kijelentkezettDiv) kijelentkezettDiv.style.display = 'flex';
        if (bejelentkezettDiv) bejelentkezettDiv.style.display = 'none';
    }
});