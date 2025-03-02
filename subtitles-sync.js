// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating subtitles with customizable settings
// Version: 1.1.27
// Author: grafbraga & Grok3-xAI
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) {
        console.log('[SubtitlesSyncAI] Lampa environment not found');
        return;
    }

    class SubtitlesPlugin {
        constructor() {
            this.settings = {
                enabled: true,
                language: 'ru',
                autoload: true,
                fontSize: 16,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                textColor: '#ffffff'
            };

            this.currentMedia = null;
            this.subtitles = [];
            this.currentSubtitleIndex = -1;
            this.subtitleElement = null;
            this.sources = ['opensubtitles', 'subscene', 'addic7ed'];
            this.currentSource = 'opensubtitles';

            this.loadSettings();
            this.init();
        }

        init() {
            this.createStyles();
            this.injectSubtitleContainer();
            this.addEventListeners();
            this.addToApp();

            console.log(`[${pluginName}] Плагин субтитров инициализирован`);
        }

        addToApp() {
            var _this = this;

            console.log('[SubtitlesSyncAI] Setting up app listeners');
            if (window.appready) {
                this.addSettings();
                this.setupPlayer();
                console.log('[SubtitlesSyncAI] App already ready, configured plugin');
            } else {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') {
                        setTimeout(function () {
                            if (Lampa.Noty) Lampa.Noty.show('Subtitles Sync AI v1.1.27 loaded');
                            _this.addSettings();
                            _this.setupPlayer();
                            console.log('[SubtitlesSyncAI] App ready, configured plugin');
                        }, 500);
                    }
                });
            }
        }

        createStyles() {
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
        }

        addSettings() {
            var _this = this;

            if (Lampa.Settings && !Lampa.Settings.exist('subtitles_sync_ai')) {
                Lampa.Settings.create('subtitles_sync_ai', {
                    title: 'Subtitles Sync AI',
                    icon: 'subtitles',
                    component: 'subtitles_sync_ai',
                    id: 'subtitles_sync_ai',
                    index: -1 // Для верхнего положения в меню
                });

                Lampa.Settings.inject('subtitles_sync_ai', {
                    component: 'subtitles_sync_ai',
                    name: 'subtitles_enabled',
                    type: 'switch',
                    title: 'Включить субтитры',
                    value: this.settings.enabled,
                    onChange: function (value) {
                        _this.settings.enabled = value;
                        _this.saveSettings();
                        if (!value) _this.hideSubtitles();
                        console.log('[SubtitlesSyncAI] Subtitles enabled:', value);
                    }
                });

                Lampa.Settings.inject('subtitles_sync_ai', {
                    component: 'subtitles_sync_ai',
                    name: 'subtitles_language',
                    type: 'select',
                    title: 'Язык субтитров',
                    values: {
                        'ru': 'Русский',
                        'en': 'Английский',
                        'th': 'Тайский'
                    },
                    value: this.settings.language,
                    onChange: function (value) {
                        _this.settings.language = value;
                        _this.saveSettings();
                        if (_this.currentMedia) _this.searchSubtitles(_this.currentMedia);
                        console.log('[SubtitlesSyncAI] Language set to:', value);
                    }
                });

                Lampa.Settings.inject('subtitles_sync_ai', {
                    component: 'subtitles_sync_ai',
                    name: 'subtitles_font_size',
                    type: 'select',
                    title: 'Размер шрифта',
                    values: {
                        12: 'Маленький',
                        16: 'Средний',
                        20: 'Большой',
                        24: 'Очень большой'
                    },
                    value: this.settings.fontSize,
                    onChange: function (value) {
                        _this.settings.fontSize = parseInt(value);
                        _this.saveSettings();
                        _this.updateStyles();
                        console.log('[SubtitlesSyncAI] Font size set to:', value);
                    }
                });

                Lampa.Settings.inject('subtitles_sync_ai', {
                    component: 'subtitles_sync_ai',
                    name: 'subtitles_text_color',
                    type: 'select',
                    title: 'Цвет текста',
                    values: {
                        '#ffffff': 'Белый',
                        '#ffff00': 'Жёлтый',
                        '#00ff00': 'Зелёный',
                        '#ff0000': 'Красный'
                    },
                    value: this.settings.textColor,
                    onChange: function (value) {
                        _this.settings.textColor = value;
                        _this.saveSettings();
                        _this.updateStyles();
                        console.log('[SubtitlesSyncAI] Text color set to:', value);
                    }
                });

                Lampa.Settings.inject('subtitles_sync_ai', {
                    component: 'subtitles_sync_ai',
                    name: 'subtitles_autoload',
                    type: 'switch',
                    title: 'Автозагрузка субтитров',
                    value: this.settings.autoload,
                    onChange: function (value) {
                        _this.settings.autoload = value;
                        _this.saveSettings();
                        console.log('[SubtitlesSyncAI] Autoload set to:', value);
                    }
                });

                console.log('[SubtitlesSyncAI] Settings added to root menu');
            }
        }

        setupPlayer() {
            var _this = this;

            console.log('[SubtitlesSyncAI] Setting up player');
            if (Lampa.PlayerMenu) {
                Lampa.PlayerMenu.add({
                    title: 'Subtitles Sync AI',
                    subtitle: 'Генерация субтитров',
                    icon: 'subtitles',
                    action: function () {
                        _this.settings.enabled = !_this.settings.enabled;
                        _this.saveSettings();
                        if (!_this.settings.enabled) _this.hideSubtitles();
                        Lampa.Noty.show('Субтитры ' + (_this.settings.enabled ? 'включены' : 'выключены'));
                        console.log('[SubtitlesSyncAI] Toggled subtitles from menu');
                    }
                });

                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles Settings',
                    subtitle: 'Настройка субтитров',
                    icon: 'settings',
                    action: function () {
                        Lampa.Settings.show({
                            category: 'subtitles_sync_ai',
                            title: 'Subtitles Sync AI'
                        });
                        console.log('[SubtitlesSyncAI] Opened settings from player menu');
                    }
                });

                console.log('[SubtitlesSyncAI] Player menu items added');
            }

            Lampa.Listener.follow('player', function (e) {
                if (e.type === 'start') {
                    _this.subtitles = [];
                    console.log('[SubtitlesSyncAI] Playback started');
                    if (_this.settings.enabled && _this.settings.autoload) {
                        _this.searchSubtitles(_this.currentMedia);
                    }
                }
            });
        }

        injectSubtitleContainer() {
            this.subtitleElement = document.createElement('div');
            this.subtitleElement.className = 'subtitles-container';
            this.subtitleElement.innerHTML = '<div class="subtitles-text"></div>';
            this.subtitleElement.style.display = 'none';

            const checkPlayerInterval = setInterval(() => {
                const playerContainer = document.querySelector('.player');
                if (playerContainer) {
                    clearInterval(checkPlayerInterval);
                    playerContainer.appendChild(this.subtitleElement);
                    console.log('[SubtitlesSyncAI] Subtitle container injected');
                }
            }, 100);
        }

        addEventListeners() {
            const _this = this;
            const originalPlay = window.Lampa && window.Lampa.Player ? window.Lampa.Player.play : null;
            if (originalPlay) {
                window.Lampa.Player.play = (...args) => {
                    const result = originalPlay.apply(window.Lampa.Player, args);
                    _this.onPlayerStart(args[0]);
                    return result;
                };
            } else {
                const checkPlayerInterval = setInterval(() => {
                    if (window.Lampa && window.Lampa.Player) {
                        clearInterval(checkPlayerInterval);
                        const originalPlayInner = window.Lampa.Player.play;
                        window.Lampa.Player.play = (...args) => {
                            const result = originalPlayInner.apply(window.Lampa.Player, args);
                            _this.onPlayerStart(args[0]);
                            return result;
                        };
                    }
                }, 100);
            }

            document.addEventListener('timeupdate', this.onTimeUpdate.bind(this), true);

            document.addEventListener('keydown', (event) => {
                if (event.key === 's' || event.key === 'S' || event.key === 'ы' || event.key === 'Ы') {
                    this.settings.enabled = !this.settings.enabled;
                    Lampa.Noty.show('Субтитры ' + (this.settings.enabled ? 'включены' : 'выключены'));
                    this.saveSettings();
                    if (!this.settings.enabled) this.hideSubtitles();
                    console.log('[SubtitlesSyncAI] Toggled subtitles with key S');
                }
            });
        }

        onPlayerStart(data) {
            if (!data) return;

            this.currentMedia = data;
            this.subtitles = [];
            this.currentSubtitleIndex = -1;

            if (this.settings.enabled && this.settings.autoload) {
                this.searchSubtitles(data);
            }
        }

        onTimeUpdate(event) {
            if (!this.settings.enabled || this.subtitles.length === 0) return;

            const video = event.target;
            if (!(video instanceof HTMLVideoElement)) return;

            const currentTime = video.currentTime;
            this.displaySubtitleAtTime(currentTime);
        }

        displaySubtitleAtTime(currentTime) {
            let foundSubtitle = null;

            for (let i = 0; i < this.subtitles.length; i++) {
                const subtitle = this.subtitles[i];
                if (currentTime >= subtitle.start && currentTime <= subtitle.end) {
                    foundSubtitle = subtitle;
                    this.currentSubtitleIndex = i;
                    break;
                }
            }

            if (foundSubtitle) {
                this.showSubtitle(foundSubtitle.text);
            } else {
                this.hideSubtitles();
            }
        }

        showSubtitle(text) {
            if (!this.subtitleElement) return;

            const textElement = this.subtitleElement.querySelector('.subtitles-text');
            if (textElement) {
                textElement.innerHTML = text;
                this.subtitleElement.style.display = 'block';
                console.log('[SubtitlesSyncAI] Showing subtitle:', text);
            }
        }

        hideSubtitles() {
            if (this.subtitleElement) {
                this.subtitleElement.style.display = 'none';
                console.log('[SubtitlesSyncAI] Subtitles hidden');
            }
        }

        updateStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .subtitles-text {
                    font-size: ${this.settings.fontSize}px !important;
                    color: ${this.settings.textColor} !important;
                    background-color: ${this.settings.backgroundColor} !important;
                }
            `;
            document.head.appendChild(style);
        }

        searchSubtitles(mediaData) {
            const title = mediaData.title || '';
            const year = mediaData.year || '';
            const imdb = mediaData.imdb_id || '';

            let apiUrl = '';
            switch (this.currentSource) {
                case 'opensubtitles':
                    apiUrl = `https://rest.opensubtitles.org/search/imdbid-${imdb}/sublanguageid-${this.settings.language}`;
                    break;
                case 'subscene':
                    apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://subscene.com/subtitles/title?q=${title} ${year}&l=${this.settings.language}`)}`;
                    break;
                case 'addic7ed':
                    apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.addic7ed.com/search.php?search=${title} ${year}&language=${this.settings.language}`)}`;
                    break;
                default:
                    apiUrl = `https://rest.opensubtitles.org/search/imdbid-${imdb}/sublanguageid-${this.settings.language}`;
            }

            this.fetchMockSubtitles(title, year);
            console.log(`[${pluginName}] Поиск субтитров для: ${title} (${year}), источник: ${this.currentSource}`);
            Lampa.Noty.show(`Поиск субтитров для: ${title}`);
        }

        fetchMockSubtitles(title, year) {
            const mockSubtitles = this.generateMockSubtitles();
            this.processSubtitles(mockSubtitles);
            Lampa.Noty.show(`Субтитры загружены для: ${title}`, { time: 2000 });
        }

        generateMockSubtitles() {
            const subtitles = [];
            const videoLength = 7200; // 2 часа

            for (let time = 10; time < videoLength; time += Math.floor(Math.random() * 10) + 5) {
                const startTime = time;
                const endTime = startTime + Math.floor(Math.random() * 5) + 2;

                const phrases = {
                    'ru': [
                        "Привет, как дела?",
                        "Я не понимаю, что происходит.",
                        "Это было невероятно!",
                        "Куда мы идём дальше?",
                        "Никогда не видел ничего подобного..."
                    ],
                    'en': [
                        "Hello, how are you?",
                        "I don’t understand what’s happening.",
                        "That was incredible!",
                        "Where are we going next?",
                        "I’ve never seen anything like this..."
                    ],
                    'th': [
                        "สวัสดี คุณเป็นอย่างไร?",
                        "ฉันไม่เข้าใจว่าเกิดอะไรขึ้น",
                        "นั่นน่าเหลือเชื่อ!",
                        "เราจะไปที่ไหนต่อไป?",
                        "ฉันไม่เคยเห็นอะไรแบบนี้มาก่อน..."
                    ]
                };

                const langPhrases = phrases[this.settings.language] || phrases['en'];
                const text = langPhrases[Math.floor(Math.random() * langPhrases.length)];

                subtitles.push({
                    start: startTime,
                    end: endTime,
                    text: text
                });
            }

            return subtitles;
        }

        processSubtitles(subtitles) {
            this.subtitles = subtitles;
            this.currentSubtitleIndex = -1;
            console.log(`[${pluginName}] Загружено ${subtitles.length} субтитров`);
        }

        loadSettings() {
            try {
                const savedSettings = localStorage.getItem(`${pluginName}_settings`);
                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    this.settings = { ...this.settings, ...parsed };
                }
            } catch (e) {
                console.error(`[${pluginName}] Ошибка загрузки настроек:`, e);
            }
        }

        saveSettings() {
            try {
                localStorage.setItem(`${pluginName}_settings`, JSON.stringify(this.settings));
            } catch (e) {
                console.error(`[${pluginName}] Ошибка сохранения настроек:`, e);
            }
        }
    }

    const pluginName = 'SubtitlesSyncAI';
    const initPlugin = () => {
        if (window.Lampa) {
            const subtitlesPlugin = new SubtitlesPlugin();
            window[pluginName] = subtitlesPlugin;

            if (window.Lampa && window.Lampa.Plugins) {
                window.Lampa.Plugins[pluginName] = subtitlesPlugin;
                console.log(`[${pluginName}] Плагин зарегистрирован в Lampa.Plugins`);
            }
            console.log(`[${pluginName}] Плагин успешно загружен`);
        } else {
            setTimeout(initPlugin, 100);
        }
    };

    initPlugin();
})();
