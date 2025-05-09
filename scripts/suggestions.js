// scripts/suggestions.js
import { debounce } from './utils.js';

/** Fetch Google suggestions */
export async function fetchSuggestions(q) {
  try {
    const resp = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`
    );
    const [, list] = await resp.json();
    return list || [];
  } catch {
    return [];
  }
}

/** Highlight keyboard nav index */
export function updateHighlight(items, idx) {
  items.forEach((el, i) => el.classList.toggle('highlight', i === idx));
}

/** Render suggestions as <a> */
export function renderSuggestions(list, container, onSelect) {
  container.innerHTML = '';
  if (!list.length) return container.classList.add('hidden');
  list.forEach(text => {
    const a = document.createElement('a');
    a.className   = 'suggestion-item';
    a.href        = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    a.textContent = text;
    a.addEventListener('click', () => onSelect(text));
    container.append(a);
  });
  container.classList.remove('hidden');
}
