// Configuration - NO hardcoded secrets!
const REDIRECT_URI = 'https://creator-dashboards.netlify.app/callback'; // CHANGE THIS TO YOUR NETLIFY URL

let config = {
    youtube: {
        apiKey: localStorage.getItem('ytApiKey') || '',
        channelId: localStorage.getItem('ytChannelId') || ''
    },
    tiktok: {
        accessToken: localStorage.getItem('ttAccessToken') || '',
        openId: localStorage.getItem('ttOpenId') || ''
    }
};

// State tracking
const previousStats = {
    youtube: { subs: 0, views: 0 },
    tiktok: { followers: 0, likes: 0 }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    
    loadSavedConfig();
    setupConnectButtons();
    
    // Check if we're on callback page
    if (window.location.pathname.includes('callback')) {
        handleTikTokCallback();
        return;
    }
    
    // Load dashboard if we have credentials
    const hasYouTube = config.youtube.apiKey && config.youtube.channelId;
    const hasTikTok = config.tiktok.accessToken && config.tiktok.openId;
    
    if (hasYouTube || hasTikTok) {
        loadDashboard();
        setInterval(loadDashboard, 60000);
    }
});

function loadSavedConfig() {
    document.getElementById('ytApiKey').value = config.youtube.apiKey;
    document.getElementById('ytChannelId').value = config.youtube.channelId;
    document.getElementById('ttAccessToken').value = config.tiktok.accessToken;
    document.getElementById('ttOpenId').value = config.tiktok.openId;
}

function setupConnectButtons() {
    // YouTube Connect prompt
    const ytSection = document.querySelector('.platform.youtube');
    if (!config.youtube.apiKey || !config.youtube.channelId) {
        const existingPrompt = ytSection.querySelector('.connect-prompt');
        if (!existingPrompt) {
            ytSection.insertAdjacentHTML('beforeend', `
                <div class="connect-prompt" style="text-align: center; padding: 30px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px;">
                    <p style="color: #888; margin-bottom: 15px;">YouTube not connected</p>
                    <button onclick="toggleSettings()" style="background: #ff0000; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: 600;">Connect YouTube</button>
                </div>
            `);
        }
    }
    
    // TikTok Connect prompt
    const ttSection = document.querySelector('.platform.tiktok');
    const hasTikTok = config.tiktok.accessToken && config.tiktok.openId;
    
    console.log('TikTok status:', { hasTikTok });
    
    if (!hasTikTok) {
        // Hide metrics, show connect button
        const metricsGrid = ttSection.querySelector('.metrics-grid');
        const videosSection = ttSection.querySelector('.videos-section');
        
        if (metricsGrid) metricsGrid.style.display = 'none';
        if (videosSection) videosSection.style.display = 'none';
        
        // Remove existing prompt if any
        const existingPrompt = ttSection.querySelector('.connect-prompt');
        if (existingPrompt) existingPrompt.remove();
        
        ttSection.insertAdjacentHTML('beforeend', `
            <div class="connect-prompt" style="text-align: center; padding: 40px 20px;">
                <p style="color: #888; margin-bottom: 20px; font-size: 1.1rem;">Connect your TikTok account to see live metrics</p>
                <button onclick="connectTikTok()" style="background: #fe2c55; color: white; border: none; padding: 15px 40px; border-radius: 30px; cursor: pointer; font-weight: 600; font-size: 1.1rem; transition: all 0.3s; box-shadow: 0 4px 15px rgba(254, 44, 85, 0.3);">
                    Connect TikTok
                </button>
                <p style="color: #666; margin-top: 15px; font-size: 0.9rem;">Or <a href="#" onclick="toggleSettings(); return false;" style="color: #fe2c55;">enter token manually</a></p>
            </div>
        `);
    } else {
        // Show metrics, hide connect prompt
        const metricsGrid = ttSection.querySelector('.metrics-grid');
        const videosSection = ttSection.querySelector('.videos-section');
        const connectPrompt = ttSection.querySelector('.connect-prompt');
        
        if (metricsGrid) metricsGrid.style.display = 'grid';
        if (videosSection) videosSection.style.display = 'grid';
        if (connectPrompt) connectPrompt.remove();
    }
}

