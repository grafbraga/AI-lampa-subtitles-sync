// Fix for subtitle container injection
this.injectSubtitleContainer = function () {
    // Remove any existing subtitle containers first
    const existingContainers = document.querySelectorAll('.subtitles-container');
    existingContainers.forEach(container => container.remove());
    
    this.subtitleElement = document.createElement('div');
    this.subtitleElement.className = 'subtitles-container';
    this.subtitleElement.innerHTML = '<div class="subtitles-text"></div>';
    this.subtitleElement.style.display = 'none';
    
    // Use Lampa Player events instead of interval
    Lampa.Player.listener.follow('ready', () => {
        const playerContainer = document.querySelector('.player');
        if (playerContainer && !playerContainer.querySelector('.subtitles-container')) {
            playerContainer.appendChild(this.subtitleElement);
        }
    });
};

// Fix for player controls to avoid duplicates
this.addPlayerControls = function() {
    const playerPanel = Lampa.Player.panel();
    if (!playerPanel) return;
    
    // Remove existing button first if it exists
    playerPanel.find('.player-panel__subtitles').remove();
    
    const subtitlesButton = $('<div class="player-panel__subtitles selector"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5Z" stroke="currentColor" stroke-width="2"/><line x1="5" y1="8" x2="19" y2="8" stroke="currentColor" stroke-width="2"/><line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/><line x1="5" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2"/></svg></div>');
    playerPanel.find('.player-panel__center').append(subtitlesButton);
    subtitlesButton.on('click', () => this.showPlayerSubtitlesSettings());
};

// Improved searchSubtitles with error handling
this.searchSubtitles = function (mediaData) {
    if (!this.settings.enabled) return;
    if (!mediaData || (!mediaData.title && !mediaData.name)) {
        Lampa.Noty.show('No media information for subtitles search');
        return;
    }
    
    const title = mediaData.title || mediaData.name || '';
    const year = mediaData.year || '';
    
    Lampa.Noty.show(`Searching for subtitles: ${title}`);
    
    try {
        // For production, replace this with actual API call
        // this.fetchSubtitlesFromAPI(title, year);
        
        // For demo/test purposes
        this.fetchMockSubtitles(title, year);
    } catch (error) {
        console.error('[Subtitles] Error searching subtitles:', error);
        Lampa.Noty.show('Failed to load subtitles');
    }
};

// Improved event listeners with cleanup
this.addEventListeners = function () {
    // Remove existing listeners to prevent duplicates
    Lampa.Player.listener.remove('start', this.onPlayerStart);
    Lampa.Player.listener.remove('timeupdate', this.onTimeUpdate);
    
    // Add listeners
    Lampa.Player.listener.follow('start', (data) => this.onPlayerStart(data));
    Lampa.Player.listener.follow('timeupdate', (data) => this.onTimeUpdate(data.time));
    
    // Keyboard shortcuts
    const handleKeyDown = (e) => {
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
    };
    
    // Remove existing handler if it exists
    document.removeEventListener('keydown', this._keyDownHandler);
    this._keyDownHandler = handleKeyDown;
    document.addEventListener('keydown', this._keyDownHandler);
};
