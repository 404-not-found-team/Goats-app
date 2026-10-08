window.onload = async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    loadTervek();
};

// aktualisGroupCode(): lásd js/segedek/csoport-kod.js (közös, minden klasszikus oldalscript használja)

async function loadTervek() {
    const groupCode = aktualisGroupCode();

    const { data, error } = await _supabase
        .from('tervek')
        .select('*')
        .eq('group_code', groupCode)
        .order('id', { ascending: false });

    if (error) {
        console.error('Hiba a betöltéskor:', error);
        return;
    }

    const container = document.querySelector('.tervek');
    container.innerHTML = '';
    data.forEach(terv => {
        renderTervItem(terv.id, terv.text, terv.completed, terv.felvette_id, terv.created_at);
    });
}

// A tag neve az azonosítója alapján (a csoporttagok listájából, amit az auth-service már betöltött)
function tagNevId(userId) {
    const tag = window.goatsAuth?.getState()?.members?.find(m => m.user_id === userId);
    return tag ? tag.display_name : 'Törölt tag';
}

async function add() {
    const groupCode = aktualisGroupCode();
    const inputField = document.getElementById('tervInput');
    const text = inputField.value.trim();

    if (text === '') return;

    const { data, error } = await _supabase
        .from('tervek')
        .insert([{ 
            text: text, 
            completed: false,
            group_code: groupCode
        }])
        .select();

    if (error) {
        console.error('Hiba a mentéskor:', error);
        return;
    }

    inputField.value = '';
    loadTervek();
}

// Terv törlése Supabase-ből
async function deleteTerv(id) {
    const groupCode = aktualisGroupCode();

    const { error } = await _supabase
        .from('tervek')
        .delete()
        .eq('id', id)
        .eq('group_code', groupCode);

    if (error) {
        console.error('Hiba a törléskor:', error);
        alert('Hiba történt a törlés során!');
        return;
    }

    loadTervek();
}

function renderTervItem(id, text, isCompleted, felvetteId, createdAt) {
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
        const mikor = createdAt ? ' · ' + new Date(createdAt).toLocaleDateString('hu-HU') : '';
        meta.textContent = `Felvette: ${tagNevId(felvetteId)}${mikor}`;
        szovegSor.appendChild(meta);
    }

    // Törlés gomb (kuka ikon)
    const deleteSpan = document.createElement('span');
    deleteSpan.textContent = '🗑️';
    deleteSpan.className = 'delete-btn';
    deleteSpan.title = 'Törlés';
    deleteSpan.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteTerv(id);
    });

    checkbox.addEventListener('change', async function () {
        const groupCode = aktualisGroupCode();
        const checked = checkbox.checked;

        const { error } = await _supabase
            .from('tervek')
            .update({ completed: checked })
            .eq('id', id)
            .eq('group_code', groupCode);

        if (error) {
            console.error('Hiba a frissítéskor:', error);
            return;
        }

        loadTervek();
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