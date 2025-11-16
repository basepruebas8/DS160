(function () {
  const STORAGE_KEY = 'ds160_data';

  function getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Error leyendo datos guardados', e);
      return {};
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error guardando datos', e);
    }
  }

  function onFieldChange(event) {
    const field = event.target;
    if (!field.name) return;

    const data = getData();
    const name = field.name;

    if (field.type === 'radio') {
      if (field.checked) {
        data[name] = field.value;
      }
    } else if (field.type === 'checkbox') {
      const form = field.form || document;
      const boxes = form.querySelectorAll(
        'input[type="checkbox"][name="' + name + '"]'
      );
      const values = [];
      boxes.forEach((box) => {
        if (box.checked) {
          values.push(box.value || true);
        }
      });

      if (values.length === 0) {
        delete data[name];
      } else if (values.length === 1) {
        data[name] = values[0];
      } else {
        data[name] = values;
      }
    } else {
      const value = field.value == null ? '' : field.value;
      if (value === '') {
        delete data[name];
      } else {
        data[name] = value;
      }
    }

    saveData(data);
  }

  function restoreFieldValue(field, data) {
    const name = field.name;
    if (!name) return;
    if (!(name in data)) return;

    const stored = data[name];

    if (field.type === 'radio') {
      field.checked = stored === field.value;
    } else if (field.type === 'checkbox') {
      if (Array.isArray(stored)) {
        field.checked = stored.includes(field.value || true);
      } else {
        field.checked = stored === (field.value || true);
      }
    } else {
      field.value = stored;
    }
  }

  function initFormPersistence() {
    const data = getData();
    const fields = document.querySelectorAll(
      'input[name], select[name], textarea[name]'
    );

    fields.forEach((field) => {
      restoreFieldValue(field, data);
      field.addEventListener('change', onFieldChange);
      field.addEventListener('blur', onFieldChange);
    });
  }

  function clearData() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function exportJsonFile(filename) {
    const data = getData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename || 'formulario-visa.json';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  // Exponer una API sencilla en window
  window.FormPersistence = {
    init: initFormPersistence,
    clear: clearData,
    export: exportJsonFile,
  };

  // Activar auto-guardado en todas las páginas
  document.addEventListener('DOMContentLoaded', initFormPersistence);
})();
