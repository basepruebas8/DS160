// personal1.js
// Reemplazar el personal1.js actual por este archivo.

document.addEventListener('DOMContentLoaded', function () {
  // 1) Radios verdes -> marcar "No" y ocultar secciones dependientes
  try {
    const otherNamesNo = document.getElementById('OtherNamesN');
    if (otherNamesNo) {
      otherNamesNo.checked = true;
      otherNamesNo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const telecodeNo = document.getElementById('TelecodeN');
    if (telecodeNo) {
      telecodeNo.checked = true;
      telecodeNo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Asegurar que las secciones dependientes queden ocultas si existen
    const otherNamesSection = document.getElementById('otherNamesSection');
    if (otherNamesSection) { otherNamesSection.hidden = true; otherNamesSection.style.display = ''; }

    const telecodeSection = document.getElementById('telecodeSection');
    if (telecodeSection) { telecodeSection.hidden = true; telecodeSection.style.display = ''; }
  } catch (e) {
    console.warn('Error ajustando radios verdes:', e);
  }

  // 2) Enmarcado amarillo -> País por defecto: México
  try {
    const pobCountry = document.getElementById('POB_COUNTRY');
    if (pobCountry) {
      const opt = Array.from(pobCountry.options).find(o => {
        const t = (o.text || '').trim().toUpperCase();
        return t === 'MÉXICO' || t === 'MEXICO' || t === 'MÉXICO ' || t === 'MEXICO ';
      });
      if (opt) {
        // Si option tiene value vacío, asignar por texto; en caso contrario, asignar value
        pobCountry.value = opt.value !== '' ? opt.value : opt.text;
        pobCountry.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  } catch (e) {
    console.warn('No se pudo establecer POB_COUNTRY por defecto:', e);
  }

  // 3) Enmarcados en azul -> mostrar opciones en español (mantener values)
  try {
    const gender = document.getElementById('APP_GENDER');
    if (gender) {
      gender.innerHTML = [
        '<option value="">- Seleccione -</option>',
        '<option value="MALE">Masculino</option>',
        '<option value="FEMALE">Femenino</option>'
      ].join('');
    }

    const marital = document.getElementById('APP_MARITAL_STATUS');
    if (marital) {
      marital.innerHTML = [
        '<option value="">- Seleccione -</option>',
        '<option value="MARRIED">Casado(a)</option>',
        '<option value="COMMON LAW MARRIAGE">Unión de hecho</option>',
        '<option value="CIVIL UNION/DOMESTIC PARTNERSHIP">Unión civil/pareja doméstica</option>',
        '<option value="SINGLE">Soltero(a)</option>',
        '<option value="WIDOWED">Viudo(a)</option>',
        '<option value="DIVORCED">Divorciado(a)</option>',
        '<option value="LEGALLY SEPARATED">Separado(a) legalmente</option>',
        '<option value="OTHER">Otro</option>'
      ].join('');
    }
  } catch (e) {
    console.warn('No se pudo traducir selects azules:', e);
  }

  // 4) Asegurar que "Nombre completo en alfabeto nativo" esté visible
  try {
    const fullNameInput = document.getElementById('APP_FULL_NAME_NATIVE');
    if (fullNameInput) {
      // Mostrar la fila contenedora si estuviera oculta
      const row = fullNameInput.closest('.row');
      if (row) {
        row.hidden = false;
        row.style.display = '';
      }
      // Asegurar checkbox "No aplica" sin marcar
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Si existiera algún atributo de aria-hidden o style que lo oculte, limpiarlo
      fullNameInput.removeAttribute('aria-hidden');
      fullNameInput.style.display = '';
    }
  } catch (e) {
    console.warn('No se pudo asegurar visibilidad de Nombre completo:', e);
  }

  // 5) Mensaje opcional en consola para depuración
  console.info('personal1.js: valores por defecto aplicados (radios, país, selects, visibilidad nombre nativo).');
});
