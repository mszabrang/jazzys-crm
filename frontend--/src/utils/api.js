const API = import.meta.env.VITE_API_URL;

export { API };

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}