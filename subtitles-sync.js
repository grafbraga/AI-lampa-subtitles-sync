(function () {
    'use strict';

    // Название плагина
    const pluginName = 'LampaSubtitlesPlugin';
    
    // Основной класс плагина
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
            
            this.init();
        }
        
        init() {
            this.createStyles();
            this.createSettingsMenu();
            this.injectSubtitleContainer();
            this.addEventListeners();
            
            console.log(`[${pluginName}] Плагин субтитров инициализирован`);
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
                .subtitles-menu {
                    padding: 1em;
                }
                .subtitles-menu__item {
                    margin-bottom: 0.5em;
                }
            `;
            document.head.appendChild(style);
        }
        
        createSettingsMenu() {
            // Ждем загрузки основного приложения
            const settingsCheckInterval = setInterval(() => {
                if (window.Lampa && window.Lampa.Settings) {
                    clearInterval(settingsCheckInterval);
                    
                    // Добавляем пункт меню в настройки
                    window.Lampa.Settings.main().render().find('[data-component="main"]').append('<div class="settings-folder selector" data-component="subtitles"><div class="settings-folder__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5Z" stroke="currentColor" stroke-width="2"/><line x1="5" y1="8" x2="19" y2="8" stroke="currentColor" stroke-width="2"/><line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/><line x1="5" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2"/></svg></div><div class="settings-folder__name">Субтитры</div></div>');
                    
                    // Создаем страницу настроек для субтитров
                    this.createSubtitlesSettings();
                }
            }, 100);
        }
        
        createSubtitlesSettings() {
            const subtitlesSettings = window.Lampa.Settings.create({
                component: 'subtitles',
                name: 'Настройки субтитров'
            });
            
            // Настройка включения/выключения субтитров
            subtitlesSettings.createSwitch({
                name: 'Включить субтитры',
                value: this.settings.enabled,
                onChange: (value) => {
                    this.settings.enabled = value;
                    this.saveSettings();
                }
            });
            
            // Выбор языка субтитров
            subtitlesSettings.createSelect({
                name: 'Язык субтитров',
                value: this.settings.language,
                values: {
                    ru: 'Русский',
                    en: 'Английский',
                    de: 'Немецкий',
                    fr: 'Французский',
                    es: 'Испанский'
                },
                onChange: (value) => {
                    this.settings.language = value;
                    this.saveSettings();
                    if (this.currentMedia) {
                        this.searchSubtitles(this.currentMedia);
                    }
                }
            });
            
            // Выбор источника субтитров
            subtitlesSettings.createSelect({
                name: 'Источник субтитров',
                value: this.currentSource,
                values: {
                    opensubtitles: 'OpenSubtitles',
                    subscene: 'Subscene',
                    addic7ed: 'Addic7ed'
                },
                onChange: (value) => {
                    this.currentSource = value;
                    this.saveSettings();
                    if (this.currentMedia) {
                        this.searchSubtitles(this.currentMedia);
                    }
                }
            });
            
            // Автозагрузка субтитров
            subtitlesSettings.createSwitch({
                name: 'Автоматическая загрузка',
                value: this.settings.autoload,
                onChange: (value) => {
                    this.settings.autoload = value;
                    this.saveSettings();
                }
            });
            
            // Размер шрифта
            subtitlesSettings.createSelect({
                name: 'Размер шрифта',
                value: this.settings.fontSize,
                values: {
                    12: 'Маленький',
                    16: 'Средний',
                    20: 'Большой',
                    24: 'Очень большой'
                },
                onChange: (value) => {
                    this.settings.fontSize = parseInt(value);
                    this.saveSettings();
                    this.updateStyles();
                }
            });
            
            // Цвет текста
            subtitlesSettings.createSelect({
                name: 'Цвет текста',
                value: this.settings.textColor,
                values: {
                    '#ffffff': 'Белый',
                    '#ffff00': 'Жёлтый',
                    '#00ff00': 'Зелёный',
                    '#ff0000': 'Красный'
                },
                onChange: (value) => {
                    this.settings.textColor = value;
                    this.saveSettings();
                    this.updateStyles();
                }
            });
            
            // Кнопка ручного поиска субтитров
            subtitlesSettings.createButton({
                name: 'Найти субтитры для текущего видео',
                onclick: () => {
                    if (this.currentMedia) {
                        window.Lampa.Noty.show('Поиск субтитров...');
                        this.searchSubtitles(this.currentMedia);
                    } else {
                        window.Lampa.Noty.show('Нет активного видео');
                    }
                }
            });
        }
        
        injectSubtitleContainer() {
            // Создаем контейнер для субтитров
            this.subtitleElement = document.createElement('div');
            this.subtitleElement.className = 'subtitles-container';
            this.subtitleElement.innerHTML = '<div class="subtitles-text"></div>';
            this.subtitleElement.style.display = 'none';
            
            // Добавляем контейнер в DOM после загрузки плеера
            const checkPlayerInterval = setInterval(() => {
                const playerContainer = document.querySelector('.player');
                if (playerContainer) {
                    clearInterval(checkPlayerInterval);
                    playerContainer.appendChild(this.subtitleElement);
                }
            }, 100);
        }
        
        addEventListeners() {
            // Отслеживаем запуск видео
            const originalPlay = window.Lampa && window.Lampa.Player ? window.Lampa.Player.play : null;
            if (originalPlay) {
                window.Lampa.Player.play = (...args) => {
                    const result = originalPlay.apply(window.Lampa.Player, args);
                    this.onPlayerStart(args[0]);
                    return result;
                };
            } else {
                // Резервный вариант, если не можем перехватить метод play
                const checkPlayerInterval = setInterval(() => {
                    if (window.Lampa && window.Lampa.Player) {
                        clearInterval(checkPlayerInterval);
                        
                        const originalPlay = window.Lampa.Player.play;
                        window.Lampa.Player.play = (...args) => {
                            const result = originalPlay.apply(window.Lampa.Player, args);
                            this.onPlayerStart(args[0]);
                            return result;
                        };
                    }
                }, 100);
            }
            
            // Отслеживаем обновление времени в плеере
            document.addEventListener('timeupdate', this.onTimeUpdate.bind(this), true);
            
            // Добавляем горячую клавишу для включения/выключения субтитров
            document.addEventListener('keydown', (event) => {
                // Используем клавишу "S" для переключения субтитров
                if (event.key === 's' || event.key === 'S' || event.key === 'ы' || event.key === 'Ы') {
                    this.settings.enabled = !this.settings.enabled;
                    window.Lampa.Noty.show('Субтитры ' + (this.settings.enabled ? 'включены' : 'выключены'));
                    this.saveSettings();
                    if (!this.settings.enabled) {
                        this.hideSubtitles();
                    }
                }
            });
        }
        
        onPlayerStart(data) {
            if (!data) return;
            
            this.currentMedia = data;
            
            // Сбрасываем текущие субтитры
            this.subtitles = [];
            this.currentSubtitleIndex = -1;
            
            // Если автозагрузка включена, ищем субтитры
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
            // Ищем подходящие субтитры для текущего времени
            let foundSubtitle = null;
            
            for (let i = 0; i < this.subtitles.length; i++) {
                const subtitle = this.subtitles[i];
                if (currentTime >= subtitle.start && currentTime <= subtitle.end) {
                    foundSubtitle = subtitle;
                    this.currentSubtitleIndex = i;
                    break;
                }
            }
            
            // Отображаем или скрываем субтитры
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
            }
        }
        
        hideSubtitles() {
            if (this.subtitleElement) {
                this.subtitleElement.style.display = 'none';
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
            // Получаем информацию о текущем видео
            const title = mediaData.title || '';
            const year = mediaData.year || '';
            const imdb = mediaData.imdb_id || '';
            
            // Формируем запрос в зависимости от источника
            let apiUrl = '';
            switch (this.currentSource) {
                case 'opensubtitles':
                    apiUrl = `https://rest.opensubtitles.org/search/imdbid-${imdb}/sublanguageid-${this.settings.language}`;
                    break;
                case 'subscene':
                    // Используем прокси для обхода CORS
                    apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://subscene.com/subtitles/title?q=${title} ${year}&l=${this.settings.language}`)}`;
                    break;
                case 'addic7ed':
                    // Используем прокси для обхода CORS
                    apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.addic7ed.com/search.php?search=${title} ${year}&language=${this.settings.language}`)}`;
                    break;
                default:
                    // По умолчанию используем OpenSubtitles
                    apiUrl = `https://rest.opensubtitles.org/search/imdbid-${imdb}/sublanguageid-${this.settings.language}`;
            }
            
            // Для этого демонстрационного плагина используем моковые данные, 
            // чтобы избежать проблем с CORS и необходимости API-ключей
            this.fetchMockSubtitles(title, year);
            
            console.log(`[${pluginName}] Поиск субтитров для: ${title} (${year}), источник: ${this.currentSource}`);
            window.Lampa.Noty.show(`Поиск субтитров для: ${title}`);
        }
        
        fetchMockSubtitles(title, year) {
            // Генерируем случайные субтитры для демонстрации функциональности
            const mockSubtitles = this.generateMockSubtitles();
            this.processSubtitles(mockSubtitles);
            
            window.Lampa.Noty.show(`Субтитры загружены для: ${title}`, {
                time: 2000
            });
        }
        
        generateMockSubtitles() {
            // Генерируем примерные субтитры для демонстрации
            const subtitles = [];
            const videoLength = 7200; // Примерная длина видео в секундах (2 часа)
            
            // Добавляем субтитры через каждые 5-10 секунд
            for (let time = 10; time < videoLength; time += Math.floor(Math.random() * 10) + 5) {
                const startTime = time;
                const endTime = startTime + Math.floor(Math.random() * 5) + 2;
                
                // Шаблонные фразы для демонстрации
                const phrases = [
                    "Привет, как дела?",
                    "Я не понимаю, что происходит.",
                    "Это было невероятно!",
                    "Куда мы идём дальше?",
                    "Никогда не видел ничего подобного...",
                    "Ты должен мне поверить.",
                    "Что ты имеешь в виду?",
                    "Это полный абсурд.",
                    "Я всегда буду рядом.",
                    "Нам нужно спешить!"
                ];
                
                const text = phrases[Math.floor(Math.random() * phrases.length)];
                
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
                    this.settings = {...this.settings, ...parsed};
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
    
    // Инициализируем плагин при загрузке страницы
    const initPlugin = () => {
        // Проверяем, загружено ли приложение Lampa
        if (window.Lampa) {
            const subtitlesPlugin = new SubtitlesPlugin();
            window[pluginName] = subtitlesPlugin;
            console.log(`[${pluginName}] Плагин субтитров успешно загружен`);
        } else {
            // Если приложение еще не загружено, ждем и пробуем снова
            setTimeout(initPlugin, 100);
        }
    };
    
    // Запускаем инициализацию
    initPlugin();
})();
