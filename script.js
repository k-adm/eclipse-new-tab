// script.js

// ——— 1) DOM ELEMENT REFERENCES ———
const addBtn             = document.getElementById('addShortcut');
const container          = document.getElementById('shortcutsContainer');
const modal              = document.getElementById('modal');
const modalTitle         = document.getElementById('modalTitle');
const saveBtn            = document.getElementById('saveBtn');
const cancelBtn          = document.getElementById('cancelBtn');
const deleteBtn          = document.getElementById('deleteBtn');
const nameInput          = document.getElementById('siteName');
const urlInput           = document.getElementById('siteURL');
const customizeBtn       = document.getElementById('customizeBtn');
const customizeModal     = document.getElementById('customizeModal');
const unsplashKeyInput   = document.getElementById('unsplashKeyInput');
const searchQueryInput   = document.getElementById('searchQueryInput');
const saveCustomizeBtn   = document.getElementById('saveCustomizeBtn');
const cancelCustomizeBtn = document.getElementById('cancelCustomizeBtn');
const searchForm         = document.getElementById('searchForm');
const searchIcon         = document.getElementById('searchIcon');
const searchInput        = document.getElementById('searchInput');
const suggestionsList    = document.getElementById('suggestions');
const searchContainer    = document.querySelector('.search-container');

// ——— 2) STORAGE KEYS & STATE ———
const STORAGE_KEY   = 'shortcuts';
const KEY_STORAGE   = 'unsplashKey';
const QUERY_STORAGE = 'searchQuery';

let unsplashAccessKey = '';
let searchQuery       = 'nature background';
let isEditing         = false;
let currentElement    = null;
let selectedIndex     = -1;

/**
 * Debounces a function so it only executes after the given delay.
 *
 * @param {Function} fn     - Function to debounce.
 * @param {number}   delay  - Delay in milliseconds.
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Fetches search suggestions from the Google Suggest API.
 *
 * @param {string} query  - The user's input query.
 * @returns {Promise<string[]>}
 */
async function fetchSuggestions(query) {
  try {
    const resp = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`
    );
    const [_, suggestions] = await resp.json();
    return suggestions || [];
  } catch {
    return [];
  }
}

/**
 * Highlights the suggestion at the current selectedIndex.
 *
 * @param {HTMLElement[]} items  - Array of suggestion elements.
 */
function updateHighlight(items) {
  items.forEach((el, i) => {
    if (i === selectedIndex) {
      el.classList.add('highlight');
      el.scrollIntoView({ block: 'nearest' });
      el.focus();
    } else {
      el.classList.remove('highlight');
    }
  });
}

/**
 * Generates a favicon URL for a given site URL.
 *
 * @param {string} siteUrl  - The full URL of the site.
 * @returns {?string}       - Favicon URL or null if invalid.
 */
function getFaviconUrl(siteUrl) {
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.faviconextractor.com/favicon/${host}?larger=true`;
  } catch {
    return null;
  }
}

/**
 * Fetches a random Unsplash image and sets it as the page background.
 *
 * @returns {Promise<void>}
 */
async function updateBackground() {
  try {
    if (!unsplashAccessKey) return;
    const resp = await fetch(
      `https://api.unsplash.com/search/photos?` +
      `query=${encodeURIComponent(searchQuery)}` +
      `&orientation=landscape&per_page=30`,
      { headers: { Authorization: `Client-ID ${unsplashAccessKey}` } }
    );
    const data = await resp.json();
    if (data.results && data.results.length > 0) {
      const pick = data.results[Math.floor(Math.random() * data.results.length)];
      document.body.style.backgroundImage =
        `url('${pick.urls.raw}&w=1920&h=1080&fit=crop')`;
    }
  } catch (err) {
    console.error('Unsplash fetch error:', err);
  }
}

/**
 * Saves the current favorites list to chrome.storage.local.
 *
 * @returns {void}
 */
function saveToLocalStorage() {
  const data = [...container.querySelectorAll('.shortcut')]
    .filter(el => el.id !== 'addShortcut')
    .map(el => ({
      name: el.querySelector('.shortcut-label').textContent,
      url: el.href,
    }));
  chrome.storage.local.set({ [STORAGE_KEY]: data });
}

