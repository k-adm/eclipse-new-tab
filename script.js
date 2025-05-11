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
  TABS: 'tabs',
  ACTIVE_TAB: 'activeTab',
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

  // Tabs
  tabsContainer: null, // Will be created dynamically
  addTabBtn: null,     // Will be created dynamically
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
  tabs: [],
  activeTabId: null,
  currentTabId: null,
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
      id: el.dataset.shortcutId,
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
  
  // Find the Ungrouped tab
  const ungroupedTab = state.tabs.find(tab => tab.name === "Ungrouped");
  
  // Create a map of existing tab assignments
  const existingTabAssignments = new Map();
  state.tabs.forEach(tab => {
    if (tab.shortcuts && tab.shortcuts.length > 0) {
      tab.shortcuts.forEach(shortcutId => {
        existingTabAssignments.set(shortcutId, tab.id);
      });
    }
  });
  
  // Clear existing tab shortcut assignments - we'll rebuild them
  state.tabs.forEach(tab => {
    tab.shortcuts = [];
  });
  
  const promises = items.map(({ id, name, url }) => {
    // Use existing ID if available, otherwise generate a new one
    const shortcutId = id || Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.className = 'shortcut';
    anchor.target = '_self';
    anchor.draggable = true;
    anchor.dataset.shortcutId = shortcutId;

    const iconDiv = document.createElement('div');
    iconDiv.className = 'shortcut-icon';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'shortcut-label';
    labelDiv.textContent = name;

    anchor.append(iconDiv, labelDiv);
    addEditIcon(anchor);
    elements.container.insertBefore(anchor, elements.addBtn);

    // Add drag event listeners
    anchor.addEventListener('dragstart', handleDragStart);
    anchor.addEventListener('dragend', handleDragEnd);
    anchor.addEventListener('dragover', handleDragOver);
    anchor.addEventListener('drop', handleDrop);
    
    // Try to load favicon
    (async () => {
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
    })();
    
    // Determine which tab this shortcut belongs to
    if (existingTabAssignments.has(shortcutId)) {
      // Add to the tab it was previously assigned to
      const tabId = existingTabAssignments.get(shortcutId);
      const tab = state.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.shortcuts.push(shortcutId);
      } else if (ungroupedTab) {
        // If the tab no longer exists, add to Ungrouped
        ungroupedTab.shortcuts.push(shortcutId);
      }
    } else if (ungroupedTab) {
      // Default for new shortcuts: add to Ungrouped tab
      ungroupedTab.shortcuts.push(shortcutId);
    }
    
    return anchor;
  });
  
  await Promise.all(promises);
  
  // Save the tabs with the updated shortcuts
  await saveTabs();
  
  // Update which shortcuts are displayed
  updateVisibleShortcuts();
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

  // Update tab selection in modal
  updateShortcutModal();
  
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
 * @param {?string} targetTabId - Optional specific tab ID to add the shortcut to.
 * @returns {Promise<HTMLAnchorElement>} - The created shortcut element.
 */
const addShortcut = async (name, url, targetTabId = null) => {
  const shortcutId = Date.now().toString();
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.className = 'shortcut';
  anchor.target = '_self';
  anchor.draggable = true;
  anchor.dataset.shortcutId = shortcutId;

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

  // Add shortcut to the specified tab or the active tab
  const tabId = targetTabId || state.activeTabId;
  if (tabId) {
    const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex !== -1) {
      state.tabs[tabIndex].shortcuts.push(shortcutId);
      await saveTabs();
    }
  } else {
    // If no tab is specified or active, add to Ungrouped
    const ungroupedTab = state.tabs.find(tab => tab.name === "Ungrouped");
    if (ungroupedTab) {
      ungroupedTab.shortcuts.push(shortcutId);
      await saveTabs();
    }
  }
  
  await saveToLocalStorage();

  // Add drag event listeners
  anchor.addEventListener('dragstart', handleDragStart);
  anchor.addEventListener('dragend', handleDragEnd);
  anchor.addEventListener('dragover', handleDragOver);
  anchor.addEventListener('drop', handleDrop);
  
  // Update visibility based on active tab
  updateVisibleShortcuts();
  
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

// ——— TAB MANAGEMENT ———

