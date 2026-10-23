**Wersja poprawiona:** plik `index.html` można otworzyć bezpośrednio dwuklikiem. Nie wymaga serwera do trybu lokalnego.

# Kolejka Pytań — aplikacja webowa

Aplikacja zawiera 31 osób, sterowanie kolejką, licznik, pasek postępu, pełną listę oraz import/eksport TXT. Wersja online synchronizuje zmiany na żywo między urządzeniami za pomocą Firebase Realtime Database.

## 1. Najprostsze uruchomienie — tryb lokalny

Otwórz `index.html` w Chrome, Firefox lub Edge. Nie trzeba nic instalować ani mieć internetu. Kliknij „Następna osoba” albo naciśnij strzałkę →; strzałka ← cofa. Spacja przełącza na kolejną, Ctrl+Z cofa. Postęp zapisuje się w `localStorage` danej przeglądarki.

W trybie lokalnym podgląd `?mode=viewer` pokazuje kolejkę tylko na tym komputerze / w tej samej przeglądarce. **Nie udostępnia jej innym urządzeniom.**

## 2. Publikowanie aplikacji na GitHub Pages

1. Utwórz repozytorium GitHub, np. `kolejka-pytan`.
2. Prześlij do katalogu głównego repozytorium pliki `index.html`, `style.css`, `app.js`, `firebase-config.js` i opcjonalnie `osoby.txt`.
3. Wejdź w Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save.
4. Po opublikowaniu otwórz adres w formacie `https://TWOJ-LOGIN.github.io/kolejka-pytan/`.

Strona działa przez HTTPS i zwykle jest dostępna również z sieci uczelnianej, o ile administrator nie blokuje danego hosta. Sam GitHub Pages **nie** zapewnia synchronizacji kolejki.

## 3. Włączenie trybu online (Firebase)

1. Przejdź do https://console.firebase.google.com/ i utwórz projekt Firebase.
2. W Project settings → Your apps utwórz aplikację **Web** i skopiuj `firebaseConfig`.
3. W Firebase → Build → Realtime Database utwórz bazę i zanotuj `databaseURL`. To musi być **Realtime Database**, nie Firestore.
4. W Firebase → Build → Authentication → Sign-in method włącz **Email/Password**; w Users dodaj konto prowadzącego (adres e-mail i silne hasło).
5. Skopiuj UID tego konta z zakładki Authentication → Users.
6. W Realtime Database → Rules wklej reguły poniżej (zamień UID na własny) i kliknij Publish:

```json
{
  "rules": {
    "queues": {
      "$queueId": {
        ".read": true,
        ".write": "auth != null && auth.uid === 'TU_WSTAW_UID_PROWADZACEGO'"
      }
    }
  }
}
```

7. W `firebase-config.js` wpisz konfigurację projektu:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "twoj-projekt.firebaseapp.com",
  databaseURL: "https://twoj-projekt-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "twoj-projekt",
  appId: "..."
};
window.QUEUE_ID = "pytania-wrs-mini";
```

8. Zapisz plik i opublikuj całą aplikację na GitHub Pages. W panelu kliknij „⚙ Połączenie online”, zaloguj się na konto prowadzącego i kliknij **„☁ Opublikuj kolejkę”**. Uwaga: publikacja bierze bieżącą kolejkę lokalną (domyślnie 31 osób). Jeśli online jest już kolejka, przycisk nie nadpisuje jej.
9. Udostępnij widzom link z parametrem `?mode=viewer`, np. `https://TWOJ-LOGIN.github.io/kolejka-pytan/?mode=viewer`. Widzowie widzą aktualizacje automatycznie i nie mają przycisków sterowania.

**Bezpieczeństwo:** `firebase-config.js` zawiera publiczną konfigurację aplikacji, **nie hasło** ani klucz serwisowy. Uprawnienia do zapisu kontrolują reguły bazy. Nie wkładaj do repozytorium haseł, prywatnych kluczy czy danych osobowych, których nie chcesz ujawniać. Ustawienie `.read: true` oznacza, że lista jest publicznie odczytywalna dla każdego, kto zna jej adres w bazie. Jeżeli nazwiska mają być dostępne tylko dla określonej grupy, trzeba zastosować uwierzytelnianie również dla widzów.

## 4. Obsługa aplikacji

- **→ / Spacja:** następna osoba (tylko prowadzący).
- **← / Ctrl+Z:** cofnięcie.
- **Pełna lista:** podgląd wszystkich nazwisk w kolejności, ze statusami.
- **Wczytaj TXT:** import nowej kolejki (jedno nazwisko na linię) i reset postępu.
- **Eksport TXT:** pobranie aktualnej listy osób.
- **Resetuj:** przywrócenie pierwszej osoby.
- **Widok publiczny:** podgląd bez możliwości sterowania.

Dla trybu Firebase konieczny jest dostęp do internetu i adresów Firebase, a na urządzeniu prowadzącego także zalogowanie. Jeśli uczelniana sieć blokuje usługi Google/Firebase, sprawdź działanie przez internet mobilny.

## 5. Ograniczenia

- Bez Firebase strony otwarte na różnych komputerach **nie** synchronizują się.
- Po zmianie ustawień Firebase na GitHub Pages może być konieczne przeładowanie strony.
- Lokalny postęp zależy od przeglądarki. W trybie online trwałą kopię przechowuje Firebase.
