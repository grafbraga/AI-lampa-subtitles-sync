(function() {
    'use strict';

    // Plugin Information
    const pluginInfo = {
        name: 'Subtitles',
        version: '1.0.0',
        description: 'Automatic subtitles for videos in Lampa'
    };

    // OpenSubtitles API information
    // Note: In a real implementation, you would want to handle API limits and potential 
    // authentication issues more robustly
    const openSubtitlesApiKey = 'D7hLVYcZiZTx9st15DTlarZdI2qP4NG5';
    const openSubtitlesApiUrl = 'https://api.opensubtitles.com/api/v1';

    // Plugin settings
    let settings = {
        enabled: true,
        language: 'en',
        fontSize: 16,
        background: 'rgba(0, 0, 0, 0.5)',
        color: '#FFFFFF',
        position: 'bottom',
        offset: 0 // Time offset in seconds for sync adjustment
    };

    // Cache for subtitles
    const subtitlesCache = {};

    // Initialize plugin
    function init() {
        // Add plugin to Lampa
        window.lampa_settings.listener.follow('open', function(e) {
            if (e.name === 'main') {
                setTimeout(() => {
                    // Create settings category
                    const subtitlesSettings = $('<div class="settings-folder selector" data-component="subtitles">');
                    subtitlesSettings.append('<div class="settings-folder__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 6C2 4.9 2.9 4 4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6ZM4 6V18H20V6H4ZM7 9H17V11H7V9ZM7 13H14V15H7V13Z" fill="currentColor"/></svg></div>');
                    subtitlesSettings.append('<div class="settings-folder__name">Настройки субтитров</div>');
                    
                    e.body.find('[data-component="plugins"]').after(subtitlesSettings);
                    
                    // Create settings page
                    subtitlesSettings.on('hover:enter', createSubtitlesSettings);
                }, 0);
            }
        });

        // Register hotkey for toggling subtitles
        Lampa.Keypad.listener.follow('keydown', (e) => {
            // Using "S" key as a toggle for subtitles
            if (e.code === 'KeyS' || e.keyCode === 83) {
                settings.enabled = !settings.enabled;
                Lampa.Storage.set('subtitles_plugin_settings', settings);
                showNotification(settings.enabled ? 'Субтитры включены' : 'Субтитры выключены');
                toggleCurrentSubtitles(settings.enabled);
                return false; // Prevent default
            }
        });

        // Load settings from storage
        const savedSettings = Lampa.Storage.get('subtitles_plugin_settings');
        if (savedSettings) {
            settings = Object.assign(settings, savedSettings);
        } else {
            Lampa.Storage.set('subtitles_plugin_settings', settings);
        }

        // Add hook for video playback
        Lampa.Player.listener.follow('ready', onPlayerReady);
    }

    // Create settings interface
    function createSubtitlesSettings() {
        const settingsComponent = Lampa.Settings.create();
        settingsComponent.setSetting('Настройки субтитров');
        
        settingsComponent.createSection({
            title: 'Основные',
            items: [
                {
                    title: 'Включить субтитры',
                    subtitle: 'Автоматически загружать и отображать субтитры',
                    name: 'enabled',
                    type: 'toggle',
                    value: settings.enabled,
                    onChange: (value) => {
                        settings.enabled = value;
                        Lampa.Storage.set('subtitles_plugin_settings', settings);
                        toggleCurrentSubtitles(value);
                    }
                },
                {
                    title: 'Язык субтитров',
                    subtitle: 'Выберите предпочитаемый язык',
                    name: 'language',
                    type: 'select',
                    values: {
                        en: 'Английский',
                        ru: 'Русский',
                        fr: 'Французский',
                        de: 'Немецкий',
                        es: 'Испанский'
                    },
                    value: settings.language,
                    onChange: (value) => {
                        settings.language = value;
                        Lampa.Storage.set('subtitles_plugin_settings', settings);
                    }
                }
            ]
        });

        settingsComponent.createSection({
            title: 'Внешний вид',
            items: [
                {
                    title: 'Размер шрифта',
                    subtitle: 'Размер текста субтитров',
                    name: 'fontSize',
                    type: 'select',
                    values: {
                        12: 'Маленький',
                        16: 'Средний',
                        20: 'Большой',
                        24: 'Очень большой'
                    },
                    value: settings.fontSize,
                    onChange: (value) => {
                        settings.fontSize = parseInt(value);
                        Lampa.Storage.set('subtitles_plugin_settings', settings);
                        updateSubtitlesStyle();
                    }
                },
                {
                    title: 'Цвет текста',
                    subtitle: 'Цвет текста субтитров',
                    name: 'color',
                    type: 'select',
                    values: {
                        '#FFFFFF': 'Белый',
                        '#FFFF00': 'Жёлтый',
                        '#00FF00': 'Зелёный'
                    },
                    value: settings.color,
                    onChange: (value) => {
                        settings.color = value;
                        Lampa.Storage.set('subtitles_plugin_settings', settings);
                        updateSubtitlesStyle();
                    }
                },
                {
                    title: 'Положение',
                    subtitle: 'Расположение субтитров на экране',
                    name: 'position',
                    type: 'select',
                    values: {
                        top: 'Сверху',
                        bottom: 'Снизу'
                    },
                    value: settings.position,
                    onChange: (value) => {
                        settings.position = value;
                        Lampa.Storage.set('subtitles_plugin_settings', settings);
                        updateSubtitlesStyle();
                    }
                }
            ]
        });

        settingsComponent.createSection({
            title: 'Синхронизация',
            items: [
                {
                    title: 'Смещение времени (секунды)',
                    subtitle: 'Корректировка синхронизации субтитров',
                    name: 'offset',
                    type: 'select',
                    values: {
                        '-5': '-5',
                        '-4': '-4',
                        '-3': '-3',
                        '-2': '-2',
                        '-1': '-1',
                        '0': '0',
                        '1': '+1',
                        '2': '+2',
                        '3': '+3',
                        '4': '+4',
                        '5': '+5'
                    },
                    value: settings.offset.toString(),
                    onChange: (value) => {
                        settings.offset = parseInt(value);
                        Lampa.Storage.set('subtitles_plugin_settings', settings);
                    }
                }
            ]
        });

        settingsComponent.createSection({
            title: 'О плагине',
            items: [
                {
                    title: 'Версия',
                    subtitle: pluginInfo.version
                },
                {
                    title: 'Автор',
                    subtitle: 'Lampa Subtitles Plugin'
                }
            ]
        });

        Lampa.Settings.open(settingsComponent);
    }

    // Handle player ready event
    function onPlayerReady(e) {
        if (!settings.enabled) return;
        
        const video = e.video;
        const metaData = e.data;
        
        // If there's no video data or player, exit
        if (!video || !metaData) return;
        
        // Create subtitles container if it doesn't exist
        createSubtitlesContainer();
        
        // Try to get video identification (title, year, etc.)
        const videoInfo = getVideoInfo(metaData);
        
        // Search for subtitles
        searchSubtitles(videoInfo).then(subtitles => {
            if (subtitles && subtitles.length > 0) {
                // Get the best matching subtitle
                const bestSubtitle = getBestSubtitle(subtitles, settings.language);
                
                // Download and parse subtitle
                downloadSubtitle(bestSubtitle).then(parsedSubtitles => {
                    if (parsedSubtitles && parsedSubtitles.length > 0) {
                        // Store in cache
                        const cacheKey = JSON.stringify(videoInfo);
                        subtitlesCache[cacheKey] = parsedSubtitles;
                        
                        // Set up subtitles display
                        setupSubtitlesDisplay(parsedSubtitles, video);
                    }
                }).catch(error => {
                    console.error('Error downloading subtitles:', error);
                });
            }
        }).catch(error => {
            console.error('Error searching for subtitles:', error);
        });
    }

    // Create subtitles container
    function createSubtitlesContainer() {
        // Remove existing container if it exists
        $('.lampa-subtitles').remove();
        
        // Create new container
        const container = $('<div class="lampa-subtitles"></div>');
        $('body').append(container);
        
        // Set initial styles
        updateSubtitlesStyle();
    }

    // Update subtitles styling based on settings
    function updateSubtitlesStyle() {
        const container = $('.lampa-subtitles');
        if (container.length === 0) return;
        
        container.css({
            position: 'absolute',
            width: '100%',
            textAlign: 'center',
            zIndex: 9999,
            padding: '20px',
            color: settings.color,
            fontSize: settings.fontSize + 'px',
            fontWeight: 'bold',
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
            [settings.position]: '50px',
            transition: 'opacity 0.3s ease'
        });
    }

    // Get video information from metadata
    function getVideoInfo(metaData) {
        const info = {
            title: '',
            year: '',
            imdb_id: '',
            type: ''
        };
        
        if (metaData.movie) {
            info.title = metaData.movie.title || '';
            info.year = metaData.movie.year || '';
            info.imdb_id = metaData.movie.imdb_id || '';
            info.type = 'movie';
        } else if (metaData.name) {
            info.title = metaData.name || '';
            info.year = metaData.year || '';
            info.type = 'series';
            
            if (metaData.season && metaData.episode) {
                info.season = metaData.season;
                info.episode = metaData.episode;
            }
        }
        
        return info;
    }

    // Search for subtitles using OpenSubtitles API
    async function searchSubtitles(videoInfo) {
        // Check if we have this in cache
        const cacheKey = JSON.stringify(videoInfo);
        if (subtitlesCache[cacheKey]) {
            return Promise.resolve([{cached: true}]);
        }
        
        // Build search parameters
        const searchParams = new URLSearchParams();
        
        if (videoInfo.imdb_id) {
            searchParams.append('imdb_id', videoInfo.imdb_id.replace('tt', ''));
        } else {
            searchParams.append('query', videoInfo.title);
            
            if (videoInfo.year) {
                searchParams.append('year', videoInfo.year);
            }
        }
        
        // Add language
        searchParams.append('languages', settings.language);
        
        // For series, add season and episode
        if (videoInfo.type === 'series' && videoInfo.season && videoInfo.episode) {
            searchParams.append('season_number', videoInfo.season);
            searchParams.append('episode_number', videoInfo.episode);
        }
        
        try {
            // Fetch subtitles from OpenSubtitles
            const response = await fetch(`${openSubtitlesApiUrl}/subtitles?${searchParams.toString()}`, {
                headers: {
                    'Api-Key': openSubtitlesApiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`OpenSubtitles API error: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error searching for subtitles:', error);
            return [];
        }
    }

    // Get best matching subtitle from results
    function getBestSubtitle(subtitles, language) {
        // If we have a cached result, return placeholder
        if (subtitles.length === 1 && subtitles[0].cached) {
            return {cached: true};
        }
        
        // Filter by language
        const langSubtitles = subtitles.filter(sub => 
            sub.attributes && sub.attributes.language === language
        );
        
        // If no matching language, use any available
        const filtered = langSubtitles.length ? langSubtitles : subtitles;
        
        // Sort by downloads count or rating to get the most popular
        return filtered.sort((a, b) => {
            const aDownloads = a.attributes ? (a.attributes.download_count || 0) : 0;
            const bDownloads = b.attributes ? (b.attributes.download_count || 0) : 0;
            return bDownloads - aDownloads;
        })[0];
    }

    // Download and parse subtitle file
    async function downloadSubtitle(subtitle) {
        // If we have a cached result, return from cache
        if (subtitle.cached) {
            return Promise.resolve(subtitle);
        }
        
        if (!subtitle || !subtitle.attributes || !subtitle.attributes.files || 
            !subtitle.attributes.files.length || !subtitle.attributes.files[0].file_id) {
            return Promise.reject(new Error('Invalid subtitle data'));
        }
        
        const fileId = subtitle.attributes.files[0].file_id;
        
        try {
            // Get download link
            const response = await fetch(`${openSubtitlesApiUrl}/download`, {
                method: 'POST',
                headers: {
                    'Api-Key': openSubtitlesApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_id: fileId
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenSubtitles download error: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.link) {
                throw new Error('Download link not available');
            }
            
            // Download subtitle file
            const subtitleResponse = await fetch(data.link);
            
            if (!subtitleResponse.ok) {
                throw new Error(`Error downloading subtitle file: ${subtitleResponse.statusText}`);
            }
            
            const subtitleContent = await subtitleResponse.text();
            
            // Parse subtitle based on format (SRT, WebVTT, etc.)
            return parseSubtitleContent(subtitleContent, data.file_name);
        } catch (error) {
            console.error('Error downloading subtitle:', error);
            return null;
        }
    }

    // Parse subtitle content based on file format
    function parseSubtitleContent(content, fileName) {
        // Different parsing logic based on file extension
        if (fileName.endsWith('.srt')) {
            return parseSRT(content);
        } else if (fileName.endsWith('.vtt')) {
            return parseVTT(content);
        } else {
            // Try to guess format based on content
            if (content.includes('WEBVTT') || content.includes('Kind:')) {
                return parseVTT(content);
            } else {
                return parseSRT(content);
            }
        }
    }

    // Parse SRT formatted subtitles
    function parseSRT(content) {
        const subtitles = [];
        const regex = /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+|\r?\n\r?\n$|$)/g;
        
        let match;
        while ((match = regex.exec(content)) !== null) {
            const startTime = timeStringToSeconds(match[2]);
            const endTime = timeStringToSeconds(match[3]);
            const text = match[4].trim();
            
            subtitles.push({
                start: startTime,
                end: endTime,
                text: text
            });
        }
        
        return subtitles;
    }

    // Parse WebVTT formatted subtitles
    function parseVTT(content) {
        const subtitles = [];
        
        // Remove WebVTT header
        content = content.replace(/^WEBVTT.*?(\r?\n\r?\n)/, '$1');
        
        const regex = /(\d{2}:\d{2}:\d{2}.\d{3}) --> (\d{2}:\d{2}:\d{2}.\d{3}).*?\r?\n([\s\S]*?)(?=\r?\n\r?\n|\r?\n\d{2}:\d{2}:\d{2}|\r?\n$|$)/g;
        
        let match;
        while ((match = regex.exec(content)) !== null) {
            const startTime = timeStringToSeconds(match[1]);
            const endTime = timeStringToSeconds(match[2]);
            const text = match[3].trim();
            
            subtitles.push({
                start: startTime,
                end: endTime,
                text: text
            });
        }
        
        return subtitles;
    }

    // Convert time string to seconds
    function timeStringToSeconds(timeString) {
        // Handle different time formats
        const pattern1 = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/; // 00:00:00,000 or 00:00:00.000
        const pattern2 = /(\d{2}):(\d{2}):(\d{2})/; // 00:00:00
        
        let hours, minutes, seconds, milliseconds;
        
        if (pattern1.test(timeString)) {
            const match = timeString.match(pattern1);
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            seconds = parseInt(match[3], 10);
            milliseconds = parseInt(match[4], 10) / 1000;
        } else if (pattern2.test(timeString)) {
            const match = timeString.match(pattern2);
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            seconds = parseInt(match[3], 10);
            milliseconds = 0;
        } else {
            return 0;
        }
        
        return (hours * 3600) + (minutes * 60) + seconds + milliseconds;
    }

    // Set up subtitles display
    function setupSubtitlesDisplay(subtitles, videoElement) {
        const container = $('.lampa-subtitles');
        if (!container.length || !subtitles || !subtitles.length) return;
        
        let currentSubtitle = null;
        let updateInterval;
        
        // Update subtitles display
        function updateSubtitles() {
            if (!settings.enabled) {
                container.text('').hide();
                return;
            }
            
            if (!videoElement || videoElement.paused) return;
            
            const currentTime = videoElement.currentTime + settings.offset;
            
            // Find matching subtitle
            const matched = subtitles.find(sub => 
                currentTime >= sub.start && currentTime <= sub.end
            );
            
            if (matched) {
                if (currentSubtitle !== matched.text) {
                    currentSubtitle = matched.text;
                    container.html(currentSubtitle.replace(/\n/g, '<br>')).show();
                }
            } else {
                container.text('').hide();
                currentSubtitle = null;
            }
        }
        
        // Clear existing interval if any
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        // Set up interval to check subtitles
        updateInterval = setInterval(updateSubtitles, 100);
        
        // Add event listeners for video events
        $(videoElement).on('play pause seeked', updateSubtitles);
    }

    // Toggle subtitles on/off
    function toggleCurrentSubtitles(enabled) {
        const container = $('.lampa-subtitles');
        if (container.length) {
            if (enabled) {
                container.show();
            } else {
                container.hide();
            }
        }
    }

    // Show notification message
    function showNotification(message) {
        Lampa.Noty.show(message);
    }

    // Run initialization
    window.addEventListener('load', init);
})();
