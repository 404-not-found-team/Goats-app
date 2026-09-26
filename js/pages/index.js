document.addEventListener('DOMContentLoaded', () => {
    const isLogged = !!localStorage.getItem('goats_group_code');

    const kijelentkezettDiv = document.getElementById('kijelentkezett-nezet');
    const bejelentkezettDiv = document.getElementById('bejelentkezett-nezet');

    if (isLogged) {
        if (kijelentkezettDiv) kijelentkezettDiv.classList.add('hidden');
        if (bejelentkezettDiv) bejelentkezettDiv.classList.remove('hidden');
    } else {
        if (kijelentkezettDiv) kijelentkezettDiv.classList.remove('hidden');
        if (bejelentkezettDiv) bejelentkezettDiv.classList.add('hidden');
    }
});