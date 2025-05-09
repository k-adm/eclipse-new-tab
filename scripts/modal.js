// scripts/modal.js
export function setupModals() {
  const addBtn       = document.getElementById('addShortcut');
  const customizeBtn = document.getElementById('customizeBtn');
  const settingsBtn  = document.getElementById('settingsBtn');
  const modals       = ['modal', 'customizeModal', 'settingsModal']
    .map(id => document.getElementById(id));

  // open
  addBtn      .addEventListener('click', () => document.getElementById('modal')         .classList.remove('hidden'));
  customizeBtn.addEventListener('click', () => document.getElementById('customizeModal') .classList.remove('hidden'));
  settingsBtn .addEventListener('click', () => document.getElementById('settingsModal')  .classList.remove('hidden'));

  // close on X
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).classList.add('hidden');
    });
  });

  // close outside
  document.addEventListener('click', e => {
    modals.forEach(m => {
      if (!m.classList.contains('hidden')) {
        const content = m.querySelector('.modal-content');
        if (!content.contains(e.target) &&
            !addBtn.contains(e.target) &&
            !customizeBtn.contains(e.target) &&
            !settingsBtn.contains(e.target)) {
          m.classList.add('hidden');
        }
      }
    });
  });
}