/**
 * Loads favorites from chrome.storage.local and renders them.
 *
 * @returns {void}
 */
function loadShortcuts() {
  chrome.storage.local.get([STORAGE_KEY], result => {
    const items = result[STORAGE_KEY] || [];
    items.forEach(({ name, url }) => addShortcut(name, url));
  });
}

/**
 * Adds an edit (pencil) icon overlay to a shortcut element.
 *
 * @param {HTMLAnchorElement} el  - The shortcut anchor element.
 */
function addEditIcon(el) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg   = document.createElementNS(svgNS, 'svg');
  svg.classList.add('edit-icon');
  svg.setAttribute('viewBox', '0 0 24 24');

  const path1 = document.createElementNS(svgNS, 'path');
  path1.setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z');
  const path2 = document.createElementNS(svgNS, 'path');
  path2.setAttribute('d',
    'M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34' +
    'a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
  );

  svg.append(path1, path2);
  svg.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    openModal(true, el);
  });
  el.appendChild(svg);
}

/**
 * Opens the add/edit shortcut modal.
 *
 * @param {boolean} edit                  - True for edit mode, false for add.
 * @param {?HTMLAnchorElement} el         - The element being edited.
 */
function openModal(edit = false, el = null) {
  isEditing      = edit;
  currentElement = el;
  deleteBtn.style.display = edit ? 'inline-block' : 'none';
  modalTitle.textContent  = edit ? 'Edit Shortcut' : 'Add Shortcut';

  if (edit && el) {
    nameInput.value = el.querySelector('.shortcut-label').textContent;
    urlInput.value  = el.href;
  } else {
    nameInput.value = '';
    urlInput.value  = '';
  }

  modal.classList.remove('hidden');
}

/** Hides the add/edit shortcut modal. */
const closeModal = () => modal.classList.add('hidden');

/**
 * Creates and inserts a new shortcut into the DOM.
 *
 * @param {string} name  - Display name of the site.
 * @param {string} url   - URL of the site.
 */
function addShortcut(name, url) {
  const anchor = document.createElement('a');
  anchor.href      = url;
  anchor.className = 'shortcut';
  anchor.target    = '_self';

  const iconDiv    = document.createElement('div');
  iconDiv.className = 'shortcut-icon';
  const fav        = getFaviconUrl(url);

  if (fav) {
    const img = document.createElement('img');
    img.src   = fav;
    img.alt   = `${name} favicon`;
    iconDiv.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = name.charAt(0).toUpperCase();
    iconDiv.appendChild(span);
  }

  const labelDiv  = document.createElement('div');
  labelDiv.className = 'shortcut-label';
  labelDiv.textContent = name;

  anchor.append(iconDiv, labelDiv);
  addEditIcon(anchor);
  container.insertBefore(anchor, addBtn);
  saveToLocalStorage();
}

/**
 * Renders search suggestions as clickable <a> elements.
 *
 * @param {string[]} suggestions  - Array of suggestion strings.
 */
function renderSuggestions(suggestions) {
  suggestionsList.innerHTML = '';
  selectedIndex = -1;

  if (!suggestions.length) {
    suggestionsList.classList.add('hidden');
    return;
  }

  suggestions.forEach(text => {
    const link = document.createElement('a');
    link.className   = 'suggestion-item';
    link.href        = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    link.textContent = text;
    suggestionsList.appendChild(link);
  });

  suggestionsList.classList.remove('hidden');
}

/**
 * Inserts <link rel="dns-prefetch"> and <link rel="preload"> tags
 * for each saved favorite site into the document <head>.
 *
 * @returns {void}
 */
function prefetchAndPreload() {
  chrome.storage.local.get([STORAGE_KEY], result => {
    const items = result[STORAGE_KEY] || [];
    items.forEach(({ url }) => {
      try {
        const { hostname, protocol } = new URL(url);
        // DNS Prefetch
        const dns = document.createElement('link');
        dns.rel  = 'dns-prefetch';
        dns.href = `//${hostname}`;
        document.head.appendChild(dns);
        // Preload document
        const preload = document.createElement('link');
        preload.rel  = 'preload';
        preload.href = `${protocol}//${hostname}/`;
        preload.as   = 'document';
        document.head.appendChild(preload);
      } catch {
        // ignore invalid URLs
      }
    });
  });
}

