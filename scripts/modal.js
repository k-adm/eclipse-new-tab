// modal.js

/**
 * @module modal
 * Handles opening and closing of the customize and settings modals.
 *
 * Uses event delegation to close modals when clicking outside the content
 * and binds open actions to Customize and Settings buttons.
 */
export function setupModals() {
  const customizeBtn = document.getElementById('customizeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const modals = ['customizeModal', 'settingsModal'].map((id) =>
    document.getElementById(id),
  );

  // Open Customize Modal
  customizeBtn.addEventListener('click', () => {
    document.getElementById('customizeModal').classList.remove('hidden');
  });

  // Open Settings Modal
  settingsBtn.addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden');
  });

  // Close modals on clicking the X button
  document.querySelectorAll('.close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).classList.add('hidden');
    });
  });

  // Close when clicking outside of any open modal
  document.addEventListener('click', (event) => {
    modals.forEach((modalEl) => {
      if (!modalEl.classList.contains('hidden')) {
        const content = modalEl.querySelector('.modal-content');
        if (
          !content.contains(event.target) &&
          !customizeBtn.contains(event.target) &&
          !settingsBtn.contains(event.target)
        ) {
          modalEl.classList.add('hidden');
        }
      }
    });
  });
}
