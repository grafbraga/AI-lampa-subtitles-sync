// Создаем самозапускающуюся функцию (IIFE) для изоляции области видимости плагина
(function () {
    // Включаем строгий режим для предотвращения распространенных ошибок
    'use strict';

    // Проверяем, был ли плагин уже инициализирован
    if (window.subtitlesPluginInitialized) return;
    // Устанавливаем флаг, что плагин инициализирован, чтобы избежать повторной загрузки
    console.log('[Subtitles] Плагин загружается...');
    if (window.subtitlesPluginInitialized) {
   	console.log('[Subtitles] Плагин уже инициализирован, пропускаем');
    return;
    }
    window.subtitlesPluginInitialized = true;
    console.log('[Subtitles] Плагин успешно инициализирован');
    // Основной код плагина

    // Убеждаемся, что объект настроек Lampa существует, или создаем пустой объект
    window.lampa_settings = window.lampa_settings || {};
    // Добавляем метаданные плагина субтитров в глобальные настройки
    window.lampa_settings.subtitles = {
        version: '1.2.1', // Версия плагина
        name: 'Subtitles', // Название плагина
        description: 'Плагин для автоматической загрузки субтитров' // Описание плагина
    };

    // Регистрируем шаблон для отображения пункта настроек субтитров в меню
    Lampa.Template.add('settings_subtitles', `
        <div class="settings-folder selector" data-component="subtitles">
            <div class="settings-folder__icon">
                <!-- SVG-иконка для пункта меню субтитров -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5Z" stroke="currentColor" stroke-width="2"/>
                    <line x1="5" y1="8" x2="19" y2="8" stroke="currentColor" stroke-width="2"/>
                    <line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/>
                    <line x1="5" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2"/>
                </svg>
            </div>
            <div class="settings-folder__name">Subtitles</div>
        </div>
    `);

    // Задерживаем выполнение основного кода плагина на 500 мс, чтобы Lampa успела загрузиться
    setTimeout(function() {
    // Основной код плагина
    }, 500);
        // Определяем конструктор плагина субтитров
        function SubtitlesPlugin() {
            const plugin = this; // Сохраняем ссылку на текущий объект плагина

            // Задаем начальные настройки субтитров
            this.settings = {
                enabled: false, // Субтитры отключены по умолчанию
                language: 'en', // Язык субтитров по умолчанию - русский
                autoload: true, // Автозагрузка субтитров включена
                fontSize: 16, // Размер шрифта субтитров по умолчанию
                timeOffset: 1, // Смещение времени субтитров (в секундах)
                backgroundColor: 'rgba(0, 0, 0, 0.5)', // Цвет фона субтитров
                textColor: '#ffffff' // Цвет текста субтитров
            };

            // Переменные для управления состоянием субтитров
            this.currentMedia = null; // Текущий воспроизводимый медиафайл
            this.subtitles = []; // Массив загруженных субтитров
            this.currentSubtitleIndex = -1; // Индекс текущего отображаемого субтитра (-1 - нет активного)
            this.subtitleElement = null; // DOM-элемент для отображения субтитров

            // Функция загрузки сохраненных настроек из localStorage
            this.loadSettings = function() {
                const saved = localStorage.getItem('subtitles_settings'); // Получаем настройки из localStorage
                if (saved) Object.assign(this.settings, JSON.parse(saved)); // Если настройки есть, обновляем текущие
            };

            // Функция сохранения настроек в localStorage
            this.saveSettings = function() {
                localStorage.setItem('subtitles_settings', JSON.stringify(this.settings)); // Сохраняем настройки в JSON-формате
            };

            // Основная функция инициализации плагина
            this.init = function () {
                try {
                    this.loadSettings(); // Загружаем сохраненные настройки
                    this.createStyles(); // Создаем стили для субтитров
                    this.registerSettings(); // Регистрируем настройки в меню Lampa
                    this.injectSubtitleContainer(); // Добавляем контейнер субтитров в плеер
                    this.addEventListeners(); // Добавляем обработчики событий
                    Lampa.Plugins.add('subtitles', this); // Регистрируем плагин в системе Lampa
                    console.log('[Subtitles] Plugin initialized'); // Логируем успешную инициализацию
                } catch (error) {
                    console.error('[Subtitles] Error during initialization:', error); // Логируем ошибку, если она возникла
                }
            };

            // Функция создания стилей для субтитров
            this.createStyles = function () {
                const style = document.createElement('style'); // Создаем элемент <style>
                style.textContent = `
                    .subtitles-container {
                        position: absolute; /* Абсолютное позиционирование контейнера субтитров */
                        bottom: 50px; /* Отступ от низа экрана */
                        left: 0; /* Выравнивание по левому краю */
                        right: 0; /* Выравнивание по правому краю */
                        text-align: center; /* Центрирование текста */
                        z-index: 9999; /* Высокий z-index для отображения поверх других элементов */
                        pointer-events: none; /* Отключаем взаимодействие с контейнером мышью */
                    }
                    .subtitles-text {
                        display: inline-block; /* Отображение текста как блочного элемента с сохранением ширины */
                        padding: 5px 10px; /* Внутренние отступы текста */
                        margin: 0 auto; /* Центрирование блока текста */
                        max-width: 80%; /* Максимальная ширина текста */
                        font-size: ${this.settings.fontSize}px; /* Размер шрифта из настроек */
                        color: ${this.settings.textColor}; /* Цвет текста из настроек */
                        background-color: ${this.settings.backgroundColor}; /* Цвет фона из настроек */
                        border-radius: 4px; /* Скругленные углы */
                        text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.8); /* Тень текста для улучшения читаемости */
                    }
                    .subtitles-settings-container {
                        display: flex; /* Используем flexbox для контейнера настроек */
                        flex-direction: column; /* Вертикальное расположение элементов */
                        gap: 10px; /* Отступ между элементами настроек */
                    }
                `;
                document.head.appendChild(style); // Добавляем стили в <head> документа
            };

            // Функция регистрации настроек в меню Lampa
            this.registerSettings = function () {
                console.log('[Subtitles] Регистрация настроек'); // Логируем начало регистрации
                // Подписываемся на событие открытия настроек
                Lampa.Settings.listener.follow('open', function (e) {
                    console.log('[Subtitles] Открыты настройки:', e.name); // Логируем, какие настройки открыты
                    if (e.name === 'main') { // Если открыты основные настройки
                        setTimeout(function() { // Небольшая задержка для корректной загрузки DOM
                            const subtitlesFolder = e.body.find('[data-component="subtitles"]'); // Ищем элемент субтитров
                            if (!subtitlesFolder.length) { // Если элемент не найден
                                // Добавляем шаблон субтитров после элемента "more"
                                e.body.find('[data-component="more"]').after(Lampa.Template.get('settings_subtitles'));
                            }
                        }, 10); // Задержка в 10 мс
                    }

                    if (e.name === 'subtitles') { // Если открыты настройки субтитров
                        console.log('[Subtitles] Создание настроек субтитров'); // Логируем создание настроек
                        plugin.createSubtitlesSettings(e); // Создаем страницу настроек субтитров
                    }
                });

                // Подписываемся на событие готовности плеера
                Lampa.Player.listener.follow('ready', () => this.addPlayerControls()); // Добавляем кнопки управления в плеер
            };

            // Функция создания страницы настроек субтитров
            this.createSub...

Что-то пошло не так, повторите попытку.