/**
 * Creates the tabs container and adds it to the DOM
 * @returns {void}
 */
const createTabsContainer = () => {
  // Create tabs container
  const tabsRow = document.createElement('div');
  tabsRow.className = 'tabs-container';
  tabsRow.id = 'tabsContainer';
  
  // Style it with more visible styles
  tabsRow.style.display = 'flex';
  tabsRow.style.justifyContent = 'center';
  tabsRow.style.gap = '16px';
  tabsRow.style.marginTop = '20px';
  tabsRow.style.marginBottom = '20px'; 
  tabsRow.style.width = '100%';
  tabsRow.style.maxWidth = '1000px';
  tabsRow.style.overflowX = 'auto';
  tabsRow.style.padding = '12px 0';
  tabsRow.style.borderRadius = '8px';
  
  // Create add tab button
  const addTabBtn = document.createElement('button');
  addTabBtn.textContent = '+ New Tab';
  addTabBtn.className = 'tab-button add-tab';
  addTabBtn.style.background = 'rgba(138, 180, 248, 0.3)';
  addTabBtn.style.border = 'none';
  addTabBtn.style.borderRadius = '12px';
  addTabBtn.style.padding = '8px 16px';
  addTabBtn.style.cursor = 'pointer';
  addTabBtn.style.color = '#e8eaed';
  addTabBtn.style.fontWeight = '600';
  addTabBtn.style.fontSize = '13px';
  
  // Add the tab button to the tabs container
  tabsRow.appendChild(addTabBtn);
  
  // Create a wrapper if needed
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.justifyContent = 'center';
  wrapper.style.width = '100%';
  wrapper.appendChild(tabsRow);
  
  // Insert after the shortcuts container
  if (elements.container) {
    elements.container.parentNode.insertBefore(wrapper, elements.container.nextSibling);
  }
  
  // Store references
  elements.tabsContainer = tabsRow;
  elements.addTabBtn = addTabBtn;
  
  console.log('Tabs container created:', tabsRow); // Debugging
};

/**
 * Opens a modal to add or edit a tab
 * @param {boolean} edit - Whether we're editing an existing tab
 * @param {string} tabId - ID of the tab to edit
 */
const openAddTabModal = (edit = false, tabId = null) => {
  // Store the current tab ID in the state for reference when saving
  state.currentTabId = tabId;
  
  // Create modal if it doesn't exist
  let tabModal = document.getElementById('tabModal');
  
  if (!tabModal) {
    tabModal = document.createElement('div');
    tabModal.id = 'tabModal';
    tabModal.className = 'modal hidden';
    
    tabModal.innerHTML = `
      <div class="modal-content">
        <h2 id="tabModalTitle">Add Tab</h2>
        <label for="tabName">Tab Name:</label>
        <input type="text" id="tabName" placeholder="Tab Name"/>
        <button id="saveTabBtn" class="btn save-btn">Save</button>
        <button id="cancelTabBtn" class="btn cancel-btn">Cancel</button>
        <button id="deleteTabBtn" class="btn delete-btn" style="display: none;">Delete</button>
      </div>
    `;
    
    document.body.appendChild(tabModal);
    
    // Add event listeners - use the state.currentTabId value, not the tabId parameter
    document.getElementById('saveTabBtn').addEventListener('click', () => {
      const isEdit = !!state.currentTabId;
      saveTab(isEdit, state.currentTabId);
    });
    
    document.getElementById('cancelTabBtn').addEventListener('click', () => {
      tabModal.classList.add('hidden');
    });
    
    document.getElementById('deleteTabBtn').addEventListener('click', () => {
      deleteTab(state.currentTabId);
    });
  }
  
  // Set modal title and input values
  const tabModalTitle = document.getElementById('tabModalTitle');
  const tabNameInput = document.getElementById('tabName');
  const deleteTabBtn = document.getElementById('deleteTabBtn');
  
  if (edit && tabId) {
    tabModalTitle.textContent = 'Edit Tab';
    const tab = state.tabs.find(t => t.id === tabId);
    tabNameInput.value = tab ? tab.name : '';
    
    // Only show delete button if not the "Ungrouped" tab
    if (tab && tab.name === "Ungrouped") {
      deleteTabBtn.style.display = 'none';
    } else {
      deleteTabBtn.style.display = 'inline-block';
    }
  } else {
    tabModalTitle.textContent = 'Add Tab';
    tabNameInput.value = '';
    deleteTabBtn.style.display = 'none';
  }
  
  // Show modal
  tabModal.classList.remove('hidden');
};

