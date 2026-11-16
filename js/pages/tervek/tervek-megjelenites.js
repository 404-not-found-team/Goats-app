function tagNevId(userId) {
    const tag = window.goatsAuth?.getState()?.members?.find(m => m.user_id === userId);
    return tag ? tag.display_name : tr('deleted_member', 'Törölt tag');
}

function renderTervItem(id, text, isCompleted, felvetteId, createdAt, muveletek) {
    const container = document.querySelector('.tervek');

    const itemDiv = document.createElement('div');
    itemDiv.className = 'terv-item';
    if (isCompleted) {
        itemDiv.classList.add('completed');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isCompleted;

    const szovegSor = document.createElement('div');
    szovegSor.className = 'terv-szoveg-sor';
    const span = document.createElement('span');
    span.textContent = text;
    szovegSor.appendChild(span);

    if (felvetteId) {
        const meta = document.createElement('div');
        meta.className = 'meta-szoveg';
        const mikor = createdAt ? ' · ' + new Date(createdAt).toLocaleDateString(goatsNyelv.locale()) : '';
        meta.textContent = tr('added_by', 'Felvette: {who}', { who: tagNevId(felvetteId) }) + mikor;
        szovegSor.appendChild(meta);
    }

    // Törlés gomb (kuka ikon)
    const deleteSpan = document.createElement('span');
    deleteSpan.textContent = '🗑️';
    deleteSpan.className = 'delete-btn';
    deleteSpan.title = tr('delete', 'Törlés');
    deleteSpan.addEventListener('click', function (e) {
        e.stopPropagation();
        muveletek.torleskor(id);
    });

    checkbox.addEventListener('change', async function () {
        if (!await muveletek.pipalaskor(id, checkbox.checked)) {
            checkbox.checked = !checkbox.checked;
        }
    });

    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(szovegSor);
    itemDiv.appendChild(deleteSpan);

    if (isCompleted) {
        container.appendChild(itemDiv);
    } else {
        container.prepend(itemDiv);
    }
}

export function listaKirajzolasa(tervek, muveletek) {
    const container = document.querySelector('.tervek');
    container.innerHTML = '';
    tervek.forEach(terv => {
        renderTervItem(terv.id, terv.text, terv.completed, terv.felvette_id, terv.created_at, muveletek);
    });
}