// ——— 9) EVENT LISTENERS ———

// Save or update a shortcut
saveBtn.addEventListener('click', () => {
  let name = nameInput.value.trim();
  let url  = urlInput.value.trim();
  if (!name || !url) { alert('Enter both name and URL'); return; }
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  if (isEditing && currentElement) {
    currentElement.href = url;
    currentElement.querySelector('.shortcut-label').textContent = name;
    const icon = currentElement.querySelector('.shortcut-icon');
    icon.innerHTML = '';
    const fav = getFaviconUrl(url);

    if (fav) {
      const img = document.createElement('img');
      img.src   = fav;
      img.alt   = `${name} favicon`;
      icon.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = name.charAt(0).toUpperCase();
      icon.appendChild(span);
    }

    saveToLocalStorage();
  } else {
    addShortcut(name, url);
  }

  closeModal();
});

// Cancel or delete shortcut
cancelBtn.addEventListener('click', closeModal);
deleteBtn.addEventListener('click', () => {
  if (isEditing && currentElement) {
    currentElement.remove();
    saveToLocalStorage();
    closeModal();
  }
});

// Open "Add Shortcut" modal
addBtn.addEventListener('click', () => openModal(false));

// Customize background settings
customizeBtn.addEventListener('click', () => {
  chrome.storage.local.get([KEY_STORAGE, QUERY_STORAGE], res => {
    unsplashAccessKey = res[KEY_STORAGE] || '';
    searchQuery       = res[QUERY_STORAGE] || 'nature background';
    unsplashKeyInput.value = unsplashAccessKey;
    searchQueryInput.value = searchQuery;
    customizeModal.classList.remove('hidden');
  });
});
cancelCustomizeBtn.addEventListener('click', () => customizeModal.classList.add('hidden'));
saveCustomizeBtn.addEventListener('click', () => {
  unsplashAccessKey = unsplashKeyInput.value.trim();
  searchQuery       = searchQueryInput.value.trim() || 'nature background';
  chrome.storage.local.set({
    [KEY_STORAGE]:   unsplashAccessKey,
    [QUERY_STORAGE]: searchQuery,
  });
  customizeModal.classList.add('hidden');
  updateBackground();
});

// Handle search‐box typing
const handleInput = debounce(async () => {
  const q = searchInput.value.trim();
  if (!q) {
    suggestionsList.classList.add('hidden');
    return;
  }
  const list = await fetchSuggestions(q);
  renderSuggestions(list);
}, 300);
searchInput.addEventListener('input', handleInput);

// Arrow‐key navigation from input into suggestions
searchInput.addEventListener('keydown', e => {
  const items = [...suggestionsList.querySelectorAll('.suggestion-item')];
  if (!items.length || suggestionsList.classList.contains('hidden')) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = 0;
    updateHighlight(items);
  }
});

// Arrow‐key navigation & Enter to select within suggestions
suggestionsList.addEventListener('keydown', e => {
  const items = [...suggestionsList.querySelectorAll('.suggestion-item')];
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % items.length;
    updateHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    updateHighlight(items);
  } else if (e.key === 'Enter' && selectedIndex >= 0) {
    e.preventDefault();
    items[selectedIndex].click();
  }
});

// Hide suggestions when clicking outside
document.addEventListener('click', e => {
  if (!searchContainer.contains(e.target)) {
    suggestionsList.classList.add('hidden');
  }
});

// Search icon click → submit form in same tab
searchIcon.addEventListener('click', () => searchForm.submit());

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadShortcuts();
  chrome.storage.local.get([KEY_STORAGE, QUERY_STORAGE], res => {
    unsplashAccessKey = res[KEY_STORAGE] || '';
    searchQuery       = res[QUERY_STORAGE] || 'nature background';
    updateBackground();
    prefetchAndPreload();
  });
  container.querySelectorAll('.shortcut').forEach(el => {
    if (el.id !== 'addShortcut') addEditIcon(el);
  });
});
