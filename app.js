// Configuration
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

// TikTok OAuth Config - REPLACE THESE WITH YOUR VALUES
const TIKTOK_CLIENT_KEY = 'awhrf3ewt4e1zur1'; // From TikTok Developer Portal
const REDIRECT_URI = 'https://creator-dashboards.netlify.app/callback'; // Your Netlify URL

// State tracking
const previousStats = {
    youtube: { subs: 0, views: 0 },
    tiktok: { followers: 0, likes: 0 }
};

// Initialize - WAIT FOR DOM
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
    } else {
        console.log('No credentials found, showing setup');
    }
});

function loadSavedConfig() {
    document.getElementById('ytApiKey').value = config.youtube.apiKey;
    document.getElementById('ytChannelId').value = config.youtube.channelId;
    document.getElementById('ttAccessToken').value = config.tiktok.accessToken;
    document.getElementById('ttOpenId').value = config.tiktok.openId;
}

function setupConnectButtons() {
    // YouTube Connect (manual entry)
    const ytSection = document.querySelector('.platform.youtube');
    if (!config.youtube.apiKey || !config.youtube.channelId) {
        ytSection.insertAdjacentHTML('beforeend', `
            <div class="connect-prompt" style="text-align: center; padding: 30px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px;">
                <p style="color: #888; margin-bottom: 15px;">YouTube not connected</p>
                <button onclick="toggleSettings()" style="background: #ff0000; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: 600;">Connect YouTube</button>
            </div>
        `);
    }
    
    // TikTok Connect
    const ttSection = document.querySelector('.platform.tiktok');
    const hasTikTok = config.tiktok.accessToken && config.tiktok.openId;
    
    console.log('TikTok config:', { hasTikTok, token: config.tiktok.accessToken?.substring(0,10), openId: config.tiktok.openId });
    
    if (!hasTikTok) {
        // Hide metrics, show connect button
        const metricsGrid = ttSection.querySelector('.metrics-grid');
        const videosSection = ttSection.querySelector('.videos-section');
        
        if (metricsGrid) metricsGrid.style.display = 'none';
        if (videosSection) videosSection.style.display = 'none';
        
        ttSection.insertAdjacentHTML('beforeend', `
            <div class="connect-prompt" style="text-align: center; padding: 40px 20px;">
                <p style="color: #888; margin-bottom: 20px; font-size: 1.1rem;">Connect your TikTok account to see live metrics</p>
                <button onclick="connectTikTok()" style="background: #fe2c55; color: white; border: none; padding: 15px 40px; border-radius: 30px; cursor: pointer; font-weight: 600; font-size: 1.1rem; transition: all 0.3s; box-shadow: 0 4px 15px rgba(254, 44, 85, 0.3);">
                    Connect TikTok
                </button>
                <p style="color: #666; margin-top: 15px; font-size: 0.9rem;">Or <a href="#" onclick="toggleSettings(); return false;" style="color: #fe2c55;">enter token manually</a></p>
            </div>
        `);
    }
}

