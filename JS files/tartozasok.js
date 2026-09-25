window.onload = function () {
    initMembersAndContainers();
    loadTartozasok();
};

function getNakNek(name) {
    if (!name) return '';

    const lowerName = name.toLowerCase().trim();
    const melyMgh = ['a', 'á', 'o', 'ó', 'u', 'ú'];
    const vanBenneMely = lowerName.split('').some(char => melyMgh.includes(char));

    if (vanBenneMely) {
        return name + 'nak';
    }

    return name + 'nek';
}

const PALETTE = [
    '#470047',
    '#FF7F50',
    '#5D3FD3',
    '#15BF16',
    '#9C27B0',
    '#FF9800',
    '#00BCD4',
    '#E91E63',
    '#4CAF50',
    '#FFEB3B',
    '#3F51B5',
    '#009688',
    '#FF5722',
    '#795548',
    '#607D8B'
];

function getMemberColor(index) {
    if (index < PALETTE.length) {
        return PALETTE[index];
    }
    const extraIndex = index - PALETTE.length;
    return `hsl(${(extraIndex * 137.5) % 360}, 70%, 50%)`;
}

let selectedKinek = '';

function toggleDropdown() {
    const content = document.getElementById('dropdownContent');
    const isShowing = content ? content.classList.contains('show') : false;
    closeAllDropdowns();
    if (content && !isShowing) content.classList.add('show');
}

function toggleKinekDropdown() {
    const content = document.getElementById('kinekDropdownContent');
    const isShowing = content ? content.classList.contains('show') : false;
    closeAllDropdowns();
    if (content && !isShowing) content.classList.add('show');
}

function closeAllDropdowns() {
    const c1 = document.getElementById('dropdownContent');
    const c2 = document.getElementById('kinekDropdownContent');
    if (c1) c1.classList.remove('show');
    if (c2) c2.classList.remove('show');
}

window.addEventListener('click', function (e) {
    const d1 = document.getElementById('kiTartozikDropdown');
    const d2 = document.getElementById('kinekDropdown');

    if ((!d1 || !d1.contains(e.target)) && (!d2 || !d2.contains(e.target))) {
        closeAllDropdowns();
    }
});

