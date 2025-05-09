/**
 * @module main
 * Entry point script for the Eclipse New Tab extension.
 *
 * Handles rendering shortcuts, opening modals, background updates, and search suggestions.
 */
import {
    debounce,
    prefetchAndPreload,
    KEY_STORAGE,
    QUERY_STORAGE,
    FAVICON_PREFIX,
  } from './utils.js';
  import {
    getShortcuts,
    saveShortcuts,
    createShortcutElement,
  } from './shortcuts.js';
  import {
    fetchSuggestions,
    renderSuggestions,
    updateHighlight,
  } from './suggestions.js';
  import { setupModals } from './modal.js';
  
  // DOM references
  const shortcutsContainer = document.getElementById('shortcutsContainer');
  const addBtn = document.getElementById('addShortcut');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const nameInput = document.getElementById('siteName');
  const urlInput = document.getElementById('siteURL');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const searchInput = document.getElementById('searchInput');
  const suggestionsList = document.getElementById('suggestions');
  const searchIcon = document.getElementById('searchIcon');
  const searchForm = document.getElementById('searchForm');
  
  // State
  let editIndex = -1;
  let selectedIdx = -1;
  let unsplashAccessKey = '';
  let searchQueryTerms = 'nature background';
  
  // Initialize modals (Customize & Settings)
  setupModals();
  
  // Open Add Shortcut modal and reset fields
  addBtn.addEventListener('click', () => {
    editIndex = -1;
    modalTitle.textContent = 'Add Shortcut';
    nameInput.value = '';
    urlInput.value = '';
    deleteBtn.style.display = 'none';
    modal.classList.remove('hidden');
  });
  
  /**
   * Renders all saved shortcuts and appends the Add button.
   */
  async function renderShortcuts() {
    shortcutsContainer.innerHTML = '';
    const items = await getShortcuts();
  
    for (const [idx, item] of items.entries()) {
      const node = await createShortcutElement(item.name, item.url, idx);
      shortcutsContainer.appendChild(node);
    }
  
    shortcutsContainer.appendChild(addBtn);
    prefetchAndPreload();
    updateAllIcons();
  }
  
  renderShortcuts();
  
  /**
   * Replaces letter icons with cached favicons if available.
   */
  function updateAllIcons() {
    chrome.storage.local.get(null, (all) => {
      Object.entries(all).forEach(([key, favUrl]) => {
        if (!key.startsWith(FAVICON_PREFIX)) return;
        const origin = key.slice(FAVICON_PREFIX.length);
  
        shortcutsContainer.querySelectorAll('.shortcut').forEach((a) => {
          if (new URL(a.href).origin === origin && favUrl) {
            const div = a.querySelector('.shortcut-icon');
            div.innerHTML = '';
            const img = document.createElement('img');
            img.src = favUrl;
            img.alt = `${a.querySelector('.shortcut-label').textContent} favicon`;
            div.appendChild(img);
          }
        });
      });
    });
  }
  
  // Update icons when favicons change
  chrome.storage.onChanged.addListener((changes, area) => {
    if (
      area === 'local' &&
      Object.keys(changes).some((k) => k.startsWith(FAVICON_PREFIX))
    ) {
      updateAllIcons();
    }
  });
  
  // Load and apply background settings
  chrome.storage.local.get(
    [KEY_STORAGE, QUERY_STORAGE],
    ({ [KEY_STORAGE]: key, [QUERY_STORAGE]: q }) => {
      unsplashAccessKey = key || '';
      searchQueryTerms = q || 'nature background';
      updateBackground();
    }
  );
  
  /**
   * Fetches a random Unsplash image and applies it as the background.
   */
  async function updateBackground() {
    if (!unsplashAccessKey) return;
  
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?` +
          `query=${encodeURIComponent(searchQueryTerms)}` +
          `&orientation=landscape&per_page=30`,
        { headers: { Authorization: `Client-ID ${unsplashAccessKey}` } }
      );
      const data = await res.json();
  
      if (data.results?.length) {
        const pick =
          data.results[Math.floor(Math.random() * data.results.length)];
        document.body.style.backgroundImage =
          `url('${pick.urls.raw}&w=1920&h=1080&fit=crop')`;
      }
    } catch (e) {
      console.error('Background update failed', e);
    }
  }
  
  // Save new or edited shortcut
  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
  
    if (!name || !url) {
      alert('Enter both name & URL');
      return;
    }
  
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
  
    const items = await getShortcuts();
  
    if (editIndex >= 0) {
      items[editIndex] = { name, url };
    } else {
      items.push({ name, url });
    }
  
    saveShortcuts(items);
    modal.classList.add('hidden');
    renderShortcuts();
  });
  
  // Cancel modal
  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
  
  // Delete shortcut
  deleteBtn.addEventListener('click', async () => {
    if (editIndex < 0) return;
  
    const items = await getShortcuts();
    items.splice(editIndex, 1);
    saveShortcuts(items);
    modal.classList.add('hidden');
    renderShortcuts();
  });
  
  // ——— Search Suggestions ———
  
  const onInput = debounce(async () => {
    const q = searchInput.value.trim();
    if (!q) {
      suggestionsList.classList.add('hidden');
      return;
    }
  
    const list = await fetchSuggestions(q);
    selectedIdx = -1;
  
    renderSuggestions(list, suggestionsList, (text) => {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(
        text
      )}`;
    });
  }, 300);
  
  searchInput.addEventListener('input', onInput);
  searchInput.addEventListener('keydown', (e) => {
    const items = Array.from(suggestionsList.children);
    if (!items.length) return;
  
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = 0;
      updateHighlight(items, selectedIdx);
    }
  });
  
  suggestionsList.addEventListener('keydown', (e) => {
    const items = Array.from(suggestionsList.children);
  
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = (selectedIdx + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = (selectedIdx - 1 + items.length) % items.length;
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      items[selectedIdx].click();
    }
  
    updateHighlight(items, selectedIdx);
  });
  
  // Search icon click → submit
  searchIcon.addEventListener('click', () => searchForm.submit());
  