function connectTikTok() {
    if (TIKTOK_CLIENT_KEY === 'YOUR_CLIENT_KEY_HERE') {
        alert('Please set your TikTok Client Key in the code first!\n\n1. Go to app.js\n2. Find TIKTOK_CLIENT_KEY\n3. Replace with your actual Client Key from TikTok Developer Portal');
        return;
    }
    
    // Generate state for security
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('tiktokState', state);
    
    // Build TikTok OAuth URL (v2)
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/` +
        `?client_key=${TIKTOK_CLIENT_KEY}` +
        `&scope=${encodeURIComponent('user.info.basic,video.list')}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&state=${state}`;
    
    console.log('Redirecting to TikTok:', authUrl);
    window.location.href = authUrl;
}

function handleTikTokCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDesc = urlParams.get('error_description');
    
    if (error) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
                <div>
                    <h1 style="color: #ff6b6b; margin-bottom: 20px;">Authorization Failed</h1>
                    <p>${errorDesc || error}</p>
                    <button onclick="window.location.href='/'" style="margin-top: 30px; padding: 12px 30px; background: #fe2c55; color: white; border: none; border-radius: 25px; cursor: pointer;">Back to Dashboard</button>
                </div>
            </div>
        `;
        return;
    }
    
    if (code) {
        // Show code for manual copy (since we don't have backend yet)
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; font-family: sans-serif; text-align: center; padding: 20px;">
                <div style="max-width: 600px; width: 100%;">
                    <div style="width: 80px; height: 80px; background: #00d084; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px;">✓</div>
                    <h1 style="margin-bottom: 20px;">Authorization Code Received</h1>
                    <p style="color: #888; margin-bottom: 30px;">Copy this code and exchange it for an access token in the TikTok Developer Portal, or paste it below if you have a backend set up.</p>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 30px; word-break: break-all; font-family: monospace; font-size: 0.9rem; color: #fe2c55;">
                        ${code}
                    </div>
                    
                    <button onclick="navigator.clipboard.writeText('${code}'); this.textContent='Copied!';" style="background: #fe2c55; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: 600; margin-right: 10px;">Copy Code</button>
                    <button onclick="window.location.href='/'" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); padding: 12px 30px; border-radius: 25px; cursor: pointer;">Go to Dashboard</button>
                    
                    <div style="margin-top: 40px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; text-align: left;">
                        <h3 style="margin-bottom: 15px; color: #fff;">Next Steps:</h3>
                        <ol style="color: #aaa; padding-left: 20px; line-height: 2;">
                            <li>Copy the code above</li>
                            <li>Go to <a href="https://developers.tiktok.com/" target="_blank" style="color: #fe2c55;">TikTok Developer Portal</a></li>
                            <li>Open your app → API Explorer</li>
                            <li>Use "Get access token" with the authorization code</li>
                            <li>Copy the access_token from the response</li>
                            <li>Paste it in your dashboard settings</li>
                        </ol>
                    </div>
                </div>
            </div>
        `;
        
        // Store code temporarily
        localStorage.setItem('tiktokPendingCode', code);
    }
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
    
    config = {
        youtube: { apiKey: ytApiKey, channelId: ytChannelId },
        tiktok: { accessToken: ttAccessToken, openId: ttOpenId }
    };
    
    toggleSettings();
    
    // Reload page to show/hide connect buttons properly
    window.location.reload();
}

async function loadDashboard() {
    const promises = [];
    
    if (config.youtube.apiKey && config.youtube.channelId) {
        promises.push(loadYouTube().catch(e => {
            console.error('YouTube error:', e);
            document.getElementById('ytStatus').textContent = '● ERROR';
            document.getElementById('ytStatus').style.color = '#ff6b6b';
        }));
    }
    
    if (config.tiktok.accessToken && config.tiktok.openId) {
        promises.push(loadTikTok().catch(e => {
            console.error('TikTok error:', e);
            document.getElementById('ttStatus').textContent = '● ERROR';
            document.getElementById('ttStatus').style.color = '#ff6b6b';
        }));
    }
    
    await Promise.all(promises);
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

function manualRefresh() {
    const btn = document.querySelector('.refresh-btn');
    btn.style.transform = 'rotate(360deg)';
    setTimeout(() => btn.style.transform = '', 500);
    loadDashboard();
}

// YouTube Functions
async function loadYouTube() {
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${config.youtube.channelId}&key=${config.youtube.apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    
    if (!channelData.items?.length) throw new Error('YouTube channel not found');
    
    const stats = channelData.items[0].statistics;
    
    updateMetric('ytSubs', parseInt(stats.subscriberCount), previousStats.youtube.subs, 'ytSubsChange');
    updateMetric('ytViews', parseInt(stats.viewCount), previousStats.youtube.views, 'ytViewsChange');
    
    previousStats.youtube.subs = parseInt(stats.subscriberCount);
    previousStats.youtube.views = parseInt(stats.viewCount);
    
    await loadYouTubeVideos();
    
    document.getElementById('ytStatus').textContent = '● LIVE';
    document.getElementById('ytStatus').className = 'status live';
}

async function loadYouTubeVideos() {
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${config.youtube.channelId}&key=${config.youtube.apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
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
    
    const topVideo = videos.reduce((max, v) => v.viewCount > max.viewCount ? v : max);
    const latestVideo = videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
    
    renderYouTubeVideo(topVideo, 'ytTop');
    renderYouTubeVideo(latestVideo, 'ytLatest', true);
}

function renderYouTubeVideo(video, prefix, calculateVelocity = false) {
    document.getElementById(`${prefix}Thumb`).style.backgroundImage = 
        `url(${video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url})`;
    document.getElementById(`${prefix}Title`).textContent = video.snippet.title;
    document.getElementById(`${prefix}Views`).textContent = formatNumber(video.viewCount) + ' views';
    document.getElementById(`${prefix}Time`).textContent = timeAgo(video.publishedAt);
    
    if (calculateVelocity) {
        const hours = (Date.now() - new Date(video.publishedAt)) / (1000 * 60 * 60);
        const velocity = Math.round(video.viewCount / hours);
        document.getElementById(`${prefix}Velocity`).textContent = `⚡ ${formatNumber(velocity)} views/hour`;
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
    const userUrl = `${baseUrl}/user/info/?fields=follower_count,following_count,likes_count,display_name`;
    const userRes = await fetch(userUrl, { headers });
    const userData = await userRes.json();
    
    if (userData.error?.code !== 'ok') {
        throw new Error('TikTok auth failed: ' + userData.error?.message);
    }
    
    const user = userData.data.user;
    
    updateMetric('ttFollowers', user.follower_count, previousStats.tiktok.followers, 'ttFollowersChange');
    updateMetric('ttLikes', user.likes_count, previousStats.tiktok.likes, 'ttLikesChange');
    document.getElementById('ttFollowing').textContent = formatNumber(user.following_count);
    
    previousStats.tiktok.followers = user.follower_count;
    previousStats.tiktok.likes = user.likes_count;
    
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
    
    const topVideo = videos.reduce((max, v) => (v.view_count || 0) > (max.view_count || 0) ? v : max);
    const latestVideo = videos.sort((a, b) => b.create_time - a.create_time)[0];
    
    renderTikTokVideo(topVideo, 'ttTop');
    renderTikTokVideo(latestVideo, 'ttLatest', true);
}

function renderTikTokVideo(video, prefix, calculateVelocity = false) {
    document.getElementById(`${prefix}Thumb`).style.backgroundImage = `url(${video.cover_image_url})`;
    document.getElementById(`${prefix}Title`).textContent = video.title || video.video_description || 'Untitled';
    document.getElementById(`${prefix}Views`).textContent = formatNumber(video.view_count || 0) + ' views';
    document.getElementById(`${prefix}Likes`).textContent = formatNumber(video.like_count || 0) + ' likes';
    
    if (calculateVelocity && video.view_count) {
        const hours = (Date.now() - (video.create_time * 1000)) / (1000 * 60 * 60);
        const velocity = Math.round(video.view_count / hours);
        document.getElementById(`${prefix}Velocity`).textContent = `⚡ ${formatNumber(velocity)} views/hour`;
    }
}

// Utility Functions
function updateMetric(elementId, value, previous, changeElementId) {
    const element = document.getElementById(elementId);
    const formatted = formatNumber(value);
    
    if (element.textContent !== '--' && element.textContent !== formatted && element.textContent !== 'Loading...') {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#00d084';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }
    
    element.textContent = formatted;
    
    if (changeElementId && previous > 0) {
        const change = value - previous;
        const changeEl = document.getElementById(changeElementId);
        
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
    if (!num) return '0';
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