/**
 * Saves a new tab or updates an existing one
 * @param {boolean} edit - Whether we're editing an existing tab
 * @param {string} tabId - ID of the tab to edit
 */
const saveTab = async (edit = false, tabId = null) => {
  const tabNameInput = document.getElementById('tabName');
  const tabName = tabNameInput.value.trim();
  
  if (!tabName) {
    alert('Please enter a tab name');
    return;
  }
  
  if (edit && tabId) {
    // Update existing tab
    const tabIndex = state.tabs.findIndex(t => t.id === tabId);
    if (tabIndex !== -1) {
      state.tabs[tabIndex].name = tabName;
    }
  } else {
    // Add new tab
    const newTab = {
      id: Date.now().toString(),
      name: tabName,
      shortcuts: []
    };
    state.tabs.push(newTab);
    
    // If this is the first tab, make it active
    if (state.tabs.length === 1) {
      state.activeTabId = newTab.id;
    }
  }
  
  // Save tabs and update UI
  await saveTabs();
  renderTabs();
  updateVisibleShortcuts();
  
  // Close modal
  document.getElementById('tabModal').classList.add('hidden');
};

/**
 * Deletes a tab and its shortcuts
 * @param {string} tabId - ID of the tab to delete
 */
const deleteTab = async (tabId) => {
  if (!confirm('Are you sure you want to delete this tab and all its shortcuts?')) {
    return;
  }
  
  // Remove tab
  state.tabs = state.tabs.filter(t => t.id !== tabId);
  
  // If we deleted the active tab, switch to the first tab
  if (state.activeTabId === tabId && state.tabs.length > 0) {
    state.activeTabId = state.tabs[0].id;
  } else if (state.tabs.length === 0) {
    state.activeTabId = null;
  }
  
  // Save tabs and update UI
  await saveTabs();
  renderTabs();
  updateVisibleShortcuts();
  
  // Close modal
  document.getElementById('tabModal').classList.add('hidden');
};

/**
 * Saves tabs to storage
 */
const saveTabs = async () => {
  await setStorageValue(STORAGE_KEYS.TABS, state.tabs);
  await setStorageValue(STORAGE_KEYS.ACTIVE_TAB, state.activeTabId);
};

/**
 * Creates a tab button element
 * @param {Object} tab - Tab object
 * @returns {HTMLElement} - Tab button element
 */
const createTabElement = (tab) => {
  const tabEl = document.createElement('button');
  tabEl.className = 'tab-button';
  tabEl.textContent = tab.name;
  tabEl.dataset.tabId = tab.id;
  tabEl.title = tab.name;
  tabEl.draggable = tab.name !== "Ungrouped"; // Make tab draggable except Ungrouped
  
  // Style the tab
  const isActive = state.activeTabId === tab.id;
  tabEl.style.background = isActive
    ? 'rgba(138, 180, 248, 0.5)' 
    : 'rgba(60, 64, 67, 0.5)';
  tabEl.style.border = isActive ? '2px solid #fff' : 'none';
  tabEl.style.borderRadius = '12px'; // Match shortcut-icon border-radius
  tabEl.style.padding = '8px 16px';
  tabEl.style.cursor = tab.name === "Ungrouped" ? 'pointer' : 'grab'; // Show grab cursor to indicate draggable
  tabEl.style.color = '#e8eaed';
  tabEl.style.position = 'relative';
  tabEl.style.fontWeight = isActive ? 'bold' : 'normal';
  
  // Add edit icon using SVG namespace (same as shortcut edit icon)
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('edit-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  
  // Style the edit icon like the shortcut edit icon
  svg.style.display = 'none';
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.right = '0';
  svg.style.transform = 'translate(25%, -25%)';
  svg.style.backgroundColor = '#fff';
  svg.style.borderRadius = '50%';
  svg.style.padding = '4px';
  svg.style.width = '20px';
  svg.style.height = '20px';
  svg.style.cursor = 'pointer';
  
  const path1 = document.createElementNS(svgNS, 'path');
  path1.setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z');
  
  const path2 = document.createElementNS(svgNS, 'path');
  path2.setAttribute(
    'd',
    'M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34' +
    'a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
  );
  
  // Set path fill
  path1.style.fill = '#202124';
  path2.style.fill = '#202124';
  
  svg.append(path1, path2);
  tabEl.appendChild(svg);
  
  // Show edit icon on hover
  tabEl.addEventListener('mouseenter', () => {
    svg.style.display = 'block';
  });
  
  tabEl.addEventListener('mouseleave', () => {
    svg.style.display = 'none';
  });
  
  // Tab click - switch active tab
  tabEl.addEventListener('click', (e) => {
    if (e.target !== svg && !svg.contains(e.target)) {
      setActiveTab(tab.id);
    }
  });
  
  // Edit icon click - edit tab
  svg.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Change fill color on hover
    const paths = svg.querySelectorAll('path');
    paths.forEach(p => {
      p.style.fill = '#8ab4f8';
    });
    
    openAddTabModal(true, tab.id);
  });
  
  // Add drag and drop event listeners
  tabEl.addEventListener('dragstart', handleTabDragStart);
  tabEl.addEventListener('dragend', handleTabDragEnd);
  tabEl.addEventListener('dragover', handleTabDragOver);
  tabEl.addEventListener('dragleave', handleTabDragLeave);
  tabEl.addEventListener('drop', handleTabDrop);
  
  return tabEl;
};

