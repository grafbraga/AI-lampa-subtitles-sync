(function () {
    'use strict';

    // Subtitles plugin for Lampa TV
    var SubtitlesPlugin = {
        // Plugin configuration
        config: {
            name: 'Subtitles Sync',
            version: '1.0.0',
            description: 'Easy subtitles synchronization for Lampa TV',
            
            // Default settings
            defaults: {
                enabled: false,
                offset: 0,
                source: 'opensubtitles'
            }
        },

        // Initialize plugin
        init: function () {
            // Add settings menu
            this.addSettingsMenu();
            
            // Hook into Lampa player
            this.attachToPlayer();
        },

        // Add settings menu to Lampa TV
        addSettingsMenu: function () {
            Lampa.Settings.add('subtitles_settings', {
                title: 'Subtitles Settings',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>',
                component: 'subtitles_settings'
            });

            // Create settings component
            Lampa.Template.add('component_subtitles_settings', function (data) {
                var subtitlesEnabled = SubtitlesPlugin.config.defaults.enabled;
                var subtitlesOffset = SubtitlesPlugin.config.defaults.offset;

                return `
                    <div class="settings-subtitles">
                        <div class="settings-line">
                            <div class="settings-line__name">Enable Subtitles</div>
                            <div class="settings-line__switch">
                                <div class="switch__track ${subtitlesEnabled ? 'switch-on' : ''}">
                                    <div class="switch__handle"></div>
                                </div>
                            </div>
                        </div>
                        <div class="settings-line">
                            <div class="settings-line__name">Subtitles Offset (seconds)</div>
                            <div class="settings-line__value">${subtitlesOffset}</div>
                        </div>
                    </div>
                `;
            });

            // Register component
            Lampa.Component.add('subtitles_settings', {
                init: function () {
                    var _this = this;
                    
                    // Toggle subtitles
                    this.toggle = function () {
                        SubtitlesPlugin.config.defaults.enabled = !SubtitlesPlugin.config.defaults.enabled;
                        SubtitlesPlugin.saveConfig();
                        _this.update();
                    };

                    // Adjust subtitle timing
                    this.toggleOffset = function (direction) {
                        SubtitlesPlugin.config.defaults.offset += direction * 0.5;
                        SubtitlesPlugin.saveConfig();
                        _this.update();
                    };
                },
                update: function () {
                    var html = Lampa.Template.get('component_subtitles_settings');
                    this.content.html(html);
                    this.setupListeners();
                },
                setupListeners: function () {
                    var _this = this;
                    $('.switch__track').on('hover', function () {
                        _this.toggle();
                    });
                }
            });
        },

        // Attach plugin to Lampa player
        attachToPlayer: function () {
            // Override Lampa player to add subtitle support
            Lampa.Player.prototype.subtitlesSync = function () {
                var player = this;
                var subtitlesEnabled = SubtitlesPlugin.config.defaults.enabled;
                var subtitlesOffset = SubtitlesPlugin.config.defaults.offset;

                if (subtitlesEnabled) {
                    // Fetch subtitles (simplified approach)
                    this.subtitles = this.fetchSubtitles();

                    // Adjust subtitle timing
                    this.subtitles.forEach(function (subtitle) {
                        subtitle.start += subtitlesOffset;
                        subtitle.end += subtitlesOffset;
                    });

                    // Render subtitles
                    this.renderSubtitles();
                }
            };

            // Add subtitle controllers
            Lampa.Controller.add('subtitles', {
                toggle: function () {
                    SubtitlesPlugin.config.defaults.enabled = !SubtitlesPlugin.config.defaults.enabled;
                    Lampa.Player.subtitlesSync();
                },
                left: function () {
                    SubtitlesPlugin.config.defaults.offset -= 0.5;
                    Lampa.Player.subtitlesSync();
                },
                right: function () {
                    SubtitlesPlugin.config.defaults.offset += 0.5;
                    Lampa.Player.subtitlesSync();
                }
            });
        },

        // Fetch subtitles from OpenSubtitles (simplified mock)
        fetchSubtitles: function () {
            // In a real implementation, this would fetch from OpenSubtitles or another source
            return [
                { start: 1.0, end: 3.0, text: 'Hello, this is a subtitle.' },
                { start: 4.0, end: 6.0, text: 'Another example subtitle.' }
            ];
        },

        // Save configuration
        saveConfig: function () {
            localStorage.setItem('subtitles_plugin_config', JSON.stringify(this.config.defaults));
        },

        // Load configuration
        loadConfig: function () {
            var savedConfig = localStorage.getItem('subtitles_plugin_config');
            if (savedConfig) {
                this.config.defaults = JSON.parse(savedConfig);
            }
        }
    };

    // Register Lampa plugin
    Lampa.Plugin.register({
        name: SubtitlesPlugin.config.name,
        version: SubtitlesPlugin.config.version,
        description: SubtitlesPlugin.config.description,
        init: function () {
            SubtitlesPlugin.init();
        }
    });
})();
