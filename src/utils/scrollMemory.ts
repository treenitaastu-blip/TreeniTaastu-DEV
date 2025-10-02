const SCROLL_KEY = 'reads_list_scroll';

export function saveScrollPosition(position: number): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, position.toString());
  } catch (error) {
    // Ignoreeri sessionStorage vigu
    console.warn('Could not save scroll position:', error);
  }
}

export function restoreScrollPosition(): number {
  try {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    return saved ? parseInt(saved, 10) : 0;
  } catch (error) {
    // Ignoreeri sessionStorage vigu
    console.warn('Could not restore scroll position:', error);
    return 0;
  }
}

export function clearScrollPosition(): void {
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch (error) {
    console.warn('Could not clear scroll position:', error);
  }
}