/**
 * Renders all tabs in the tabs container
 */
const renderTabs = () => {
  // Clear existing tabs except the add button
  while (elements.tabsContainer.firstChild) {
    if (elements.tabsContainer.firstChild === elements.addTabBtn) {
      break;
    }
    elements.tabsContainer.removeChild(elements.tabsContainer.firstChild);
  }
  
  // Find the Ungrouped tab
  const ungroupedTab = state.tabs.find(tab => tab.name === "Ungrouped");
  
  // First add the Ungrouped tab if it exists
  if (ungroupedTab) {
    const tabEl = createTabElement(ungroupedTab);
    elements.tabsContainer.insertBefore(tabEl, elements.addTabBtn);
  }
  
  // Then add all other tabs
  state.tabs.forEach(tab => {
    if (tab.name !== "Ungrouped") {
      const tabEl = createTabElement(tab);
      elements.tabsContainer.insertBefore(tabEl, elements.addTabBtn);
    }
  });
  
  // Always show the tabs container, even if there are no tabs
  // The "New Tab" button should always be visible
  elements.tabsContainer.style.display = 'flex';
};

/**
 * Sets the active tab and updates the UI
 * @param {string} tabId - ID of the tab to make active
 */
const setActiveTab = async (tabId) => {
  state.activeTabId = tabId;
  await setStorageValue(STORAGE_KEYS.ACTIVE_TAB, tabId);
  renderTabs();
  updateVisibleShortcuts();
};

/**
 * Updates the modal to include tab selection
 */
