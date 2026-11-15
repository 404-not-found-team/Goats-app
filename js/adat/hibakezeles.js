export function hibaVan(error, muvelet, uzenet) {
    if (error) {
        console.error(`Hiba ${muvelet}:`, error);
        if (uzenet)
            alert(uzenet);
        return true;
    }
    return false;
}

window.goatsHiba = { hibaVan };