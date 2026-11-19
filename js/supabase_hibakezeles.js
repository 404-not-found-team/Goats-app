export function hibaVan(error, muvelet, uzenet) {
    if (error) {
        console.error(`Hiba ${muvelet}:`, error);
        if (uzenet)
            goatsAblak.toast(uzenet, 'hiba');
        return true;
    }
    return false;
}

window.goatsHiba = { hibaVan };