const updateShortcutModal = () => {
  // Add tab selection field to shortcut modal
  const modalContent = document.querySelector('#modal .modal-content');
  
  if (!document.getElementById('tabSelection') && state.tabs.length > 0) {
    const tabSelection = document.createElement('div');
    tabSelection.id = 'tabSelection';
    tabSelection.style.marginBottom = '16px';
    
    const label = document.createElement('label');
    label.setAttribute('for', 'tabSelect');
    label.textContent = 'Tab:';
    
    const select = document.createElement('select');
    select.id = 'tabSelect';
    select.style.width = '100%';
    select.style.padding = '8px';
    select.style.marginBottom = '16px';
    select.style.backgroundColor = '#202124';
    select.style.border = '1px solid #5f6368';
    select.style.borderRadius = '4px';
    select.style.color = '#e8eaed';
    
    // Find the Ungrouped tab to put it first
    const ungroupedTab = state.tabs.find(tab => tab.name === "Ungrouped");
    
    // Add Ungrouped tab first if it exists
    if (ungroupedTab) {
      const option = document.createElement('option');
      option.value = ungroupedTab.id;
      option.textContent = ungroupedTab.name;
      select.appendChild(option);
    }
    
    // Add the rest of the tabs
    state.tabs.forEach(tab => {
      if (tab.name !== "Ungrouped") {
        const option = document.createElement('option');
        option.value = tab.id;
        option.textContent = tab.name;
        select.appendChild(option);
      }
    });
    
    // Set default selection to active tab if it exists, otherwise Ungrouped
    if (state.activeTabId) {
      select.value = state.activeTabId;
    } else if (ungroupedTab) {
      select.value = ungroupedTab.id;
    }
    
    tabSelection.appendChild(label);
    tabSelection.appendChild(select);
    
    // Insert after the URL input
    const urlInput = document.getElementById('siteURL');
    modalContent.insertBefore(tabSelection, urlInput.nextSibling);
  } else if (document.getElementById('tabSelection') && state.tabs.length > 0) {
    // Update existing tab selection options
    const select = document.getElementById('tabSelect');
    select.innerHTML = '';
    
    // Find the Ungrouped tab to put it first
    const ungroupedTab = state.tabs.find(tab => tab.name === "Ungrouped");
    
    // Add Ungrouped tab first if it exists
    if (ungroupedTab) {
      const option = document.createElement('option');
      option.value = ungroupedTab.id;
      option.textContent = ungroupedTab.name;
      select.appendChild(option);
    }
    
    // Add the rest of the tabs
    state.tabs.forEach(tab => {
      if (tab.name !== "Ungrouped") {
        const option = document.createElement('option');
        option.value = tab.id;
        option.textContent = tab.name;
        select.appendChild(option);
      }
    });
    
    // Set default selection to active tab if it exists, otherwise Ungrouped
    if (state.activeTabId) {
      select.value = state.activeTabId;
    } else if (ungroupedTab) {
      select.value = ungroupedTab.id;
    }
  } else if (document.getElementById('tabSelection') && state.tabs.length === 0) {
    // Remove tab selection if no tabs
    document.getElementById('tabSelection').remove();
  }
};

/**
 * Updates which shortcuts are visible based on the active tab
 */
const updateVisibleShortcuts = () => {
  // Hide all shortcuts except add button
  [...elements.container.querySelectorAll('.shortcut')]
    .filter(el => el.id !== 'addShortcut')
    .forEach(el => el.style.display = 'none');
  
  if (state.activeTabId) {
    // Show shortcuts for active tab
    const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
    if (activeTab) {
      [...elements.container.querySelectorAll('.shortcut')]
        .filter(el => el.id !== 'addShortcut')
        .filter(el => activeTab.shortcuts.includes(el.dataset.shortcutId))
        .forEach(el => el.style.display = 'flex');
    }
  } else {
    // If no active tab, but we have an Ungrouped tab, show those shortcuts
    const ungroupedTab = state.tabs.find(tab => tab.name === "Ungrouped");
    if (ungroupedTab) {
      [...elements.container.querySelectorAll('.shortcut')]
        .filter(el => el.id !== 'addShortcut')
        .filter(el => ungroupedTab.shortcuts.includes(el.dataset.shortcutId))
        .forEach(el => el.style.display = 'flex');
    } else {
      // Fallback: show all shortcuts if no tabs exist
      [...elements.container.querySelectorAll('.shortcut')]
        .filter(el => el.id !== 'addShortcut')
        .forEach(el => el.style.display = 'flex');
    }
  }
};

/**
 * Loads tabs from storage
 */
