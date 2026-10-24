# SSPW 2.1 — poprawka synchronizacji trybów

Naprawiono błąd transakcji Firebase: wcześniejsza wersja usuwała `specialMode` i `modeTexts` przed wysłaniem zmian do bazy. Teraz zachowuje cały stan wraz z nazwiskami, numerem bieżącej osoby i komunikatami.

## Aktualizacja GitHub Pages

1. Otwórz repozytorium GitHub, w którego głównym katalogu działa strona.
2. Wgraj 3 pliki z paczki: `index.html`, `app.js`, `style.css` (Add file → Upload files).
3. Zatwierdź Commit changes; poczekaj, aż Pages zakończy publikację.
4. Otwórz stronę administratora oraz widza (`?mode=viewer`) w osobnych urządzeniach. Odśwież obie strony (Ctrl+F5).
5. Wybierz „AD VOCEM !!!” — widz powinien zobaczyć pełnoekranowy komunikat. Kliknij „Powrót do kolejki” i zweryfikuj zachowanie postępu.

**Nie nadpisuj plików `firebase-config.js` ani `osoby.txt`**. Nie trzeba zmieniać reguł bazy ani kont administracyjnych.

Jeżeli podgląd nie działa, sprawdź czy obie strony korzystają z tego samego `QUEUE_ID` i Firebase.
