import { createClerkClient } from '@clerk/backend';

export async function verifyUser(request, env) {
  const clerkClient = createClerkClient({
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, error: 'Authorization header is missing or malformed', status: 401 };
  }

  const token = authHeader.substring(7); // 去掉 "Bearer "

  try {
    const claims = await clerkClient.verifyToken(token);
    if (!claims.sub) {
      return { userId: null, error: 'Invalid token claims', status: 401 };
    }
    // claims.sub 就是獨一無二的 User ID
    return { userId: claims.sub, error: null, status: 200 };
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return { userId: null, error: 'Token verification failed', status: 401 };
  }
}