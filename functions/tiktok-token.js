exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { code, redirectUri } = JSON.parse(event.body);
        
        // Your TikTok app credentials (securely stored in Netlify Environment Variables)
        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        
        if (!clientKey || !clientSecret) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        // Exchange code for token
        const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
        
        const params = new URLSearchParams();
        params.append('client_key', clientKey);
        params.append('client_secret', clientSecret);
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', redirectUri);

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: params.toString()
        });

        const data = await response.json();

        if (data.error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: data.error_description || data.error })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // Or your specific domain
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                access_token: data.access_token,
                open_id: data.open_id,
                expires_in: data.expires_in,
                refresh_token: data.refresh_token,
                scope: data.scope
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};