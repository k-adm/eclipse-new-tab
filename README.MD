# Eclipse New Tab

Eclipse New Tab is a customizable Chrome extension that replaces your default New Tab page and Home button with a dark‑theme dashboard featuring:

* **Live Google‑style search bar** with dropdown suggestions and keyboard navigation
* **Dynamic Unsplash backgrounds** based on your own search queries
* **Favorite site shortcuts** with DNS prefetch & preload for instant loading
* **Easy customization** of shortcuts and background settings

---

## Features

1. **Search Bar with Suggestions**

   * Live search suggestions from Google Suggest API
   * Arrow key navigation and Enter to select
   * Click or hit Enter to navigate in the same tab

2. **Dynamic Backgrounds**

   * Pulls random high‑quality images from Unsplash
   * Filter by custom search query (e.g. "nature", "space")
   * Fade transition on each load for a polished look

3. **Favorite Shortcuts**

   * Add, edit, or delete up to 8 favorite sites
   * Auto‑fetch favicons or use first‑letter icons
   * DNS prefetch & preload for each shortcut’s domain

4. **Dark Theme & Responsive Layout**

   * Sleek dark interface with translucent elements
   * Mobile‑friendly and scales across resolutions

5. **One‑Click Customize**

   * Unsplash API key and search query input
   * Instant preview of your new background

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/k-adm/eclipse-new-tab.git
   cd eclipse-new-tab
   ```

2. **Load as an unpacked extension**

   1. Open Chrome and navigate to `chrome://extensions`
   2. Enable **Developer mode** (toggle in top right)
   3. Click **Load unpacked** and select the project root folder

3. **Enjoy your new tab!**

   * Open a new tab or click the Home button (if set) to see the dashboard

---

## Usage

* **Search:** Type in the bar, select suggestion with arrow keys or click, hit Enter to search in the same tab.
* **Add Shortcut:** Click the **+** icon, enter a name and URL, then save.
* **Edit/Delete Shortcut:** Hover a shortcut and click the pencil icon, then edit or delete.
* **Customize Background:** Click **Customize**, enter your Unsplash Access Key and query, then save.

---

## Configuration

* **Unsplash API Key:**

  * Sign up at [Unsplash Developers](https://unsplash.com/developers) to get your Access Key.
  * Paste it into the Customize modal.

* **Search Query:**

  * Use any keyword(s) to fetch themed backgrounds (e.g. `mountains`, `ocean`).

---

## Directory Structure

```
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── index.html
├── manifest.json
├── script.js
└── README.md
```

---

## Contributing

Contributions are welcome! To propose changes:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m "Add feature"`)
4. Push to your branch (`git push origin feature-name`)
5. Open a Pull Request

Please follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for code consistency.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
