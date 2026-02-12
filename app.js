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

// State tracking
const previousStats = {
    youtube: { subs: 0, views: 0 },
    tiktok: { followers: 0, likes: 0 }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSavedConfig();
    
    const hasYouTube = config.youtube.apiKey && config.youtube.channelId;
    const hasTikTok = config.tiktok.accessToken && config.tiktok.openId;
    
    if (hasYouTube || hasTikTok) {
        loadDashboard();
        setInterval(loadDashboard, 60000); // Auto-refresh every 60s
    } else {
        toggleSettings();
    }
});

function loadSavedConfig() {
    document.getElementById('ytApiKey').value = config.youtube.apiKey;
    document.getElementById('ytChannelId').value = config.youtube.channelId;
    document.getElementById('ttAccessToken').value = config.tiktok.accessToken;
    document.getElementById('ttOpenId').value = config.tiktok.openId;
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
    loadDashboard();
}

async function loadDashboard() {
    const promises = [];
    
    if (config.youtube.apiKey && config.youtube.channelId) {
        promises.push(loadYouTube().catch(e => console.error('YouTube error:', e)));
    }
    
    if (config.tiktok.accessToken && config.tiktok.openId) {
        promises.push(loadTikTok().catch(e => console.error('TikTok error:', e)));
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
    // Channel stats
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${config.youtube.channelId}&key=${config.youtube.apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    
    if (!channelData.items?.length) throw new Error('YouTube channel not found');
    
    const stats = channelData.items[0].statistics;
    
    // Update metrics
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
    
    // Latest video
    const latestVideo = videos.sort((a, b) => 
        new Date(b.publishedAt) - new Date(a.publishedAt)
    )[0];
    
    // Render
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
        document.getElementById(`${prefix}Velocity`).textContent = 
            `⚡ ${formatNumber(velocity)} views/hour`;
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
    
    // Update metrics
    updateMetric('ttFollowers', user.follower_count, previousStats.tiktok.followers, 'ttFollowersChange');
    updateMetric('ttLikes', user.likes_count, previousStats.tiktok.likes, 'ttLikesChange');
    document.getElementById('ttFollowing').textContent = formatNumber(user.following_count);
    
    previousStats.tiktok.followers = user.follower_count;
    previousStats.tiktok.likes = user.likes_count;
    
    // Load videos
    await loadTikTokVideos(headers);
    
    document.getElementById('ttStatus').textContent = '● LIVE';
    document.getElementById('ttStatus').className = 'status live';
}

async function loadTikTokVideos(headers) {
    const baseUrl = 'https://open.tiktokapis.com/v2';
    
    // Get user videos
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
    
    // Latest video
    const latestVideo = videos.sort((a, b) => b.create_time - a.create_time)[0];
    
    // Render
    renderTikTokVideo(topVideo, 'ttTop');
    renderTikTokVideo(latestVideo, 'ttLatest', true);
}

function renderTikTokVideo(video, prefix, calculateVelocity = false) {
    document.getElementById(`${prefix}Thumb`).style.backgroundImage = `url(${video.cover_image_url})`;
    document.getElementById(`${prefix}Title`).textContent = 
        video.title || video.video_description || 'Untitled';
    document.getElementById(`${prefix}Views`).textContent = formatNumber(video.view_count || 0) + ' views';
    document.getElementById(`${prefix}Likes`).textContent = formatNumber(video.like_count || 0) + ' likes';
    
    if (calculateVelocity && video.view_count) {
        const hours = (Date.now() - (video.create_time * 1000)) / (1000 * 60 * 60);
        const velocity = Math.round(video.view_count / hours);
        document.getElementById(`${prefix}Velocity`).textContent = 
            `⚡ ${formatNumber(velocity)} views/hour`;
    }
}

// Utility Functions
function updateMetric(elementId, value, previous, changeElementId) {
    const element = document.getElementById(elementId);
    const formatted = formatNumber(value);
    
    // Animate if changed
    if (element.textContent !== '--' && element.textContent !== formatted) {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#00d084';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }
    
    element.textContent = formatted;
    
    // Show change
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

function connectTikTok() {
    const clientKey = 'awhrf3ewt4e1zur1'; // From your TikTok app
    const redirectUri = encodeURIComponent('https://your-site.netlify.app/callback.html');
    const scope = 'user.info.basic,video.list';
    
    const authUrl = `https://www.tiktok.com/auth/authorize?client_key=${clientKey}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;
    
    window.location.href = authUrl;
}

// Show connect button if no token saved
if (!config.tiktok.accessToken) {
    document.getElementById('ttConnectSection').style.display = 'block';
}