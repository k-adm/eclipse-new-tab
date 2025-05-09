// scripts/shortcuts.js
import { STORAGE_KEY, FAVICON_PREFIX } from './utils.js';

/** Persist the favorites array */
export function saveShortcuts(items) {
  chrome.storage.local.set({ [STORAGE_KEY]: items });
}

/** Retrieve the favorites array */
export function getShortcuts() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], ({ [STORAGE_KEY]: items = [] }) => {
      resolve(items);
    });
  });
}

/**
 * Creates a DOM element for one shortcut,
 * including a letter icon, cached favicon swap,
 * plus an edit-pencil that dispatches `edit-shortcut`.
 *
 * @param {string} name
 * @param {string} url
 * @param {number} index
 * @returns {HTMLAnchorElement}
 */
export async function createShortcutElement(name, url, index) {
  const anchor = document.createElement('a');
  anchor.href      = url;
  anchor.className = 'shortcut';
  anchor.target    = '_self';

  // icon div
  const iconDiv = document.createElement('div');
  iconDiv.className = 'shortcut-icon';
  // first-letter fallback
  const letter = document.createElement('span');
  letter.textContent = name.charAt(0).toUpperCase();
  iconDiv.appendChild(letter);

  // try to swap with cached favicon
  const originKey = FAVICON_PREFIX + new URL(url).origin;
  chrome.storage.local.get([originKey], ({ [originKey]: favUrl }) => {
    if (favUrl) {
      iconDiv.innerHTML = '';
      const img = document.createElement('img');
      img.src = favUrl;
      img.alt = `${name} favicon`;
      iconDiv.appendChild(img);
    }
  });

  // edit pencil
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg   = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('edit-icon');
  const p1 = document.createElementNS(svgNS, 'path');
  p1.setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z');
  const p2 = document.createElementNS(svgNS, 'path');
  p2.setAttribute('d', 'M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z');
  svg.append(p1, p2);
  svg.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('edit-shortcut', {
      detail: { index, name, url }
    }));
  });

  // label
  const label = document.createElement('div');
  label.className = 'shortcut-label';
  label.textContent = name;

  anchor.append(iconDiv, label, svg);
  return anchor;
}
