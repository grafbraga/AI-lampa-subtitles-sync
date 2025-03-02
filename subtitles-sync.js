(function () {
    'use strict';

    // Регистрация плагина в системе Lampa
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.subtitles = {
        version: '1.2.1',
        name: 'Субтитры',
        description: 'Плагин для автоматической загрузки субтитров'
    };

    function SubtitlesPlugin() {
        const plugin = this;
        
        this.settings = {
            enabled: true,
            language: 'ru',
            autoload: true,
            fontSize: 16,
            timeOffset: 0, // Исправлено название для смещения времени
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textColor: '#ffffff'
        };
        
        this.currentMedia = null;
        this.subtitles = [];
        this.currentSubtitleIndex = -1;
        this.subtitleElement = null;
        this.sources = ['opensubtitles', 'subscene', 'addic7ed'];
        this.currentSource = 'opensubtitles';
        
        // Загружаем настройки из localStorage
        this.loadSettings = function() {
            const saved = localStorage.getItem('subtitles_settings');
            if (saved) Object.assign(this.settings, JSON.parse(saved));
        };
        
        this.saveSettings = function() {
            localStorage.setItem('subtitles_settings', JSON.stringify(this.settings));
        };
        
        this.init = function () {
            this.createStyles();
            this.registerSettings();
            this.injectSubtitleContainer();
            this.addEventListeners();
            Lampa.Plugins.add('subtitles', this);
            console.log('[Subtitles] Плагин субтитров инициализирован');
        };
        
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
        
        this.registerSettings = function () {
            Lampa.Settings.listener.follow('open', function (e) {
                if (e.name === 'main') {
                    setTimeout(function() {
                        if (e.body.find('[data-component="subtitles"]').length === 0) {
                            e.body.find('[data-component="more"]').after(
                                '<div class="settings-folder selector" data-component="subtitles">'+
                                    '<div class="settings-folder__icon">'+
                                        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+
                                            '<path d="M2 5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5Z" stroke="currentColor" stroke-width="2"/>'+
                                            '<line x1="5" y1="8" x2="19" y2="8" stroke="currentColor" stroke-width="2"/>'+
                                            '<line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/>'+
                                            '<line x1="5" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2"/>'+
                                        '</svg>'+
                                    '</div>'+
                                    '<div class="settings-folder__name">Субтитры</div>'+
                                '</div>'
                            );
                        }
                    }, 10);
                }
                
                if (e.name === 'subtitles') {
                    plugin.createSubtitlesSettings(e);
                }
            });
            
            Lampa.Player.listener.follow('ready', () => {
                this.addPlayerControls();
            });
        };
        
        this.createSubtitlesSettings = function (e) {
            e.body.empty();
            const settings = [
                { title: 'Включить субтитры', type: 'toggle', value: this.settings.enabled, onChange: (v) => { this.settings.enabled = v; this.saveSettings(); if (!v) this.hideSubtitles(); } },
                { title: 'Язык субтитров', type: 'select', values: { ru: 'Русский', en: 'Английский', th: 'Тайский' }, value: this.settings.language, onChange: (v) => { this.settings.language = v; this.saveSettings(); if (this.currentMedia) this.searchSubtitles(this.currentMedia); } },
                { title: 'Размер шрифта', type: 'select', values: { 12: 'Маленький', 16: 'Средний', 20: 'Большой', 24: 'Очень большой' }, value: this.settings.fontSize.toString(), onChange: (v) => { this.settings.fontSize = parseInt(v); this.saveSettings(); this.updateStyles(); } },
                { title: 'Цвет текста', type: 'select', values: { '#ffffff': 'Белый', '#ffff00': 'Жёлтый', '#00ff00': 'Зелёный', '#ff0000': 'Красный' }, value: this.settings.textColor, onChange: (v) => { this.settings.textColor = v; this.saveSettings(); this.updateStyles(); } },
                { title: 'Коррекция синхронизации (сек)', type: 'select', values: { '-5': '-5', '-2': '-2', '0': '0', '2': '2', '5': '5' }, value: this.settings.timeOffset.toString(), onChange: (v) => { this.settings.timeOffset = parseInt(v); this.saveSettings(); } }
            ];
            settings.forEach(setting => {
                const item = $('<div class="settings-param"><div class="settings-param__name">' + setting.title + '</div><div class="settings-param__value"></div></div>');
                const field = item.find('.settings-param__value');
                if (setting.type === 'toggle') {
                    const toggle = $('<div class="settings-param__toggle selector ' + (setting.value ? 'active' : '') + '"><div class="settings-param__toggle-handle"></div></div>');
                    toggle.on('click', () => { toggle.toggleClass('active'); setting.onChange(toggle.hasClass('active')); });
                    field.append(toggle);
                } else if (setting.type === 'select') {
                    const select = $('<div class="settings-param__select selector">' + setting.values[setting.value] + '</div>');
                    select.on('click', () => {
                        Lampa.Select.show({
                            title: setting.title,
                            items: Object.keys(setting.values).map(k => ({ title: setting.values[k], value: k, selected: k === setting.value })),
                            onSelect: (v) => { select.text(setting.values[v.value]); setting.onChange(v.value); }
                        });
                    });
                    field.append(select);
                }
                e.body.append(item);
            });
        };
        
        this.addPlayerControls = function() {
            const playerPanel = Lampa.Player.panel();
            if (!playerPanel || playerPanel.find('.player-panel__subtitles').length) return;
            const subtitlesButton = $('<div class="player-panel__subtitles selector"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5Z" stroke="currentColor" stroke-width="2"/><line x1="5" y1="8" x2="19" y2="8" stroke="currentColor" stroke-width="2"/><line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/><line x1="5" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2"/></svg></div>');
            playerPanel.find('.player-panel__center').append(subtitlesButton);
            subtitlesButton.on('click', () => this.showPlayerSubtitlesSettings());
        };
        
        this.showPlayerSubtitlesSettings = function() {
            Lampa.Select.show({
                title: 'Настройки субтитров',
                items: [
                    { title: 'Субтитры', subtitle: this.settings.enabled ? 'Включены' : 'Выключены', name: 'toggle' },
                    { title: 'Язык', subtitle: { ru: 'Русский', en: 'Английский', th: 'Тайский' }[this.settings.language], name: 'language' },
                    { title: 'Размер шрифта', subtitle: { 12: 'Маленький', 16: 'Средний', 20: 'Большой', 24: 'Очень большой' }[this.settings.fontSize], name: 'font_size' },
                    { title: 'Цвет текста', subtitle: { '#ffffff': 'Белый', '#ffff00': 'Жёлтый', '#00ff00': 'Зелёный', '#ff0000': 'Красный' }[this.settings.textColor], name: 'text_color' },
                    { title: 'Коррекция синхронизации', subtitle: this.settings.timeOffset + ' сек', name: 'sync_offset' }
                ],
                onSelect: (item) => {
                    if (item.name === 'toggle') {
                        this.settings.enabled = !this.settings.enabled;
                        this.saveSettings();
                        Lampa.Noty.show('Субтитры ' + (this.settings.enabled ? 'включены' : 'выключены'));
                        if (!this.settings.enabled) this.hideSubtitles();
                    } else if (item.name === 'language') {
                        Lampa.Select.show({
                            title: 'Язык субтитров',
                            items: [{ title: 'Русский', value: 'ru' }, { title: 'Английский', value: 'en' }, { title: 'Тайский', value: 'th' }],
                            onSelect: (v) => { this.settings.language = v.value; this.saveSettings(); if (this.currentMedia) this.searchSubtitles(this.currentMedia); }
                        });
                    } else if (item.name === 'font_size') {
                        Lampa.Select.show({
                            title: 'Размер шрифта',
                            items: [{ title: 'Маленький', value: 12 }, { title: 'Средний', value: 16 }, { title: 'Большой', value: 20 }, { title: 'Очень большой', value: 24 }],
                            onSelect: (v) => { this.settings.fontSize = v.value; this.saveSettings(); this.updateStyles(); }
                        });
                    } else if (item.name === 'text_color') {
                        Lampa.Select.show({
                            title: 'Цвет текста',
                            items: [{ title: 'Белый', value: '#ffffff' }, { title: 'Жёлтый', value: '#ffff00' }, { title: 'Зелёный', value: '#00ff00' }, { title: 'Красный', value: '#ff0000' }],
                            onSelect: (v) => { this.settings.textColor = v.value; this.saveSettings(); this.updateStyles(); }
                        });
                    } else if (item.name === 'sync_offset') {
                        Lampa.Select.show({
                            title: 'Коррекция синхронизации',
                            items: Array.from({ length: 11 }, (_, i) => ({ title: (i - 5) + ' сек', value: i - 5 })),
                            onSelect: (v) => { this.settings.timeOffset = v.value; this.saveSettings(); }
                        });
                    }
                }
            });
        };
        
        this.injectSubtitleContainer = function () {
            this.subtitleElement = document.createElement('div');
            this.subtitleElement.className = 'subtitles-container';
            this.subtitleElement.innerHTML = '<div class="subtitles-text"></div>';
            this.subtitleElement.style.display = 'none';
            const checkPlayerInterval = setInterval(() => {
                const playerContainer = document.querySelector('.player');
                if (playerContainer) {
                    clearInterval(checkPlayerInterval);
                    playerContainer.appendChild(this.subtitleElement);
                }
            }, 100);
        };
        
        this.addEventListeners = function () {
            Lampa.Player.listener.follow('start', (data) => this.onPlayerStart(data));
            Lampa.Player.listener.follow('timeupdate', (data) => this.onTimeUpdate(data.time));
            document.addEventListener('keydown', (e) => {
                if (['s', 'S', 'ы', 'Ы'].includes(e.key)) {
                    this.settings.enabled = !this.settings.enabled;
                    Lampa.Noty.show('Субтитры ' + (this.settings.enabled ? 'включены' : 'выключены'));
                    this.saveSettings();
                    if (!this.settings.enabled) this.hideSubtitles();
                }
            });
        };
        
        this.onPlayerStart = function (data) {
            if (!data) return;
            this.currentMedia = data;
            this.subtitles = [];
            this.currentSubtitleIndex = -1;
            if (this.settings.enabled && this.settings.autoload) this.searchSubtitles(data);
        };
        
        this.onTimeUpdate = function (time) {
            if (!this.settings.enabled || this.subtitles.length === 0) return;
            const correctedTime = time + this.settings.timeOffset;
            this.displaySubtitleAtTime(correctedTime);
        };
        
        this.displaySubtitleAtTime = function (currentTime) {
            if (this.currentSubtitleIndex >= 0 && this.currentSubtitleIndex < this.subtitles.length) {
                const current = this.subtitles[this.currentSubtitleIndex];
                if (currentTime < current.start || currentTime > current.end) this.currentSubtitleIndex = -1;
            }
            if (this.currentSubtitleIndex === -1) {
                for (let i = 0; i < this.subtitles.length; i++) {
                    const subtitle = this.subtitles[i];
                    if (currentTime >= subtitle.start && currentTime <= subtitle.end) {
                        this.currentSubtitleIndex = i;
                        break;
                    }
                }
            }
            const subtitle = this.currentSubtitleIndex >= 0 ? this.subtitles[this.currentSubtitleIndex] : null;
            if (subtitle && currentTime >= subtitle.start && currentTime <= subtitle.end) {
                this.showSubtitle(subtitle.text);
            } else {
                this.hideSubtitles();
            }
        };
        
        this.showSubtitle = function (text) {
            if (this.subtitleElement) {
                this.subtitleElement.querySelector('.subtitles-text').innerHTML = text;
                this.subtitleElement.style.display = 'block';
            }
        };
        
        this.hideSubtitles = function () {
            if (this.subtitleElement) this.subtitleElement.style.display = 'none';
        };
        
        this.updateStyles = function () {
            const style = document.createElement('style');
            style.textContent = `.subtitles-text { font-size: ${this.settings.fontSize}px !important; color: ${this.settings.textColor} !important; background-color: ${this.settings.backgroundColor} !important; }`;
            document.head.appendChild(style);
        };
        
        this.searchSubtitles = function (mediaData) {
            const title = mediaData.title || '';
            const year = mediaData.year || '';
            Lampa.Noty.show(`Поиск субтитров для: ${title}`);
            this.fetchMockSubtitles(title, year); // Для демонстрации
        };
        
        this.fetchMockSubtitles = function (title, year) {
            const mockSubtitles = this.generateMockSubtitles();
            this.subtitles = mockSubtitles;
            Lampa.Noty.show(`Субтитры загружены для: ${title}`);
        };
        
        this.generateMockSubtitles = function () {
            const subtitles = [];
            for (let time = 10; time < 7200; time += Math.floor(Math.random() * 10) + 5) {
                subtitles.push({
                    start: time,
                    end: time + Math.floor(Math.random() * 5) + 2,
                    text: ['Привет!', 'Как дела?', 'Это тест.', 'Субтитры работают!'][Math.floor(Math.random() * 4)]
                });
            }
            return subtitles;
        };
        
        this.init();
    }

    new SubtitlesPlugin();
})();