const loadTabs = async () => {
  state.tabs = await getStorageValue(STORAGE_KEYS.TABS, []);
  state.activeTabId = await getStorageValue(STORAGE_KEYS.ACTIVE_TAB, null);
  
  // Create "Ungrouped" tab if it doesn't exist
  if (!state.tabs.find(tab => tab.name === "Ungrouped")) {
    const ungroupedTab = {
      id: "ungrouped_" + Date.now().toString(),
      name: "Ungrouped",
      shortcuts: []
    };
    state.tabs.unshift(ungroupedTab); // Add to the beginning of tabs array
    
    // Make it the active tab if no active tab is set
    if (!state.activeTabId) {
      state.activeTabId = ungroupedTab.id;
    }
    
    await saveTabs();
  }
  
  renderTabs();
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
  // Add "Add new" label to the add shortcut button
  const addShortcut = document.getElementById('addShortcut');
  if (addShortcut) {
    // Update the plus sign to be slightly smaller
    const iconDiv = addShortcut.querySelector('.shortcut-icon');
    if (iconDiv) {
      iconDiv.innerHTML = '+';
      iconDiv.style.fontSize = '24px';
    }
    
    // Add the "Add new" label if it doesn't exist
    if (!addShortcut.querySelector('.shortcut-label')) {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'shortcut-label';
      labelDiv.textContent = 'Add new';
      addShortcut.appendChild(labelDiv);
    }
  }

  // Create tabs container
  createTabsContainer();
  
  // Add event listener for Add Tab button
  elements.addTabBtn.addEventListener('click', () => openAddTabModal(false));
  
  // Load tabs
  await loadTabs();
  
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
  
  // Update visible shortcuts based on active tab
  updateVisibleShortcuts();
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  
  // Extra check to ensure tabs container is created and visible
  setTimeout(() => {
    if (!document.getElementById('tabsContainer')) {
      console.log('Tabs container not found, creating it again');
      createTabsContainer();
      elements.addTabBtn.addEventListener('click', () => openAddTabModal(false));
    }
  }, 500);
});

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
    const oldShortcutId = state.currentElement.dataset.shortcutId;
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

    // Update tab assignment if changed
    if (state.tabs.length > 0 && document.getElementById('tabSelect')) {
      const selectedTabId = document.getElementById('tabSelect').value;
      
      // Remove shortcut from all tabs
      state.tabs.forEach(tab => {
        const index = tab.shortcuts.indexOf(oldShortcutId);
        if (index !== -1) {
          tab.shortcuts.splice(index, 1);
        }
      });
      
      // Add to selected tab
      const tabIndex = state.tabs.findIndex(tab => tab.id === selectedTabId);
      if (tabIndex !== -1) {
        state.tabs[tabIndex].shortcuts.push(oldShortcutId);
      }
      
      await saveTabs();
    }

    await saveToLocalStorage();
  } else {
    const shortcut = await addShortcut(name, url);
    
    // If tabs exist, update the tab assignment
    if (state.tabs.length > 0 && document.getElementById('tabSelect')) {
      const selectedTabId = document.getElementById('tabSelect').value;
      const shortcutId = shortcut.dataset.shortcutId;
      
      // Remove from current tab
      if (state.activeTabId) {
        const activeTabIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
        if (activeTabIndex !== -1) {
          const index = state.tabs[activeTabIndex].shortcuts.indexOf(shortcutId);
          if (index !== -1) {
            state.tabs[activeTabIndex].shortcuts.splice(index, 1);
          }
        }
      }
      
      // Add to selected tab
      const tabIndex = state.tabs.findIndex(tab => tab.id === selectedTabId);
      if (tabIndex !== -1) {
        state.tabs[tabIndex].shortcuts.push(shortcutId);
        
        // If adding to a tab that's not active, set it as active
        if (selectedTabId !== state.activeTabId) {
          state.activeTabId = selectedTabId;
        }
      }
      
      await saveTabs();
      renderTabs();
      updateVisibleShortcuts();
    }
  }

  closeModal();
});

// Cancel button click
elements.cancelBtn.addEventListener('click', closeModal);

