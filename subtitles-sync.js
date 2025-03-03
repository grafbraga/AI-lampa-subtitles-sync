// Самозапускающаяся функция для изоляции области видимости
(function () {
    'use strict';

    // Предотвращение множественной загрузки плагина
    if (window.lampa_subtitlesPluginInitialized) return;
    window.lampa_subtitlesPluginInitialized = true;

    // Логирование для отладки
    console.log('[Subtitles] Плагин загружается...');

    // API-ключ для OpenSubtitles
    const API_KEY = 'D7hLVYcZiZTx9st15DTlarZdI2qP4NG5';

    // Создаем объект для сетевых запросов
    let network = new Lampa.Reguest();

    // Базовый URL для OpenSubtitles API v2
    let api_url = 'https://api.opensubtitles.com/api/v2/subtitles';

    function SubtitlesPlugin() {
        const plugin = this;

        // Начальные настройки субтитров
        this.settings = {
            enabled: true,
            language: 'ru',
            autoload: true,
            fontSize: 16,
            timeOffset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textColor: '#ffffff',
            source: 'opensubtitles',
            style: 'default'
        };

        this.currentMedia = null;
        this.subtitles = [];
        this.currentSubtitleIndex = -1;
        this.subtitleElement = null;

        // Загрузка настроек
        this.loadSettings = function () {
            const saved = localStorage.getItem('subtitles_settings');
            if (saved) Object.assign(this.settings, JSON.parse(saved));
            this.settings.enabled = Lampa.Storage.get('subtitles_enabled', true);
        };

        // Сохранение настроек
        this.saveSettings = function () {
            localStorage.setItem('subtitles_settings', JSON.stringify(this.settings));
            Lampa.Storage.set('subtitles_enabled', this.settings.enabled);
        };

        // Инициализация плагина
        this.init = function () {
            this.loadSettings();
            this.createStyles();
            this.registerSettings();
            this.injectSubtitleContainer();
            this.addEventListeners();
            Lampa.Plugins.add('subtitles', this);
            console.log('[Subtitles] Плагин инициализирован');
        };

        // Создание стилей
        this.createStyles = function () {
            const style = document.createElement('style');
            style.textContent = `
                .subtitles-container {
                    position: absolute;
                    bottom: 50px;
                    left: 0;
                    right: 0;
                    text-align: center;
                    z-index: 9999;
                    pointer-events: none;
                }
                .subtitles-text {
                    display: inline-block;
                    padding: 5px 10px;
                    margin: 0 auto;
                    max-width: 80%;
                    font-size: ${this.settings.fontSize}px;
                    color: ${this.settings.textColor};
                    background-color: ${this.settings.backgroundColor};
                    border-radius: 4px;
                    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.8);
                }
            `;
            document.head.appendChild(style);
        };

        // Регистрация настроек
        this.registerSettings = function () {
            Lampa.SettingsApi.addParam({
                component: 'interface',
                param: { type: 'button' },
                field: {
                    name: Lampa.Lang.translate('subtitles'),
                    description: 'Плагин для управления субтитрами'
                },
                onChange: () => {
                    Lampa.Settings.create('subtitles', {
                        onBack: () => Lampa.Settings.create('interface')
                    });
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'subtitles',
                param: { type: 'title' },
                field: { name: Lampa.Lang.translate('subtitles') }
            });

            Lampa.SettingsApi.addParam({
                component: 'subtitles',
                param: { name: 'subtitles_enabled', type: 'trigger', default: true },
                field: { name: Lampa.Lang.translate('subtitle_enabled') },
                onRender: (item) => {
                    item.on('hover:enter', () => {
                        plugin.loadSettings();
                        if (plugin.settings.enabled && plugin.currentMedia && plugin.settings.autoload) plugin.searchSubtitles(plugin.currentMedia);
                        else plugin.hideSubtitles();
                    });
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'subtitles',
                param: { name: 'subtitle_language', type: 'select', values: { 'ru': 'Русский', 'en': 'English', 'uk': 'Українська' }, default: 'ru' },
                field: { name: Lampa.Lang.translate('subtitle_language') },
                onRender: (item) => {
                    item.on('hover:enter', () => {
                        plugin.loadSettings();
                        if (plugin.currentMedia && plugin.settings.enabled && plugin.settings.autoload) plugin.searchSubtitles(plugin.currentMedia);
                    });
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'subtitles',
                param: { name: 'subtitle_autoload', type: 'trigger', default: true },
                field: { name: Lampa.Lang.translate('subtitle_autoload') },
                onRender: (item) => {
                    item.on('hover:enter', () => {
                        plugin.loadSettings();
                        if (plugin.currentMedia && plugin.settings.enabled && plugin.settings.autoload) plugin.searchSubtitles(plugin.currentMedia);
                    });
                }
            });
        };

        // Добавление контейнера для субтитров
        this.injectSubtitleContainer = function () {
            this.subtitleElement = document.createElement('div');
            this.subtitleElement.className = 'subtitles-container';
            this.subtitleElement.innerHTML = '<div class="subtitles-text"></div>';
            this.subtitleElement.style.display = 'none';
            const playerContainer = document.querySelector('.player') || document.body;
            playerContainer.appendChild(this.subtitleElement);
        };

        // Обработка событий
        this.addEventListeners = function () {
            Lampa.Player.listener.follow('start', (data) => this.onPlayerStart(data));
            Lampa.Player.listener.follow('timeupdate', (data) => this.onTimeUpdate(data.time));
        };

        // Начало воспроизведения
        this.onPlayerStart = function (data) {
            if (!data) return;
            this.currentMedia = data;
            this.subtitles = [];
            this.currentSubtitleIndex = -1;
            if (this.settings.enabled && this.settings.autoload) this.searchSubtitles(data);
        };

        // Обновление времени
        this.onTimeUpdate = function (time) {
            if (!this.settings.enabled || this.subtitles.length === 0) return;
            const correctedTime = time + this.settings.timeOffset;
            this.displaySubtitleAtTime(correctedTime);
        };

        // Отображение субтитров
        this.displaySubtitleAtTime = function (currentTime) {
            const subtitle = this.subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
            if (subtitle) this.showSubtitle(subtitle.text);
            else this.hideSubtitles();
        };

        // Показать субтитры
        this.showSubtitle = function (text) {
            if (this.subtitleElement) {
                this.subtitleElement.querySelector('.subtitles-text').innerHTML = text;
                this.subtitleElement.style.display = 'block';
            }
        };

        // Скрыть субтитры
        this.hideSubtitles = function () {
            if (this.subtitleElement) this.subtitleElement.style.display = 'none';
        };

        // Поиск субтитров
        this.searchSubtitles = function (mediaData) {
            if (!this.settings.enabled || !this.settings.autoload) return;
            const title = mediaData.title || '';
            const year = mediaData.year || '';
            Lampa.Noty.show(Lampa.Lang.translate('subtitles') + ': ' + Lampa.Lang.translate('searching'));

            const searchUrl = `${api_url}?query=${encodeURIComponent(title)}&year=${year}&languages=${this.settings.language}`;

            network.silent(searchUrl, (data) => {
                const subtitleItem = data.data[0];
                if (!subtitleItem) {
                    Lampa.Noty.show(Lampa.Lang.translate('subtitles') + ': Субтитры не найдены');
                    return;
                }

                const fileId = subtitleItem.attributes.files[0].file_id;
                const downloadUrl = `https://api.opensubtitles.com/api/v2/download`;

                network.silent(downloadUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': API_KEY
                    },
                    body: JSON.stringify({ file_id: fileId })
                }, (downloadData) => {
                    const subtitleUrl = downloadData.link;
                    if (!subtitleUrl) {
                        Lampa.Noty.show(Lampa.Lang.translate('subtitles') + ': Ссылка на субтитры не найдена');
                        return;
                    }

                    network.silent(subtitleUrl, (subtitleData) => {
                        this.subtitles = this.parseSRT(subtitleData);
                        Lampa.Noty.show(Lampa.Lang.translate('subtitles') + ' ' + Lampa.Lang.translate('loaded'));
                    }, () => {
                        Lampa.Noty.show(Lampa.Lang.translate('subtitles') + ': ' + Lampa.Lang.translate('failed_to_load'));
                    });
                }, () => {
                    Lampa.Noty.show(Lampa.Lang.translate('subtitles') + ': ' + Lampa.Lang.translate('failed_to_load'));
                });
            }, {
                headers: {
                    'Api-Key': API_KEY
                }
            }, () => {
                Lampa.Noty.show(Lampa.Lang.translate('subtitles') + ': ' + Lampa.Lang.translate('failed_to_load'));
            });
        };

        // Парсинг SRT формата
        this.parseSRT = function (data) {
            const subtitles = [];
            const lines = data.split('\n');
            let index = 0;

            while (index < lines.length) {
                const line = lines[index].trim();
                if (!line) {
                    index++;
                    continue;
                }

                const timeLine = lines[index + 1]?.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                if (timeLine) {
                    const start = this.timeToSeconds(timeLine[1]);
                    const end = this.timeToSeconds(timeLine[2]);
                    let text = '';
                    index += 2;

                    while (index < lines.length && lines[index].trim()) {
                        text += lines[index].trim() + '<br>';
                        index++;
                    }

                    subtitles.push({ start, end, text });
                }
                index++;
            }
            return subtitles;
        };

        // Конвертация времени в секунды
        this.timeToSeconds = function (timeStr) {
            const [hours, minutes, seconds] = timeStr.replace(',', '.').split(':');
            return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
        };

        // Инициализация с задержкой
        setTimeout(() => this.init(), 0);
    }

    // Создание экземпляра плагина
    new SubtitlesPlugin();
})();
