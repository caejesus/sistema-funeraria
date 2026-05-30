export function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
