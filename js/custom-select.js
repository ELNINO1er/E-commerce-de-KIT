(function () {
  'use strict';

  function enhance(select, index) {
    var root = select.closest('.kic-select');
    if (!root || root.dataset.enhanced === 'true') return;
    root.dataset.enhanced = 'true';
    root.classList.add('kic-custom-select');
    select.classList.add('kic-custom-select__native');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'kic-custom-select__trigger';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span class="kic-custom-select__value"></span><span class="kic-custom-select__arrow" aria-hidden="true"></span>';

    var menu = document.createElement('div');
    menu.className = 'kic-custom-select__menu';
    menu.id = 'kic-select-menu-' + index;
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    button.setAttribute('aria-controls', menu.id);
    root.appendChild(button);
    root.appendChild(menu);

    function close(focus) {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (focus) button.focus();
    }

    function render() {
      var options = Array.prototype.slice.call(select.options);
      var selected = options[select.selectedIndex] || options[0];
      button.querySelector('.kic-custom-select__value').textContent = selected ? selected.textContent : 'Sélectionner';
      button.disabled = select.disabled;
      menu.innerHTML = '';
      options.forEach(function (option) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'kic-custom-select__option';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(option.selected));
        item.dataset.value = option.value;
        item.textContent = option.textContent;
        item.disabled = option.disabled;
        if (option.selected) item.classList.add('is-selected');
        item.addEventListener('click', function () {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          render();
          close(true);
        });
        menu.appendChild(item);
      });
    }

    button.addEventListener('click', function () {
      if (button.disabled) return;
      var opening = menu.hidden;
      document.querySelectorAll('.kic-custom-select__menu:not([hidden])').forEach(function (other) { other.hidden = true; });
      document.querySelectorAll('.kic-custom-select__trigger[aria-expanded="true"]').forEach(function (other) { other.setAttribute('aria-expanded', 'false'); });
      menu.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
      if (opening) {
        var active = menu.querySelector('.is-selected') || menu.querySelector('.kic-custom-select__option');
        if (active) { active.focus(); active.scrollIntoView({ block: 'nearest' }); }
      }
    });

    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close(true);
    });
    select.addEventListener('change', render);
    new MutationObserver(render).observe(select, { childList: true, attributes: true, subtree: true });
    render();
  }

  document.querySelectorAll('.kic-select select').forEach(enhance);
  document.addEventListener('click', function (event) {
    if (event.target.closest('.kic-custom-select')) return;
    document.querySelectorAll('.kic-custom-select__menu:not([hidden])').forEach(function (menu) { menu.hidden = true; });
    document.querySelectorAll('.kic-custom-select__trigger[aria-expanded="true"]').forEach(function (button) { button.setAttribute('aria-expanded', 'false'); });
  });
})();
