export async function onRequestGet(context) {
  const {
    request,
    env,
  } = context;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Authorization code not found', { status: 400 });
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
    }),
  });

  const data = await response.json();

  if (data.access_token) {
    return new Response(`
      <script>
        window.opener.postMessage({
          type: 'authorization-github',
          token: '${data.access_token}'
        }, window.location.origin);
        window.close();
      </script>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new Response('Authentication failed', { status: 400 });
}