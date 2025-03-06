// Создаем самозапускающуюся функцию (IIFE) для изоляции области видимости плагина
(function () {
    // Включаем строгий режим для предотвращения распространенных ошибок
    'use strict';

    // Проверяем, был ли плагин уже инициализирован
    if (window.subtitlesPluginInitialized) return;
    // Устанавливаем флаг, что плагин инициализирован, чтобы избежать повторной загрузки
    window.subtitlesPluginInitialized = true;

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
        // Определяем конструктор плагина субтитров
        function SubtitlesPlugin() {
            const plugin = this; // Сохраняем ссылку на текущий объект плагина

            // Задаем начальные настройки субтитров
            this.settings = {
                enabled: false, // Субтитры отключены по умолчанию
                language: 'ru', // Язык субтитров по умолчанию - русский
                autoload: true, // Автозагрузка субтитров включена
                fontSize: 16, // Размер шрифта субтитров по умолчанию
                timeOffset: 0, // Смещение времени субтитров (в секундах)
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
            this.createSubtitlesSettings = function (e) {
                // Очищаем содержимое страницы настроек
                e.body.empty();

                // Создаем контейнер для элементов настроек
                const settingsContainer = $('<div class="subtitles-settings-container"></div>');
                e.body.append(settingsContainer);

                // Добавляем переключатель для включения/выключения субтитров
                this.addSetting(settingsContainer, 'Включить субтитры', 'toggle', 'enabled');

                // Добавляем настройки только если субтитры включены
                if (this.settings.enabled) {
                    // Выбор языка субтитров
                    this.addSetting(settingsContainer, 'Язык субтитров', 'select', 'language', {
                        ru: 'Русский',
                        en: 'English',
                        fr: 'Français',
                        de: 'Deutsch',
                        es: 'Español'
                    });

                    // Автоматическая загрузка субтитров
                    this.addSetting(settingsContainer, 'Автозагрузка субтитров', 'toggle', 'autoload');

                    // Размер шрифта субтитров
                    this.addSetting(settingsContainer, 'Размер шрифта', 'range', 'fontSize', {
                        min: 12,
                        max: 32,
                        step: 2
                    });

                    // Смещение времени субтитров
                    this.addSetting(settingsContainer, 'Смещение времени (секунды)', 'range', 'timeOffset', {
                        min: -10,
                        max: 10,
                        step: 0.5
                    });

                    // Цвет фона субтитров
                    this.addSetting(settingsContainer, 'Цвет фона', 'color', 'backgroundColor');

                    // Цвет текста субтитров
                    this.addSetting(settingsContainer, 'Цвет текста', 'color', 'textColor');
                }
            };

            // Вспомогательная функция для добавления различных типов настроек
            this.addSetting = function (container, label, type, key, options) {
                const settingRow = $('<div class="settings-param selector"></div>');
                settingRow.append(`<div class="settings-param__name">${label}</div>`);

                let control;
                
                // В зависимости от типа настройки создаем соответствующий элемент управления
                switch (type) {
                    case 'toggle':
                        control = $('<div class="settings-param__value"></div>')
                            .append(
                                $('<div class="settings-param__toggle"></div>')
                                    .toggleClass('active', this.settings[key])
                                    .on('click', () => {
                                        this.settings[key] = !this.settings[key];
                                        $(this).toggleClass('active');
                                        this.saveSettings();
                                        // Перезагрузка настроек при изменении статуса (enabled/disabled)
                                        if (key === 'enabled') {
                                            Lampa.Settings.update();
                                        }
                                    })
                            );
                        break;

                    case 'select':
                        control = $('<div class="settings-param__value"></div>')
                            .text(options[this.settings[key]])
                            .on('click', () => {
                                // Создаем массив вариантов для выбора
                                const items = Object.entries(options).map(([value, label]) => ({
                                    title: label,
                                    value: value,
                                    selected: this.settings[key] === value
                                }));

                                // Запускаем селектор для выбора
                                Lampa.Select.show({
                                    title: label,
                                    items: items,
                                    onSelect: (item) => {
                                        this.settings[key] = item.value;
                                        control.text(item.title);
                                        this.saveSettings();
                                    }
                                });
                            });
                        break;

                    case 'range':
                        const value = this.settings[key];
                        control = $('<div class="settings-param__value"></div>')
                            .text(value)
                            .on('click', () => {
                                // Запускаем слайдер для выбора значения в диапазоне
                                Lampa.UISlider.show({
                                    title: label,
                                    min: options.min,
                                    max: options.max,
                                    step: options.step || 1,
                                    value: value,
                                    onSelected: (newValue) => {
                                        this.settings[key] = newValue;
                                        control.text(newValue);
                                        this.saveSettings();
                                        // Обновляем стили, если изменился размер шрифта
                                        if (key === 'fontSize') {
                                            this.createStyles();
                                        }
                                    }
                                });
                            });
                        break;

                    case 'color':
                        control = $('<div class="settings-param__value"></div>')
                            .append(
                                $('<div class="settings-param__color-box"></div>')
                                    .css('background-color', this.settings[key])
                            )
                            .on('click', () => {
                                // Здесь должен быть код для выбора цвета
                                // Но Lampa может не иметь встроенного селектора цветов,
                                // поэтому это упрощенная реализация
                                const colors = [
                                    'rgba(0, 0, 0, 0.5)',
                                    'rgba(255, 255, 255, 0.5)',
                                    'rgba(255, 0, 0, 0.5)',
                                    'rgba(0, 255, 0, 0.5)',
                                    'rgba(0, 0, 255, 0.5)',
                                    '#000000',
                                    '#ffffff',
                                    '#ff0000',
                                    '#00ff00',
                                    '#0000ff'
                                ];

                                const items = colors.map(color => ({
                                    title: ' ',
                                    value: color,
                                    subtitle: color,
                                    selected: this.settings[key] === color,
                                    template: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 4px;"></div>`
                                }));

                                Lampa.Select.show({
                                    title: label,
                                    items: items,
                                    onSelect: (item) => {
                                        this.settings[key] = item.value;
                                        control.find('.settings-param__color-box').css('background-color', item.value);
                                        this.saveSettings();
                                        this.createStyles();
                                    }
                                });
                            });
                        break;
                }

                settingRow.append(control);
                container.append(settingRow);
            };

            // Функция добавления контейнера субтитров в плеер
            this.injectSubtitleContainer = function () {
                // Убеждаемся, что контейнер субтитров еще не существует
                if (!$('.subtitles-container').length) {
                    // Создаем контейнер для субтитров
                    const container = $('<div class="subtitles-container"></div>');
                    // Создаем элемент для текста субтитров
                    this.subtitleElement = $('<div class="subtitles-text"></div>');
                    container.append(this.subtitleElement);
                    // Добавляем контейнер субтитров в плеер
                    $('.player').append(container);
                }
            };

            // Функция добавления кнопок управления субтитрами в плеер
            this.addPlayerControls = function () {
                // Проверяем, включены ли субтитры в настройках
                if (!this.settings.enabled) return;

                // Создаем кнопку субтитров для управления
                Lampa.Player.addButton({
                    name: 'subtitles',
                    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5Z" stroke="currentColor" stroke-width="2"/>
                              <line x1="5" y1="8" x2="19" y2="8" stroke="currentColor" stroke-width="2"/>
                              <line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/>
                              <line x1="5" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2"/>
                          </svg>`,
                    position: 'left',
                    onClick: () => {
                        // Здесь можно реализовать меню выбора субтитров
                        this.showSubtitleMenu();
                    }
                });
            };

            // Функция отображения меню субтитров
            this.showSubtitleMenu = function () {
                // Массив доступных субтитров
                const availableSubtitles = [
                    { title: 'Выключить', value: 'off' },
                    { title: 'Русские', value: 'ru', selected: this.settings.language === 'ru' },
                    { title: 'Английские', value: 'en', selected: this.settings.language === 'en' },
                    // Другие доступные субтитры...
                ];

                // Отображаем меню выбора субтитров
                Lampa.Select.show({
                    title: 'Субтитры',
                    items: availableSubtitles,
                    onSelect: (item) => {
                        if (item.value === 'off') {
                            // Выключение субтитров
                            this.hideSubtitles();
                        } else {
                            // Установка выбранного языка и загрузка субтитров
                            this.settings.language = item.value;
                            this.saveSettings();
                            this.loadSubtitles();
                        }
                    }
                });
            };

            // Функция добавления обработчиков событий
            this.addEventListeners = function () {
                // Подписываемся на событие начала воспроизведения
                Lampa.Player.listener.follow('start', (data) => {
                    this.currentMedia = data;
                    this.subtitles = [];
                    this.currentSubtitleIndex = -1;

                    // Загружаем субтитры, если они включены и установлена автозагрузка
                    if (this.settings.enabled && this.settings.autoload) {
                        this.loadSubtitles();
                    }
                });

                // Подписываемся на событие обновления времени воспроизведения
                Lampa.Player.listener.follow('timeupdate', (data) => {
                    if (this.settings.enabled && this.subtitles.length > 0) {
                        this.updateSubtitles(data.current);
                    }
                });

                // Подписываемся на событие остановки воспроизведения
                Lampa.Player.listener.follow('stop', () => {
                    this.currentMedia = null;
                    this.subtitles = [];
                    this.currentSubtitleIndex = -1;
                    this.hideSubtitles();
                });
            };

            // Функция загрузки субтитров
            this.loadSubtitles = function () {
                // Проверяем наличие текущего медиа
                if (!this.currentMedia) return;

                // Здесь должен быть код для фактической загрузки субтитров с сервера
                // Это пример, который имитирует загрузку субтитров
                console.log('[Subtitles] Загрузка субтитров для', this.currentMedia.title);
                
                setTimeout(() => {
                    // Пример субтитров для тестирования
                    this.subtitles = [
                        { start: 5, end: 10, text: 'Это пример субтитров' },
                        { start: 15, end: 20, text: 'Они появляются в определенное время' },
                        { start: 25, end: 30, text: 'И исчезают по истечении времени' }
                    ];
                    console.log('[Subtitles] Загружено субтитров:', this.subtitles.length);
                }, 1000);
            };

            // Функция обновления отображаемых субтитров в соответствии с текущим временем
            this.updateSubtitles = function (currentTime) {
                // Применяем смещение времени из настроек
                currentTime += this.settings.timeOffset;

                // Ищем субтитр, который должен отображаться в текущее время
                const subtitleIndex = this.subtitles.findIndex(
                    sub => currentTime >= sub.start && currentTime <= sub.end
                );

                // Если найден субтитр и он отличается от текущего
                if (subtitleIndex !== -1 && subtitleIndex !== this.currentSubtitleIndex) {
                    this.showSubtitle(this.subtitles[subtitleIndex].text);
                    this.currentSubtitleIndex = subtitleIndex;
                }
                // Если субтитр не найден, но был показан ранее - скрываем его
                else if (subtitleIndex === -1 && this.currentSubtitleIndex !== -1) {
                    this.hideSubtitles();
                    this.currentSubtitleIndex = -1;
                }
            };

            // Функция отображения субтитра
            this.showSubtitle = function (text) {
                if (this.subtitleElement) {
                    this.subtitleElement.text(text).show();
                }
            };

            // Функция скрытия субтитров
            this.hideSubtitles = function () {
                if (this.subtitleElement) {
                    this.subtitleElement.empty().hide();
                }
            };

            // Инициализация плагина
            this.init();
        }

        // Создаем экземпляр плагина субтитров
        new SubtitlesPlugin();

    }, 500); // Задержка в 500 мс перед запуском плагина
})();