// Delete button click
elements.deleteBtn.addEventListener('click', async () => {
  if (state.isEditing && state.currentElement) {
    const shortcutId = state.currentElement.dataset.shortcutId;
    
    // Remove shortcut from all tabs
    if (state.tabs.length > 0) {
      state.tabs.forEach(tab => {
        const index = tab.shortcuts.indexOf(shortcutId);
        if (index !== -1) {
          tab.shortcuts.splice(index, 1);
        }
      });
      await saveTabs();
    }
    
    state.currentElement.remove();
    await saveToLocalStorage();
    closeModal();
    updateVisibleShortcuts();
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

// ——— TAB DRAG AND DROP FUNCTIONALITY ———

/**
 * Handles the dragstart event for tabs.
 * 
 * @param {DragEvent} e - The drag event.
 */
const handleTabDragStart = function(e) {
  // Don't allow dragging the Ungrouped tab
  const tab = state.tabs.find(t => t.id === this.dataset.tabId);
  if (tab && tab.name === "Ungrouped") {
    e.preventDefault();
    return false;
  }
  
  state.draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  
  // Add a visual indicator while dragging
  this.style.opacity = '0.4';
};

/**
 * Handles the dragend event for tabs.
 */
const handleTabDragEnd = function() {
  this.classList.remove('dragging');
  state.draggedItem = null;
  
  // Restore normal appearance
  this.style.opacity = '1';
};

/**
 * Handles the dragover event for tabs.
 * 
 * @param {DragEvent} e - The drag event.
 * @returns {boolean} - Always returns false to prevent default behavior.
 */
const handleTabDragOver = function(e) {
  e.preventDefault();
  if (state.draggedItem === this) {
    return false;
  }
  
  // Don't allow dropping on the Ungrouped tab
  const tab = state.tabs.find(t => t.id === this.dataset.tabId);
  if (tab && tab.name === "Ungrouped") {
    e.dataTransfer.dropEffect = 'none';
    return false;
  }
  
  // Add visual indicator for drop target
  this.style.boxShadow = '0 0 0 2px #8ab4f8';
  
  e.dataTransfer.dropEffect = 'move';
  return false;
};

/**
 * Handles the dragleave event for tabs.
 */
const handleTabDragLeave = function() {
  // Remove visual indicator
  this.style.boxShadow = 'none';
};

/**
 * Handles the drop event for tabs.
 * 
 * @param {DragEvent} e - The drag event.
 * @returns {boolean} - Always returns false to prevent default behavior.
 */
const handleTabDrop = function(e) {
  e.preventDefault();
  
  // Remove visual indicator
  this.style.boxShadow = 'none';
  
  if (state.draggedItem === this) return false;
  
  // Don't allow dropping on the Ungrouped tab
  const tab = state.tabs.find(t => t.id === this.dataset.tabId);
  if (tab && tab.name === "Ungrouped") {
    return false;
  }
  
  // Only process if we're dropping a tab onto another tab
  if (state.draggedItem && state.draggedItem.classList.contains('tab-button')) {
    const tabElements = [...elements.tabsContainer.querySelectorAll('.tab-button')]
      .filter(tab => tab !== elements.addTabBtn)
      .filter(tab => {
        // Exclude the Ungrouped tab from reordering
        const tabData = state.tabs.find(t => t.id === tab.dataset.tabId);
        return !(tabData && tabData.name === "Ungrouped");
      });
    
    const draggedIndex = tabElements.indexOf(state.draggedItem);
    const droppedIndex = tabElements.indexOf(this);
    
    if (draggedIndex !== -1 && droppedIndex !== -1) {
      // Reorder DOM elements
      if (draggedIndex < droppedIndex) {
        this.parentNode.insertBefore(state.draggedItem, this.nextSibling);
      } else {
        this.parentNode.insertBefore(state.draggedItem, this);
      }
      
      // Reorder the tabs array in state
      const draggedTabId = state.draggedItem.dataset.tabId;
      const draggedTab = state.tabs.find(tab => tab.id === draggedTabId);
      const droppedTab = state.tabs.find(tab => tab.id === this.dataset.tabId);
      
      if (draggedTab && droppedTab) {
        // Get the ungrouped tab first
        const ungroupedTab = state.tabs.find(tab => tab.name === "Ungrouped");
        
        // Filter out the ungrouped tab and the dragged tab
        const otherTabs = state.tabs.filter(tab => 
          tab.name !== "Ungrouped" && tab.id !== draggedTabId
        );
        
        // Find the position of the dropped tab in the filtered array
        const droppedTabIndex = otherTabs.findIndex(tab => tab.id === droppedTab.id);
        
        // Insert the dragged tab at the right position
        if (draggedIndex < droppedIndex) {
          otherTabs.splice(droppedTabIndex + 1, 0, draggedTab);
        } else {
          otherTabs.splice(droppedTabIndex, 0, draggedTab);
        }
        
        // Reconstruct the tabs array with Ungrouped first
        state.tabs = ungroupedTab ? [ungroupedTab, ...otherTabs] : otherTabs;
        
        // Save the reordering
        saveTabs();
      }
    }
  }
  
  return false;
};
