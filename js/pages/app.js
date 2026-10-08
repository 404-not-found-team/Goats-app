// app.html őrzője: ha nincs érvényes munkamenet, azonnal vissza a kezdőlapra (index.html).
// A tényleges jogosultságot ettől függetlenül mindig a szerver (RLS) dönti el; ez csak a
// felületet védi a felesleges, "üres" bejelentkezett nézet megjelenésétől.
import { ready, getState } from '../auth-service.js';

await ready;
const { user } = getState();
if (!user) {
    location.replace('index.html');
}
