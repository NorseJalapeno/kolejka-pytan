# Kolejka Pytań — SSPW Edition

## Co nowego

Cztery tryby specjalne: 🛠️ Przerwa techniczna, 😭 Nie trwa teraz posiedzenie parlamentu, ⏳ Oczekiwanie na kolejkę pytań, 🔥 AD VOCEM !!!

Każdy administrator może włączyć tryb w panelu. Widzowie (?mode=viewer) zobaczą na całym ekranie komunikat i emoji. Administrator widzi podgląd komunikatu, przyciski trybów, możliwość edycji tekstu i przycisk „Powrót do kolejki”.

Wszystko zapisywane jest w tym samym węźle kolejki Firebase. Kolejność osób, numer aktualnej osoby oraz lista TXT pozostają bez zmian. Własne treści komunikatów są zachowywane przy ponownym wybraniu trybu.

## Aktualizacja istniejącej strony GitHub Pages (ważne!)

1. W repozytorium otwórz główny folder, w którym jest index.html.
2. Wybierz Add file → Upload files i prześlij **tylko** trzy pliki z paczki aktualizacyjnej: `index.html`, `app.js`, `style.css`.
3. GitHub nadpisze odpowiednie pliki; zaakceptuj zmiany i wybierz Commit changes.
4. Poczekaj na zakończenie wdrożenia w zakładce Actions, a następnie odśwież stronę (Ctrl+F5).
5. Przetestuj panel prowadzącego oraz publiczny link zakończony `?mode=viewer`.

**NIE NADPISUJ `firebase-config.js`.** To plik, który wcześniej samodzielnie skonfigurowałeś, aby strona łączyła się z Firebase. **NIE NADPISUJ `osoby.txt`**, jeśli masz w repozytorium aktualną listę osób.

Nie trzeba zmieniać reguł Realtime Database ani dodawać nowych administratorów. Tryby są przechowywane pod istniejącą ścieżką `queues/<QUEUE_ID>`.

## Obsługa

- Kliknięcie jednego z czterech przycisków aktywuje ekran specjalny u widzów.
- W aktywnym trybie możesz edytować komunikat w polu tekstowym i kliknąć „Zapisz tekst”.
- Kliknięcie innego trybu natychmiast przełącza ekran widza.
- „Powrót do kolejki” usuwa tylko aktywny tryb, bez przewijania listy.
- Strzałki ← i → oraz przyciski kolejki pozostają dostępne administratorowi.
- Zmiana trybu nie wymaga ponownego wczytywania pliku TXT.

## Uwaga

Podczas synchronizacji Firebase reguły muszą dopuszczać zapisy do `queues/<QUEUE_ID>` dla danego administratora. Wystarczają wcześniejsze reguły z dwoma UID. Dla publicznego podglądu obowiązują dotychczasowe uprawnienia odczytu.
