window.onload = function () {
    loadTervek();
};

async function loadTervek() {
    const groupCode = localStorage.getItem('goats_group_code');

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
        renderTervItem(terv.id, terv.text, terv.completed);
    });
}

async function add() {
    const groupCode = localStorage.getItem('goats_group_code');
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
    const groupCode = localStorage.getItem('goats_group_code');
    
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

function renderTervItem(id, text, isCompleted) {
    const container = document.querySelector('.tervek');

    const itemDiv = document.createElement('div');
    itemDiv.className = 'terv-item';
    if (isCompleted) {
        itemDiv.classList.add('completed');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isCompleted;

    const span = document.createElement('span');
    span.textContent = text;

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
        const groupCode = localStorage.getItem('goats_group_code');
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
    itemDiv.appendChild(span);
    itemDiv.appendChild(deleteSpan);

    if (isCompleted) {
        container.appendChild(itemDiv);
    } else {
        container.prepend(itemDiv);
    }
}