function selectKinek(member, ragozottNev) {
    selectedKinek = member;
    const label = document.getElementById('kinekDropdownLabel');
    if (label) {
        label.textContent = ragozottNev;
    }

    const items = document.querySelectorAll('#kinekDropdownContent .dropdown-item');
    items.forEach(item => {
        if (item.dataset.value === member) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    closeAllDropdowns();
}

function updateDropdownLabel() {
    const checkedBoxes = document.querySelectorAll('#dropdownContent input[type="checkbox"]:checked');
    const label = document.getElementById('dropdownBtnLabel');
    if (!label) return;

    if (checkedBoxes.length === 0) {
        label.textContent = 'Ki tartozik?';
    } else if (checkedBoxes.length === 1) {
        label.textContent = checkedBoxes[0].value;
    } else {
        label.textContent = `${checkedBoxes.length} ember kiválasztva`;
    }
}

async function initMembersAndContainers() {
    const groupCode = localStorage.getItem('goats_group_code');
    let members = [];

    const { data } = await _supabase
        .from('groups')
        .select('members')
        .eq('group_code', groupCode)
        .single();

    if (data && data.members && data.members.length > 0) {
        members = data.members;
        localStorage.setItem('goats_group_members', JSON.stringify(members));
    } else {
        members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');
    }

    const kinekContent = document.getElementById('kinekDropdownContent');
    const dropdownContent = document.getElementById('dropdownContent');

    if (kinekContent) {
        kinekContent.innerHTML = '';
        members.forEach(member => {
            const ragozottNev = getNakNek(member);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dropdown-item';
            itemDiv.dataset.value = member;
            itemDiv.textContent = ragozottNev;

            itemDiv.addEventListener('click', () => selectKinek(member, ragozottNev));
            kinekContent.appendChild(itemDiv);
        });
    }

    if (dropdownContent) {
        dropdownContent.innerHTML = '';
        members.forEach(member => {
            const itemDiv = document.createElement('label');
            itemDiv.className = 'dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member;
            checkbox.addEventListener('change', updateDropdownLabel);

            const span = document.createElement('span');
            span.textContent = member;

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(span);
            dropdownContent.appendChild(itemDiv);
        });
    }

    const gridContainer = document.querySelector('.tartozasok-grid');
    if (gridContainer) {
        gridContainer.innerHTML = '';
        members.forEach((member, index) => {
            const normalizedName = member.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const boxDiv = document.createElement('div');
            boxDiv.className = 'box';
            const color = getMemberColor(index);
            boxDiv.style.borderTopColor = color;

            const h3 = document.createElement('h3');
            h3.textContent = member;

            const listDiv = document.createElement('div');
            listDiv.className = normalizedName;

            boxDiv.appendChild(h3);
            boxDiv.appendChild(listDiv);
            gridContainer.appendChild(boxDiv);
        });
    }
}

async function loadTartozasok() {
    const groupCode = localStorage.getItem('goats_group_code');

    const { data, error } = await _supabase
        .from('tartozasok')
        .select('*')
        .eq('group_code', groupCode)
        .order('id', { ascending: false });

    if (error) {
        console.error('Hiba a betöltéskor:', error);
        return;
    }

    const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');

    members.forEach(member => {
        const normalizedName = member.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const targetDiv = document.querySelector(`.${normalizedName}`);
        if (targetDiv) targetDiv.innerHTML = '';
    });

    if (data && data.length > 0) {
        data.forEach(item => {
            if (!item.kitartozik) return;

            const normalizedName = item.kitartozik.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const targetDiv = document.querySelector(`.${normalizedName}`);

            if (targetDiv) {
                const card = document.createElement('div');
                card.className = 'tartozas-kartya';

                const memberIndex = members.indexOf(item.kitartozik);
                if (memberIndex !== -1) {
                    const color = getMemberColor(memberIndex);
                    card.style.borderLeftColor = color;
                }

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';

                const ragozottNev = getNakNek(item.kinek);
                const textSpan = document.createElement('span');
                textSpan.textContent = `${ragozottNev} ${item.mennyiert} Ft-tal - ${item.miert}`;

                const deleteSpan = document.createElement('span');
                deleteSpan.textContent = '🗑️';
                deleteSpan.title = 'Törlés';
                deleteSpan.style.cursor = 'pointer';
                deleteSpan.style.paddingLeft = '8px';
                deleteSpan.addEventListener('click', () => deleteTartozas(item.id));

                row.appendChild(textSpan);
                row.appendChild(deleteSpan);
                card.appendChild(row);

                targetDiv.appendChild(card);
            }
        });
    }

    members.forEach(member => {
        const normalizedName = member.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const targetDiv = document.querySelector(`.${normalizedName}`);
        if (targetDiv && targetDiv.children.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-msg';
            emptyMsg.textContent = 'Még nincs tartozás';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.opacity = '0.5';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.marginTop = '40px';
            targetDiv.appendChild(emptyMsg);
        }
    });
}

async function deleteTartozas(id) {
    const groupCode = localStorage.getItem('goats_group_code');
    const { error } = await _supabase
        .from('tartozasok')
        .delete()
        .eq('id', id)
        .eq('group_code', groupCode);

    if (error) {
        alert('Hiba történt a törlés során!');
        return;
    }

    loadTartozasok();
}

async function addTartozas() {
    const groupCode = localStorage.getItem('goats_group_code');
    const miert = document.getElementById('miertInput').value.trim();
    const mennyiert = document.getElementById('mennyiertInput').value.trim();
    const kinek = selectedKinek;

    const checkedBoxes = document.querySelectorAll('#dropdownContent input[type="checkbox"]:checked');
    const kijeloltKik = Array.from(checkedBoxes).map(cb => cb.value);

    if (!miert || !mennyiert || !kinek || kijeloltKik.length === 0) {
        alert('Kérlek töltsd ki az összes mezőt és válassz ki legalább egy adóst!');
        return;
    }

    const ujTartozasok = kijeloltKik.map(ki => ({
        miert: miert,
        mennyiert: mennyiert,
        kinek: kinek,
        kitartozik: ki,
        group_code: groupCode
    }));

    const { error } = await _supabase
        .from('tartozasok')
        .insert(ujTartozasok);

    if (error) {
        console.error('Hiba a mentéskor:', error);
        alert('Hiba történt a mentés során!');
        return;
    }

    document.getElementById('miertInput').value = '';
    document.getElementById('mennyiertInput').value = '';

    selectedKinek = '';
    document.getElementById('kinekDropdownLabel').textContent = 'Kinek tartozik?';
    document.querySelectorAll('#kinekDropdownContent .dropdown-item').forEach(i => i.classList.remove('selected'));

    checkedBoxes.forEach(cb => cb.checked = false);
    updateDropdownLabel();

    loadTartozasok();
}