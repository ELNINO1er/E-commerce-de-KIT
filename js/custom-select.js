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

    var valueEl = button.querySelector('.kic-custom-select__value');
    var typeahead = '';
    var typeaheadTimer = 0;

    function items() {
      return Array.prototype.slice.call(menu.querySelectorAll('.kic-custom-select__option'));
    }

    function close(focus) {
      if (menu.hidden) return;
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (focus) button.focus();
    }

    function open() {
      document.querySelectorAll('.kic-custom-select__menu:not([hidden])').forEach(function (other) { other.hidden = true; });
      document.querySelectorAll('.kic-custom-select__trigger[aria-expanded="true"]').forEach(function (other) { other.setAttribute('aria-expanded', 'false'); });
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      var active = menu.querySelector('.is-selected') || menu.querySelector('.kic-custom-select__option:not([disabled])');
      if (active) { active.focus(); active.scrollIntoView({ block: 'nearest' }); }
    }

    function focusByOffset(current, step) {
      var list = items().filter(function (el) { return !el.disabled; });
      if (!list.length) return;
      var idx = list.indexOf(current);
      var next = list[Math.min(list.length - 1, Math.max(0, idx + step))];
      if (next) { next.focus(); next.scrollIntoView({ block: 'nearest' }); }
    }

    function render() {
      var options = Array.prototype.slice.call(select.options);
      var selected = options[select.selectedIndex] || options[0];
      var text = selected ? selected.textContent : 'Sélectionner';
      valueEl.textContent = text;
      valueEl.classList.toggle('is-placeholder', !selected || selected.value === '');
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
      if (menu.hidden) open(); else close(false);
    });

    button.addEventListener('keydown', function (event) {
      if (button.disabled) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (menu.hidden) open();
      }
    });

    menu.addEventListener('keydown', function (event) {
      var current = document.activeElement;
      if (!current || !current.classList.contains('kic-custom-select__option')) current = menu.querySelector('.is-selected');
      switch (event.key) {
        case 'ArrowDown': event.preventDefault(); focusByOffset(current, 1); break;
        case 'ArrowUp': event.preventDefault(); focusByOffset(current, -1); break;
        case 'Home': event.preventDefault(); focusByOffset(current, -items().length); break;
        case 'End': event.preventDefault(); focusByOffset(current, items().length); break;
        case 'Escape': event.preventDefault(); close(true); break;
        case 'Tab': close(false); break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (current) current.click();
          break;
        default:
          if (event.key.length === 1) {
            typeahead += event.key.toLowerCase();
            clearTimeout(typeaheadTimer);
            typeaheadTimer = setTimeout(function () { typeahead = ''; }, 600);
            var match = items().filter(function (el) { return !el.disabled; })
              .find(function (el) { return el.textContent.toLowerCase().indexOf(typeahead) === 0; });
            if (match) { match.focus(); match.scrollIntoView({ block: 'nearest' }); }
          }
      }
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
