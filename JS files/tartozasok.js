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
    const hue = (extraIndex * 137.5) % 360; 
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

    const kinekSelect = document.getElementById('kinekInput');
    const kiTartozikSelect = document.getElementById('kiTartozikInput');

    if (kinekSelect && kiTartozikSelect) {
        kinekSelect.innerHTML = '<option value="" disabled selected>Kinek tartozik?</option>';
        kiTartozikSelect.innerHTML = '<option value="" disabled selected>Ki tartozik?</option>';

        members.forEach(member => {
            const opt1 = document.createElement('option');
            opt1.value = member;
            opt1.textContent = getNakNek(member);
            kinekSelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = member;
            opt2.textContent = member;
            kiTartozikSelect.appendChild(opt2);
        });
    }

    const gridContainer = document.querySelector('.tartozasok-grid');
    if (gridContainer) {
        gridContainer.innerHTML = ''; 

        members.forEach((member, index) => {
            const normalizedName = member
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();

            const boxDiv = document.createElement('div');
            boxDiv.className = 'box';
            
            const color = getMemberColor(index, Math.max(members.length, 20));
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
                    const color = getMemberColor(memberIndex, Math.max(members.length, 20));
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
    const kinek = document.getElementById('kinekInput').value;
    const kiTartozik = document.getElementById('kiTartozikInput').value;

    if (!miert || !mennyiert || !kinek || !kiTartozik) {
        alert('Kérlek töltsd ki az összes mezőt!');
        return;
    }

    const { error } = await _supabase
        .from('tartozasok')
        .insert([{
            miert: miert,
            mennyiert: mennyiert,
            kinek: kinek,
            kitartozik: kiTartozik,
            group_code: groupCode
        }]);

    if (error) {
        console.error('Hiba a mentéskor:', error);
        return;
    }

    document.getElementById('miertInput').value = '';
    document.getElementById('mennyiertInput').value = '';
    document.getElementById('kinekInput').selectedIndex = 0;
    document.getElementById('kiTartozikInput').selectedIndex = 0;

    loadTartozasok();
}