async function connectTikTok() {
    // Generate state for security
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('tiktokState', state);
    
    try {
        // Fetch client key from backend
        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        
        if (!configData.clientKey) {
            throw new Error('TikTok Client Key not configured. Add TIKTOK_CLIENT_KEY to Netlify Environment Variables.');
        }
        
        const authUrl = `https://www.tiktok.com/v2/auth/authorize/` +
            `?client_key=${configData.clientKey}` +
            `&scope=${encodeURIComponent('user.info.basic,video.list')}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${state}`;
        
        console.log('Redirecting to TikTok OAuth...');
        window.location.href = authUrl;
        
    } catch (error) {
        alert('Failed to start TikTok connection: ' + error.message);
        console.error(error);
    }
}

async function handleTikTokCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDesc = urlParams.get('error_description');
    
    // Show loading
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
            <div>
                <div style="width: 50px; height: 50px; border: 3px solid rgba(254, 44, 85, 0.3); border-top-color: #fe2c55; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p>Connecting to TikTok...</p>
            </div>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
    
    if (error) {
        showError('TikTok authorization failed: ' + (errorDesc || error));
        return;
    }
    
    // Verify state matches (CSRF protection)
    const savedState = localStorage.getItem('tiktokState');
    if (!savedState || state !== savedState) {
        showError('Security error: State mismatch. Please try again.');
        return;
    }
    
    if (!code) {
        showError('No authorization code received from TikTok.');
        return;
    }
    
    // Exchange code for access token via backend
    try {
        console.log('Exchanging code for token...');
        
        const response = await fetch('/api/tiktok-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: decodeURIComponent(code),
                redirectUri: REDIRECT_URI
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (!data.access_token || !data.open_id) {
            throw new Error('Invalid response from TikTok API');
        }
        
        // Save tokens to localStorage
        localStorage.setItem('ttAccessToken', data.access_token);
        localStorage.setItem('ttOpenId', data.open_id);
        if (data.refresh_token) {
            localStorage.setItem('ttRefreshToken', data.refresh_token);
        }
        
        console.log('TikTok connected successfully!');
        
        // Redirect to main dashboard
        window.location.href = '/';
        
    } catch (error) {
        showError('Failed to complete TikTok connection: ' + error.message);
        console.error(error);
    }
}

