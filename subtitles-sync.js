(function () {
    'use strict';

    // Регистрация плагина в системе Lampa
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.subtitles = {
        version: '1.2.1',
        name: 'Subtitles',
        description: 'Плагин для автоматической загрузки субтитров'
    };

    // Шаблон для настроек в меню
    Lampa.Template.add('settings_subtitles', `
        <div class="settings-folder selector" data-component="subtitles">
            <div class="settings-folder__icon">
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

    // Задержка загрузки плагина на 500 миллисекунд
    setTimeout(function() {
        function SubtitlesPlugin() {
            const plugin = this;

            this.settings = {
                enabled: false, // По умолчанию выключено
                language: 'ru',
                autoload: true,
                fontSize: 16,
                timeOffset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                textColor: '#ffffff'
            };

            this.currentMedia = null;
            this.subtitles = [];
            this.currentSubtitleIndex = -1;
            this.subtitleElement = null;

            // Загрузка и сохранение настроек
            this.loadSettings = function() {
                const saved = localStorage.getItem('subtitles_settings');
                if (saved) Object.assign(this.settings, JSON.parse(saved));
            };

            this.saveSettings = function() {
                localStorage.setItem('subtitles_settings', JSON.stringify(this.settings));
            };

            this.init = function () {
                this.loadSettings();
                this.createStyles();
                this.registerSettings();
                this.injectSubtitleContainer();
                this.addEventListeners();
                Lampa.Plugins.add('subtitles', this);
                console.log('[Subtitles] Plugin initialized');
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
                            const subtitlesFolder = e.body.find('[data-component="subtitles"]');
                            if (!subtitlesFolder.length) {
                                e.body.find('[data-component="more"]').after(Lampa.Template.get('settings_subtitles'));
                            }
                        }, 10);
                    }

                    if (e.name === 'subtitles') {
                        plugin.createSubtitlesSettings(e);
                    }
                });

                Lampa.Player.listener.follow('ready', () => this.addPlayerControls());
            };

            this.createSubtitlesSettings = function (e) {
                e.body.empty();
                const settings = [
                    { title: 'Enable Subtitles', type: 'toggle', value: this.settings.enabled, onChange: (v) => { this.settings.enabled = v; this.saveSettings(); if (!v) this.hideSubtitles(); else if (this.currentMedia) this.searchSubtitles(this.currentMedia); } },
                    { title: 'Subtitles Language', type: 'select', values: { ru: 'Russian', en: 'English', th: 'Thai' }, value: this.settings.language, onChange: (v) => { this.settings.language = v; this.saveSettings(); if (this.currentMedia && this.settings.enabled) this.searchSubtitles(this.currentMedia); } },
                    { title: 'Font Size', type: 'select', values: { 12: 'Small', 16: 'Medium', 20: 'Large', 24: 'Extra Large' }, value: this.settings.fontSize.toString(), onChange: (v) => { this.settings.fontSize = parseInt(v); this.saveSettings(); this.updateStyles(); } },
                    { title: 'Text Color', type: 'select', values: { '#ffffff': 'White', '#ffff00': 'Yellow', '#00ff00': 'Green', '#ff0000': 'Red' }, value: this.settings.textColor, onChange: (v) => { this.settings.textColor = v; this.saveSettings(); this.updateStyles(); } },
                    { title: 'Synchronization Offset (sec)', type: 'select', values: { '-5': '-5', '-2': '-2', '0': '0', '2': '2', '5': '5' }, value: this.settings.timeOffset.toString(), onChange: (v) => { this.settings.timeOffset = parseInt(v); this.saveSettings(); } }
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
                    title: 'Subtitles Settings',
                    items: [
                        { title: 'Enable Subtitles', subtitle: this.settings.enabled ? 'Enabled' : 'Disabled', name: 'toggle' },
                        { title: 'Language', subtitle: { ru: 'Russian', en: 'English', th: 'Thai' }[this.settings.language], name: 'language' },
                        { title: 'Font Size', subtitle: { 12: 'Small', 16: 'Medium', 20: 'Large', 24: 'Extra Large' }[this.settings.fontSize], name: 'font_size' },
                        { title: 'Text Color', subtitle: { '#ffffff': 'White', '#ffff00': 'Yellow', '#00ff00': 'Green', '#ff0000': 'Red' }[this.settings.textColor], name: 'text_color' },
                        { title: 'Synchronization Offset', subtitle: this.settings.timeOffset + ' sec', name: 'sync_offset' }
                    ],
                    onSelect: (item) => {
                        if (item.name === 'toggle') {
                            this.settings.enabled = !this.settings.enabled;
                            this.saveSettings();
                            Lampa.Noty.show('Subtitles ' + (this.settings.enabled ? 'enabled' : 'disabled'));
                            if (this.settings.enabled && this.currentMedia) this.searchSubtitles(this.currentMedia);
                            else this.hideSubtitles();
                        } else if (item.name === 'language') {
                            Lampa.Select.show({
                                title: 'Subtitles Language',
                                items: [{ title: 'Russian', value: 'ru' }, { title: 'English', value: 'en' }, { title: 'Thai', value: 'th' }],
                                onSelect: (v) => { this.settings.language = v.value; this.saveSettings(); if (this.currentMedia && this.settings.enabled) this.searchSubtitles(this.currentMedia); }
                            });
                        } else if (item.name === 'font_size') {
                            Lampa.Select.show({
                                title: 'Font Size',
                                items: [{ title: 'Small', value: 12 }, { title: 'Medium', value: 16 }, { title: 'Large', value: 20 }, { title: 'Extra Large', value: 24 }],
                                onSelect: (v) => { this.settings.fontSize = v.value; this.saveSettings(); this.updateStyles(); }
                            });
                        } else if (item.name === 'text_color') {
                            Lampa.Select.show({
                                title: 'Text Color',
                                items: [{ title: 'White', value: '#ffffff' }, { title: 'Yellow', value: '#ffff00' }, { title: 'Green', value: '#00ff00' }, { title: 'Red', value: '#ff0000' }],
                                onSelect: (v) => { this.settings.textColor = v.value; this.saveSettings(); this.updateStyles(); }
                            });
                        } else if (item.name === 'sync_offset') {
                            Lampa.Select.show({
                                title: 'Synchronization Offset',
                                items: Array.from({ length: 11 }, (_, i) => ({ title: (i - 5) + ' sec', value: i - 5 })),
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
                    if (['s', 'S'].includes(e.key)) {
                        this.settings.enabled = !this.settings.enabled;
                        this.saveSettings();
                        Lampa.Noty.show('Subtitles ' + (this.settings.enabled ? 'enabled' : 'disabled'));
                        if (this.settings.enabled && this.currentMedia) this.searchSubtitles(this.currentMedia);
                        else this.hideSubtitles();
                    } else if (e.key === '+' && this.settings.enabled) {
                        this.settings.timeOffset += 1;
                        this.saveSettings();
                        Lampa.Noty.show('Subtitles offset: ' + this.settings.timeOffset + ' sec');
                    } else if (e.key === '-' && this.settings.enabled) {
                        this.settings.timeOffset -= 1;
                        this.saveSettings();
                        Lampa.Noty.show('Subtitles offset: ' + this.settings.timeOffset + ' sec');
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
                if (!this.settings.enabled) return;
                const title = mediaData.title || '';
                const year = mediaData.year || '';
                Lampa.Noty.show(`Searching for subtitles: ${title}`);
                this.fetchMockSubtitles(title, year); // Заглушка для демо
            };

            this.fetchMockSubtitles = function (title, year) {
                const mockSubtitles = this.generateMockSubtitles();
                this.subtitles = mockSubtitles;
                Lampa.Noty.show(`Subtitles loaded for: ${title}`);
            };

            this.generateMockSubtitles = function () {
                const subtitles = [];
                for (let time = 10; time < 7200; time += Math.floor(Math.random() * 10) + 5) {
                    subtitles.push({
                        start: time,
                        end: time + Math.floor(Math.random() * 5) + 2,
                        text: ['Hello!', 'How are you?', 'This is a test.', 'Subtitles are working!'][Math.floor(Math.random() * 4)]
                    });
                }
                return subtitles;
            };

            this.init();
        }

        new SubtitlesPlugin();
    }, 500); // Задержка 500 мс
})();
