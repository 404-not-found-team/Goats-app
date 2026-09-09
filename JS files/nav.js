const htmlNevek = ["index", "tartozasok", "tervek", "ranglista", "goatsgame"];
const oldalNevek = ["Kezdőlap", "Tartozások", "Tervek", "Ranglista", "Goats Game"];
const oldalEmojik = ["🏠", "💸", "📋", "🍹", "🎮"];

const navBar = document.getElementById("navBar");

const aktualisUtvonal = window.location.pathname.split('/').pop() || "index.html";

for (let i = 0; i < htmlNevek.length; i++) {

    const oldal = document.createElement('li');
    const link = document.createElement('a');
    const teljesNev = document.createElement('span');
    const emojiNev = document.createElement('span');

    const celFajl = `${htmlNevek[i]}.html`;

    if (aktualisUtvonal === celFajl) {
        oldal.className = "active";
    }

    teljesNev.textContent = `${oldalNevek[i]}`;
    teljesNev.className = "teljes-szoveg"
    link.appendChild(teljesNev)

    emojiNev.textContent = `${oldalEmojik[i]}`;
    emojiNev.className = "rovid-szoveg"
    link.appendChild(emojiNev)

    link.href = celFajl;
    oldal.appendChild(link)

    navBar.appendChild(oldal)
}