function showError(message) {
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
            <div style="max-width: 400px;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h1 style="color: #ff6b6b; margin-bottom: 15px;">Connection Failed</h1>
                <p style="color: #888; margin-bottom: 30px; line-height: 1.6;">${message}</p>
                <button onclick="window.location.href='/'" style="background: #fe2c55; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: 600;">Back to Dashboard</button>
            </div>
        </div>
    `;
}

function toggleSettings() {
    document.getElementById('settings').classList.toggle('active');
}

function saveConfig() {
    // YouTube
    const ytApiKey = document.getElementById('ytApiKey').value.trim();
    const ytChannelId = document.getElementById('ytChannelId').value.trim();
    
    // TikTok
    const ttAccessToken = document.getElementById('ttAccessToken').value.trim();
    const ttOpenId = document.getElementById('ttOpenId').value.trim();
    
    // Save to localStorage
    if (ytApiKey) localStorage.setItem('ytApiKey', ytApiKey);
    if (ytChannelId) localStorage.setItem('ytChannelId', ytChannelId);
    if (ttAccessToken) localStorage.setItem('ttAccessToken', ttAccessToken);
    if (ttOpenId) localStorage.setItem('ttOpenId', ttOpenId);
    
    // Update config
    config = {
        youtube: { apiKey: ytApiKey, channelId: ytChannelId },
        tiktok: { accessToken: ttAccessToken, openId: ttOpenId }
    };
    
    toggleSettings();
    
    // Reload to update UI
    window.location.reload();
}

async function loadDashboard() {
    const promises = [];
    
    if (config.youtube.apiKey && config.youtube.channelId) {
        promises.push(loadYouTube().catch(e => {
            console.error('YouTube error:', e);
            document.getElementById('ytStatus').textContent = '● ERROR';
            document.getElementById('ytStatus').className = 'status error';
        }));
    }
    
    if (config.tiktok.accessToken && config.tiktok.openId) {
        promises.push(loadTikTok().catch(e => {
            console.error('TikTok error:', e);
            document.getElementById('ttStatus').textContent = '● ERROR';
            document.getElementById('ttStatus').className = 'status error';
        }));
    }
    
    await Promise.all(promises);
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

function manualRefresh() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => btn.style.transform = '', 500);
    }
    loadDashboard();
}

// YouTube Functions
async function loadYouTube() {
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${config.youtube.channelId}&key=${config.youtube.apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    
    if (!channelData.items?.length) throw new Error('YouTube channel not found');
    
    const stats = channelData.items[0].statistics;
    const snippet = channelData.items[0].snippet;
    
    // Update metrics with change indicators
    updateMetric('ytSubs', parseInt(stats.subscriberCount), previousStats.youtube.subs, 'ytSubsChange');
    updateMetric('ytViews', parseInt(stats.viewCount), previousStats.youtube.views, 'ytViewsChange');
    
    previousStats.youtube.subs = parseInt(stats.subscriberCount);
    previousStats.youtube.views = parseInt(stats.viewCount);
    
    // Load videos
    await loadYouTubeVideos();
    
    document.getElementById('ytStatus').textContent = '● LIVE';
    document.getElementById('ytStatus').className = 'status live';
}

async function loadYouTubeVideos() {
    // Get uploads playlist
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${config.youtube.channelId}&key=${config.youtube.apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Get recent videos
    const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${config.youtube.apiKey}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();
    
    const videoIds = videosData.items.map(item => item.snippet.resourceId.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${config.youtube.apiKey}`;
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json();
    
    const videos = statsData.items.map(v => ({
        ...v,
        viewCount: parseInt(v.statistics.viewCount),
        publishedAt: v.snippet.publishedAt
    }));
    
    // Top video by views
    const topVideo = videos.reduce((max, v) => v.viewCount > max.viewCount ? v : max);
    
    // Latest video by date
    const latestVideo = videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
    
    renderYouTubeVideo(topVideo, 'ytTop');
    renderYouTubeVideo(latestVideo, 'ytLatest', true);
}

function renderYouTubeVideo(video, prefix, calculateVelocity = false) {
    const thumbEl = document.getElementById(`${prefix}Thumb`);
    const titleEl = document.getElementById(`${prefix}Title`);
    const viewsEl = document.getElementById(`${prefix}Views`);
    const timeEl = document.getElementById(`${prefix}Time`);
    
    if (thumbEl) thumbEl.style.backgroundImage = `url(${video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url})`;
    if (titleEl) titleEl.textContent = video.snippet.title;
    if (viewsEl) viewsEl.textContent = formatNumber(video.viewCount) + ' views';
    if (timeEl) timeEl.textContent = timeAgo(video.publishedAt);
    
    if (calculateVelocity) {
        const hours = (Date.now() - new Date(video.publishedAt)) / (1000 * 60 * 60);
        const velocity = Math.round(video.viewCount / hours);
        const velEl = document.getElementById(`${prefix}Velocity`);
        if (velEl) velEl.textContent = `⚡ ${formatNumber(velocity)} views/hour`;
    }
}

