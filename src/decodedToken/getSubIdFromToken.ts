import * as jwt from 'jsonwebtoken';

export function getSubIdFromToken(
  authorizationHeader: string | undefined,
): string {
  if (!authorizationHeader) {
    return 'No token found';
  }

  const token = authorizationHeader.split(' ')[1];

  if (!token) {
    return 'No token found';
  }

  try {
    const decodedToken = jwt.decode(token) as { sub: string } | null;

    if (!decodedToken || !decodedToken.sub) {
      return 'Invalid token or missing subject';
    }

    return decodedToken.sub;
  } catch (error) {
    return 'Error decoding token';
  }
}
export function getDecodedToken(
  authorizationHeader: string | undefined,
): { [key: string]: any } | string {
  if (!authorizationHeader) {
    return 'No token found';
  }

  const token = authorizationHeader.split(' ')[1];

  if (!token) {
    return 'No token found';
  }

  try {
    const decodedToken = jwt.decode(token) as { [key: string]: any } | null;

    if (!decodedToken) {
      return 'Invalid token';
    }

    return decodedToken;
  } catch (error) {
    return 'Error decoding token';
  }
}
