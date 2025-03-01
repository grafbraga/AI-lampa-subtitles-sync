Subtitles Sync Plugin for Lampa TV
Плагин для Lampa TV, который автоматически генерирует субтитры с помощью Web Speech API.

Установка в Lampa TV:
 - **Настройки → Плагины → Добавить плагин**.
 - Вставьте:
   ```
   https://grafbraga.github.io/AI-subtitles-sync-lampatv/ai-subtitles-sync.js
   ```
 - Нажмите **Установить**.
Через прокси (если CORS сохраняется):
Запросите доступ на cors-anywhere.herokuapp.com.
Вставьте: https://cors-anywhere.herokuapp.com/https://grafbraga.github.io/AI-subtitles-sync-lampatv/ai-subtitles-sync.js.
Использование
В меню плеера выберите Subtitles Sync для начала генерации субтитров.
Субтитры создаются автоматически на основе аудио через Web Speech API.
Ограничения
Требуется браузер с поддержкой Web Speech API (Chrome, Edge).
Работает через микрофон, а не аудиопоток видео (пока).
Лицензия
MIT License.

Автор
grafbraga, март 2025.
