/**
 * Eclipse New Tab - A customizable new tab page with shortcuts
 * 
 * This script handles all the functionality for the new tab page including:
 * - Managing shortcuts (add, edit, delete, drag-and-drop)
 * - Search suggestions
 * - Background images via Unsplash
 * - IP information display
 * - Settings management
 */

// ——— CONSTANTS ———
const STORAGE_KEYS = {
  SHORTCUTS: 'shortcuts',
  UNSPLASH_KEY: 'unsplashKey',
  SEARCH_QUERY: 'searchQuery',
  IPIFY_KEY: 'ipifyKey',
};

// ——— DOM ELEMENT REFERENCES ———
const elements = {
  // Shortcuts
  addBtn: document.getElementById('addShortcut'),
  container: document.getElementById('shortcutsContainer'),
  
  // Shortcut Modal
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  nameInput: document.getElementById('siteName'),
  urlInput: document.getElementById('siteURL'),
  
  // Customize Modal
  customizeBtn: document.getElementById('customizeBtn'),
  customizeModal: document.getElementById('customizeModal'),
  unsplashKeyInput: document.getElementById('unsplashKeyInput'),
  searchQueryInput: document.getElementById('searchQueryInput'),
  saveCustomizeBtn: document.getElementById('saveCustomizeBtn'),
  cancelCustomizeBtn: document.getElementById('cancelCustomizeBtn'),
  
  // Settings Modal
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  ipifyKeyInput: document.getElementById('ipifyKeyInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  resetFaviconsBtn: document.getElementById('resetFaviconsBtn'),
  
  // Search
  searchForm: document.getElementById('searchForm'),
  searchIcon: document.getElementById('searchIcon'),
  searchInput: document.getElementById('searchInput'),
  suggestionsList: document.getElementById('suggestions'),
  searchContainer: document.querySelector('.search-container'),
  
  // IP Info
  ipAddress: document.getElementById('ipAddress'),
  location: document.getElementById('location'),
};

// ——— STATE ———
const state = {
  unsplashAccessKey: '',
  searchQuery: 'nature background',
  ipifyKey: '',
  isEditing: false,
  currentElement: null,
  selectedIndex: -1,
  draggedItem: null,
};

// ——— UTILITY FUNCTIONS ———

/**
 * Debounces a function so it only executes after the given delay.
 *
 * @param {Function} fn - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function} - Debounced function.
 */
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Gets a value from chrome.storage.local.
 *
 * @param {string} key - Storage key.
 * @param {*} defaultValue - Default value if key doesn't exist.
 * @returns {Promise<*>} - Retrieved value or default.
 */
const getStorageValue = async (key, defaultValue) => {
  const result = await chrome.storage.local.get([key]);
  return result[key] || defaultValue;
};

/**
 * Sets a value in chrome.storage.local.
 *
 * @param {string} key - Storage key.
 * @param {*} value - Value to store.
 * @returns {Promise<void>}
 */
const setStorageValue = async (key, value) => {
  await chrome.storage.local.set({ [key]: value });
};

// ——— FAVICON MANAGEMENT ———

/**
 * Gets the favicon URL for a given site URL.
 *
 * @param {string} siteUrl - The full URL of the site.
 * @returns {Promise<?string>} - Favicon URL or null if not found.
 */
const getFaviconUrl = async (siteUrl) => {
  try {
    const host = new URL(siteUrl).hostname;
    const key = `favicon_${host}`;
    return await getStorageValue(key, null);
  } catch {
    return null;
  }
};

/**
 * Stores the favicon URL for a given site in chrome.storage.local.
 *
 * @param {string} siteUrl - The full URL of the site.
 * @param {string} faviconUrl - The favicon URL to store.
 * @returns {Promise<void>}
 */
const storeFavicon = async (siteUrl, faviconUrl) => {
  try {
    const host = new URL(siteUrl).hostname;
    await setStorageValue(`favicon_${host}`, faviconUrl);
  } catch {
    // Ignore invalid URLs
  }
};

/**
 * Resets all stored favicons and updates the UI.
 *
 * @returns {Promise<void>}
 */
const resetFavicons = async () => {
  try {
    // Get all stored keys
    const result = await chrome.storage.local.get(null);
    
    // Filter out favicon keys and remove them
    const faviconKeys = Object.keys(result).filter(key => key.startsWith('favicon_'));
    await chrome.storage.local.remove(faviconKeys);
    
    // Refresh all shortcuts to show first letters
    const shortcuts = [...elements.container.querySelectorAll('.shortcut')]
      .filter(el => el.id !== 'addShortcut');
    
    shortcuts.forEach((shortcut) => {
      const name = shortcut.querySelector('.shortcut-label').textContent;
      const iconDiv = shortcut.querySelector('.shortcut-icon');
      
      iconDiv.innerHTML = '';
      const span = document.createElement('span');
      span.textContent = name.charAt(0).toUpperCase();
      iconDiv.appendChild(span);
    });
  } catch (err) {
    console.error('Error resetting favicons:', err);
  }
};

// ——— BACKGROUND IMAGE ———

/**
 * Fetches a random Unsplash image and sets it as the page background.
 *
 * @returns {Promise<void>}
 */
const updateBackground = async () => {
  try {
    if (!state.unsplashAccessKey) return;
    
    const resp = await fetch(
      `https://api.unsplash.com/search/photos?` +
      `query=${encodeURIComponent(state.searchQuery)}` +
      `&orientation=landscape&per_page=30`,
      { headers: { Authorization: `Client-ID ${state.unsplashAccessKey}` } }
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
};

// ——— IP INFORMATION ———

/**
 * Fetches IP and location information from ipify API.
 * 
 * @returns {Promise<void>}
 */
const fetchIpInfo = async () => {
  try {
    if (!state.ipifyKey) return;
    
    const response = await fetch(
      `https://geo.ipify.org/api/v2/country,city?apiKey=${state.ipifyKey}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch IP info');
    }
    
    const data = await response.json();
    elements.ipAddress.textContent = data.ip;
    elements.location.textContent = `${data.location.city}, ${data.location.country}`;
  } catch (err) {
    console.error('Error fetching IP info:', err);
    elements.ipAddress.textContent = 'IP info unavailable';
    elements.location.textContent = '';
  }
};

// ——— SHORTCUTS MANAGEMENT ———

/**
 * Saves the current favorites list to chrome.storage.local.
 *
 * @returns {Promise<void>}
 */
const saveToLocalStorage = async () => {
  const data = [...elements.container.querySelectorAll('.shortcut')]
    .filter(el => el.id !== 'addShortcut')
    .map(el => ({
      name: el.querySelector('.shortcut-label').textContent,
      url: el.href,
    }));
    
  await setStorageValue(STORAGE_KEYS.SHORTCUTS, data);
};

/**
 * Loads favorites from chrome.storage.local and renders them.
 *
 * @returns {Promise<void>}
 */
const loadShortcuts = async () => {
  const items = await getStorageValue(STORAGE_KEYS.SHORTCUTS, []);
  const promises = items.map(({ name, url }) => addShortcut(name, url));
  await Promise.all(promises);
};

/**
 * Adds an edit (pencil) icon overlay to a shortcut element.
 *
 * @param {HTMLAnchorElement} el - The shortcut anchor element.
 */
const addEditIcon = (el) => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('edit-icon');
  svg.setAttribute('viewBox', '0 0 24 24');

  const path1 = document.createElementNS(svgNS, 'path');
  path1.setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z');
  
  const path2 = document.createElementNS(svgNS, 'path');
  path2.setAttribute(
    'd',
    'M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34' +
    'a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
  );

  svg.append(path1, path2);
  svg.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal(true, el);
  });
  
  el.appendChild(svg);
};

/**
 * Opens the add/edit shortcut modal.
 *
 * @param {boolean} edit - True for edit mode, false for add.
 * @param {?HTMLAnchorElement} el - The element being edited.
 */
const openModal = (edit = false, el = null) => {
  state.isEditing = edit;
  state.currentElement = el;
  elements.deleteBtn.style.display = edit ? 'inline-block' : 'none';
  elements.modalTitle.textContent = edit ? 'Edit Shortcut' : 'Add Shortcut';

  if (edit && el) {
    elements.nameInput.value = el.querySelector('.shortcut-label').textContent;
    elements.urlInput.value = el.href;
  } else {
    elements.nameInput.value = '';
    elements.urlInput.value = '';
  }

  elements.modal.classList.remove('hidden');
};

/**
 * Hides the add/edit shortcut modal.
 */
const closeModal = () => elements.modal.classList.add('hidden');

/**
 * Creates and inserts a new shortcut into the DOM.
 *
 * @param {string} name - Display name of the site.
 * @param {string} url - URL of the site.
 * @returns {Promise<HTMLAnchorElement>} - The created shortcut element.
 */
const addShortcut = async (name, url) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.className = 'shortcut';
  anchor.target = '_self';
  anchor.draggable = true;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'shortcut-icon';
  
  try {
    const faviconUrl = await getFaviconUrl(url);
    
    if (faviconUrl) {
      const img = document.createElement('img');
      img.src = faviconUrl;
      img.alt = `${name} favicon`;
      iconDiv.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = name.charAt(0).toUpperCase();
      iconDiv.appendChild(span);
    }
  } catch {
    const span = document.createElement('span');
    span.textContent = name.charAt(0).toUpperCase();
    iconDiv.appendChild(span);
  }

  const labelDiv = document.createElement('div');
  labelDiv.className = 'shortcut-label';
  labelDiv.textContent = name;

  anchor.append(iconDiv, labelDiv);
  addEditIcon(anchor);
  elements.container.insertBefore(anchor, elements.addBtn);
  await saveToLocalStorage();

  // Add drag event listeners
  anchor.addEventListener('dragstart', handleDragStart);
  anchor.addEventListener('dragend', handleDragEnd);
  anchor.addEventListener('dragover', handleDragOver);
  anchor.addEventListener('drop', handleDrop);
  
  return anchor;
};

// ——— DRAG AND DROP FUNCTIONALITY ———

/**
 * Handles the dragstart event for shortcuts.
 * 
 * @param {DragEvent} e - The drag event.
 */
const handleDragStart = function(e) {
  state.draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ''); // Required for Firefox
};

/**
 * Handles the dragend event for shortcuts.
 */
const handleDragEnd = function() {
  this.classList.remove('dragging');
  state.draggedItem = null;
};

/**
 * Handles the dragover event for shortcuts.
 * 
 * @param {DragEvent} e - The drag event.
 * @returns {boolean} - Always returns false to prevent default behavior.
 */
const handleDragOver = function(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
};

/**
 * Handles the drop event for shortcuts.
 * 
 * @param {DragEvent} e - The drag event.
 * @returns {boolean} - Always returns false to prevent default behavior.
 */
const handleDrop = function(e) {
  e.preventDefault();
  if (state.draggedItem === this) return false;

  const allItems = [...elements.container.querySelectorAll('.shortcut')];
  const draggedIndex = allItems.indexOf(state.draggedItem);
  const droppedIndex = allItems.indexOf(this);

  if (draggedIndex < droppedIndex) {
    elements.container.insertBefore(state.draggedItem, this.nextSibling);
  } else {
    elements.container.insertBefore(state.draggedItem, this);
  }

  saveToLocalStorage();
  return false;
};

// ——— SEARCH SUGGESTIONS ———

/**
 * Fetches search suggestions from the Google Suggest API.
 *
 * @param {string} query - The user's input query.
 * @returns {Promise<string[]>} - Array of suggestion strings.
 */
const fetchSuggestions = async (query) => {
  try {
    const resp = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`
    );
    const [_, suggestions] = await resp.json();
    return suggestions || [];
  } catch {
    return [];
  }
};

/**
 * Highlights the suggestion at the current selectedIndex.
 *
 * @param {HTMLElement[]} items - Array of suggestion elements.
 */
const updateHighlight = (items) => {
  items.forEach((el, i) => {
    if (i === state.selectedIndex) {
      el.classList.add('highlight');
      el.scrollIntoView({ block: 'nearest' });
      el.focus();
    } else {
      el.classList.remove('highlight');
    }
  });
};

/**
 * Renders search suggestions as clickable <a> elements.
 *
 * @param {string[]} suggestions - Array of suggestion strings.
 */
const renderSuggestions = (suggestions) => {
  elements.suggestionsList.innerHTML = '';
  state.selectedIndex = -1;

  if (!suggestions.length) {
    elements.suggestionsList.classList.add('hidden');
    return;
  }

  suggestions.forEach((text) => {
    const link = document.createElement('a');
    link.className = 'suggestion-item';
    link.href = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    link.textContent = text;
    elements.suggestionsList.appendChild(link);
  });

  elements.suggestionsList.classList.remove('hidden');
};

/**
 * Inserts <link rel="dns-prefetch"> and <link rel="preconnect"> tags
 * for each saved favorite site into the document <head>.
 *
 * @returns {Promise<void>}
 */
const prefetchAndPreload = async () => {
  const items = await getStorageValue(STORAGE_KEYS.SHORTCUTS, []);
  
  items.forEach(({ url }) => {
    try {
      const { hostname, protocol } = new URL(url);
      
      // DNS Prefetch
      const dns = document.createElement('link');
      dns.rel = 'dns-prefetch';
      dns.href = `//${hostname}`;
      document.head.appendChild(dns);
      
      // Preconnect
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = `${protocol}//${hostname}`;
      preconnect.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect);
    } catch {
      // Ignore invalid URLs
    }
  });
};

// ——— EVENT HANDLERS ———

/**
 * Handles input in the search box and fetches suggestions.
 */
const handleSearchInput = debounce(async () => {
  const query = elements.searchInput.value.trim();
  
  if (!query) {
    elements.suggestionsList.classList.add('hidden');
    return;
  }
  
  const suggestions = await fetchSuggestions(query);
  renderSuggestions(suggestions);
}, 300);

/**
 * Initializes the application.
 */
const initialize = async () => {
  // Load shortcuts
  await loadShortcuts();
  
  // Load settings
  state.unsplashAccessKey = await getStorageValue(STORAGE_KEYS.UNSPLASH_KEY, '');
  state.searchQuery = await getStorageValue(STORAGE_KEYS.SEARCH_QUERY, 'nature background');
  state.ipifyKey = await getStorageValue(STORAGE_KEYS.IPIFY_KEY, '');
  
  // Initialize UI
  updateBackground();
  prefetchAndPreload();
  fetchIpInfo();
  
  // Add edit icons to existing shortcuts
  elements.container.querySelectorAll('.shortcut').forEach((el) => {
    if (el.id !== 'addShortcut') addEditIcon(el);
  });
};

// ——— EVENT LISTENERS ———

// Save or update a shortcut
elements.saveBtn.addEventListener('click', async () => {
  const name = elements.nameInput.value.trim();
  let url = elements.urlInput.value.trim();
  
  if (!name || !url) {
    alert('Enter both name and URL');
    return;
  }
  
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  if (state.isEditing && state.currentElement) {
    state.currentElement.href = url;
    state.currentElement.querySelector('.shortcut-label').textContent = name;
    
    const icon = state.currentElement.querySelector('.shortcut-icon');
    icon.innerHTML = '';
    const fav = await getFaviconUrl(url);

    if (fav) {
      const img = document.createElement('img');
      img.src = fav;
      img.alt = `${name} favicon`;
      icon.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = name.charAt(0).toUpperCase();
      icon.appendChild(span);
    }

    await saveToLocalStorage();
  } else {
    await addShortcut(name, url);
  }

  closeModal();
});

// Cancel button click
elements.cancelBtn.addEventListener('click', closeModal);

// Delete button click
elements.deleteBtn.addEventListener('click', async () => {
  if (state.isEditing && state.currentElement) {
    state.currentElement.remove();
    await saveToLocalStorage();
    closeModal();
  }
});

// Open "Add Shortcut" modal
elements.addBtn.addEventListener('click', () => openModal(false));

// Customize background settings
elements.customizeBtn.addEventListener('click', async () => {
  elements.unsplashKeyInput.value = state.unsplashAccessKey;
  elements.searchQueryInput.value = state.searchQuery;
  elements.customizeModal.classList.remove('hidden');
});

// Cancel customize button click
elements.cancelCustomizeBtn.addEventListener('click', () => {
  elements.customizeModal.classList.add('hidden');
});

// Save customize button click
elements.saveCustomizeBtn.addEventListener('click', async () => {
  state.unsplashAccessKey = elements.unsplashKeyInput.value.trim();
  state.searchQuery = elements.searchQueryInput.value.trim() || 'nature background';
  
  await setStorageValue(STORAGE_KEYS.UNSPLASH_KEY, state.unsplashAccessKey);
  await setStorageValue(STORAGE_KEYS.SEARCH_QUERY, state.searchQuery);
  
  elements.customizeModal.classList.add('hidden');
  updateBackground();
});

// Search input event
elements.searchInput.addEventListener('input', handleSearchInput);

// Arrow key navigation from input into suggestions
elements.searchInput.addEventListener('keydown', (e) => {
  const items = [...elements.suggestionsList.querySelectorAll('.suggestion-item')];
  
  if (!items.length || elements.suggestionsList.classList.contains('hidden')) {
    return;
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.selectedIndex = 0;
    updateHighlight(items);
  }
});

// Arrow key navigation & Enter to select within suggestions
elements.suggestionsList.addEventListener('keydown', (e) => {
  const items = [...elements.suggestionsList.querySelectorAll('.suggestion-item')];
  
  if (!items.length) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.selectedIndex = (state.selectedIndex + 1) % items.length;
    updateHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.selectedIndex = (state.selectedIndex - 1 + items.length) % items.length;
    updateHighlight(items);
  } else if (e.key === 'Enter' && state.selectedIndex >= 0) {
    e.preventDefault();
    items[state.selectedIndex].click();
  }
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!elements.searchContainer.contains(e.target)) {
    elements.suggestionsList.classList.add('hidden');
  }
});

// Search icon click → submit form in same tab
elements.searchIcon.addEventListener('click', () => elements.searchForm.submit());

// Settings button click → open settings modal
elements.settingsBtn.addEventListener('click', () => {
  elements.ipifyKeyInput.value = state.ipifyKey;
  elements.settingsModal.classList.remove('hidden');
});

// Cancel settings button click → close settings modal
elements.cancelSettingsBtn.addEventListener('click', () => {
  elements.settingsModal.classList.add('hidden');
});

// Save settings button click → save settings and close modal
elements.saveSettingsBtn.addEventListener('click', async () => {
  state.ipifyKey = elements.ipifyKeyInput.value.trim();
  await setStorageValue(STORAGE_KEYS.IPIFY_KEY, state.ipifyKey);
  elements.settingsModal.classList.add('hidden');
  fetchIpInfo(); // Update IP info when API key is saved
});

// Reset favicons button click → reset favicons
elements.resetFaviconsBtn.addEventListener('click', resetFavicons);

// Initialize on page load
document.addEventListener('DOMContentLoaded', initialize);