// TikTok Functions
async function loadTikTok() {
    const baseUrl = 'https://open.tiktokapis.com/v2';
    const headers = {
        'Authorization': `Bearer ${config.tiktok.accessToken}`,
        'Content-Type': 'application/json'
    };
    
    // Get user info
    const userUrl = `${baseUrl}/user/info/?fields=follower_count,following_count,likes_count,display_name,avatar_url`;
    const userRes = await fetch(userUrl, { headers });
    const userData = await userRes.json();
    
    if (userData.error?.code !== 'ok') {
        throw new Error('TikTok auth failed: ' + (userData.error?.message || JSON.stringify(userData.error)));
    }
    
    const user = userData.data.user;
    
    // Update metrics
    updateMetric('ttFollowers', user.follower_count, previousStats.tiktok.followers, 'ttFollowersChange');
    updateMetric('ttLikes', user.likes_count, previousStats.tiktok.likes, 'ttLikesChange');
    
    const followingEl = document.getElementById('ttFollowing');
    if (followingEl) followingEl.textContent = formatNumber(user.following_count);
    
    previousStats.tiktok.followers = user.follower_count;
    previousStats.tiktok.likes = user.likes_count;
    
    // Load videos
    await loadTikTokVideos(headers);
    
    document.getElementById('ttStatus').textContent = '● LIVE';
    document.getElementById('ttStatus').className = 'status live';
}

async function loadTikTokVideos(headers) {
    const baseUrl = 'https://open.tiktokapis.com/v2';
    
    const videosUrl = `${baseUrl}/video/list/?fields=id,title,video_description,duration,create_time,like_count,comment_count,share_count,view_count,cover_image_url`;
    const videosRes = await fetch(videosUrl, { 
        headers,
        method: 'POST',
        body: JSON.stringify({ max_count: 20 })
    });
    
    const videosData = await videosRes.json();
    
    if (videosData.error?.code !== 'ok' || !videosData.data?.videos) {
        console.error('TikTok videos error:', videosData.error);
        return;
    }
    
    const videos = videosData.data.videos;
    
    // Top video by views
    const topVideo = videos.reduce((max, v) => (v.view_count || 0) > (max.view_count || 0) ? v : max);
    
    // Latest video by date
    const latestVideo = videos.sort((a, b) => b.create_time - a.create_time)[0];
    
    renderTikTokVideo(topVideo, 'ttTop');
    renderTikTokVideo(latestVideo, 'ttLatest', true);
}

function renderTikTokVideo(video, prefix, calculateVelocity = false) {
    const thumbEl = document.getElementById(`${prefix}Thumb`);
    const titleEl = document.getElementById(`${prefix}Title`);
    const viewsEl = document.getElementById(`${prefix}Views`);
    const likesEl = document.getElementById(`${prefix}Likes`);
    
    if (thumbEl) thumbEl.style.backgroundImage = `url(${video.cover_image_url})`;
    if (titleEl) titleEl.textContent = video.title || video.video_description || 'Untitled';
    if (viewsEl) viewsEl.textContent = formatNumber(video.view_count || 0) + ' views';
    if (likesEl) likesEl.textContent = formatNumber(video.like_count || 0) + ' likes';
    
    if (calculateVelocity && video.view_count) {
        const hours = (Date.now() - (video.create_time * 1000)) / (1000 * 60 * 60);
        const velocity = Math.round(video.view_count / hours);
        const velEl = document.getElementById(`${prefix}Velocity`);
        if (velEl) velEl.textContent = `⚡ ${formatNumber(velocity)} views/hour`;
    }
}

// Utility Functions
function updateMetric(elementId, value, previous, changeElementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const formatted = formatNumber(value);
    
    // Animate if changed
    if (element.textContent !== '--' && element.textContent !== formatted && element.textContent !== 'Loading...') {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#00d084';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }
    
    element.textContent = formatted;
    
    // Show change indicator
    if (changeElementId && previous > 0) {
        const change = value - previous;
        const changeEl = document.getElementById(changeElementId);
        if (!changeEl) return;
        
        if (change > 0) {
            changeEl.textContent = `+${formatNumber(change)}`;
            changeEl.className = 'metric-change';
        } else if (change < 0) {
            changeEl.textContent = formatNumber(change);
            changeEl.className = 'metric-change negative';
        } else {
            changeEl.textContent = '—';
            changeEl.className = 'metric-change';
        }
    }
}

function formatNumber(num) {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function timeAgo(timestamp) {
    const date = new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = seconds / secondsInUnit;
        if (interval >= 1) {
            return Math.floor(interval) + ` ${unit}${Math.floor(interval) > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}