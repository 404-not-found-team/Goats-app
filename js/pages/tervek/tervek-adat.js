import { client } from '../../supabase-client.js';
import { hibaVan } from '../../supabase_hibakezeles.js';

export async function tervekLekerese(groupCode) {
    const { data, error } = await client
        .from('tervek')
        .select('*')
        .eq('group_code', groupCode)
        .order('id', { ascending: false });

    if (hibaVan(error, 'betöltéskor')) return;

    return data || [];
}

export async function tervHozzaadasa(groupCode, szoveg) {
    const { error } = await client
        .from('tervek')
        .insert([{
            text: szoveg,
            completed: false,
            group_code: groupCode
        }]);

    return !hibaVan(error, 'mentéskor');
}

export async function tervTorlese(id, groupCode) {
    const { error } = await client
        .from('tervek')
        .delete()
        .eq('id', id)
        .eq('group_code', groupCode);

    return !hibaVan(error, 'törléskor');
}

export async function tervAllapotMentese(id, groupCode, kesz) {
    const { error } = await client
        .from('tervek')
        .update({ completed: kesz })
        .eq('id', id)
        .eq('group_code', groupCode);

    return !hibaVan(error, 'frissítéskor');
}