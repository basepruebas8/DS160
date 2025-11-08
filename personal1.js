// personal1.js — ÚNICO ARCHIVO
// Cumple con:
// - "Imágenes" visible y funcional (guardar local con IndexedDB, listar/ver/descargar/eliminar, progreso, refrescar).
// - Autocompleta "Nombre completo en alfabeto nativo" = Nombres + Apellidos (campo oculto).
// - Fuerza "Otros nombres" y "Telecódigo" a "No" y oculta sus bloques.
// - "Estado/Provincia" visible; oculta únicamente su casilla "No aplica" (igual para "Nombre nativo").
// - Guarda/restaura en sessionStorage.
// - Fusiona esta página en el JSON maestro sessionStorage["ds160-all"].forms["ds160-personal1"].
//   Además, define en raíz: app_surname, app_given_name, full_name, e incorpora metadatos de imágenes en master.images.
// - "Siguiente" valida requeridos visibles; si falta algo, no avanza; si pasa, guarda, fusiona y navega a personal2.html con querystring.

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // ====== Constantes ======
  const MASTER_KEY = 'ds160-all';
  const PAGE_KEY   = 'ds160-personal1';
  const FORM_KEY   = 'ds160-personal1-state-v3';
  const FORM_KEY_RAW = 'ds160-personal1-raw-v3';
  const IMAGES_META_KEY = 'ds160-personal1-images-meta-v1';
  const NEXT_PAGE  = 'personal2.html';

  // ====== Helpers genéricos ======
  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };

  const hide = el => { if (!el) return; el.style.display='none'; el.hidden=true; el.setAttribute('aria-hidden','true'); };
  const show = el => { if (!el) return; el.style.display=''; el.hidden=false; el.removeAttribute('aria-hidden'); };

  function keyOf(el){
    const nm = (el?.name||'').trim();
    if (nm) return nm;
    const id = (el?.id||'').trim();
    return id ? `#${id}` : '';
  }

  function isHiddenLike(el){
    if (!el) return false;
    if (el.hidden) return true;
    if (el.closest && el.closest('[hidden]')) return true;
    const cs = getComputedStyle(el);
    if (cs.display==='none' || cs.visibility==='hidden') return true;
    const row = el.closest?.('.row');
    if (row){
      const rs = getComputedStyle(row);
      if (rs.display==='none' || rs.visibility==='hidden') return true;
    }
    return false;
  }

  function removeRequiredFromHidden(form){
    Array.from(form.querySelectorAll('[required]')).forEach(el=>{
      if (isHiddenLike(el)) { try{ el.removeAttribute('required'); }catch{} }
    });
  }

  // Valida requeridos visibles (incluye radios/checkbox)
  function isFormValid(form){
    let valid = true;
    const seen = new Set();
    Array.from(form.querySelectorAll('[required]')).forEach(el=>{
      if (isHiddenLike(el)) return;
      const t = (el.type||'').toLowerCase();
      if (t==='radio' || t==='checkbox'){
        const name = el.name || keyOf(el);
        if (!name || seen.has(name)) return;
        seen.add(name);
        const sel = name.startsWith('#') ? `input#${name.slice(1)}` : `input[name="${name}"]`;
        const group = Array.from(form.querySelectorAll(sel));
        const any = group.some(i=>!isHiddenLike(i) && i.checked);
        if (!any) valid=false;
        return;
      }
      const v = (el.value||'').trim();
      if (v==='') valid=false;
    });
    return valid;
  }

  // ====== Recolección de datos ======
  function collectRaw(form){
    const data = {};
    Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
      const k = keyOf(el);
      if (!k) return;
      const t = (el.type||'').toLowerCase();
      if (t==='checkbox' || t==='radio'){
        data[k+'::'+(el.id||'')] = !!el.checked;
      } else if (t!=='file'){
        data[k] = el.value;
      }
    });
    return data;
  }

  // Normalizado: radios=valor; checkbox único=boolean; checkbox múltiple=array; resto=valor
  function collectNormalized(form){
    const out = {};
    const groups = {};
    Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
      const k = keyOf(el);
      if (!k) return;
      const t = (el.type||'').toLowerCase();
      if (t==='file') return;
      if (t==='radio'){
        const g = el.name || k;
        (groups[g]=groups[g]||{type:'radio',inputs:[]}).inputs.push(el);
      } else if (t==='checkbox'){
        const g = el.name || k;
        (groups[g]=groups[g]||{type:'checkbox',inputs:[]}).inputs.push(el);
      } else {
        out[k] = el.value;
      }
    });
    Object.keys(groups).forEach(gk=>{
      const g = groups[gk];
      if (g.type==='radio'){
        const checked = g.inputs.find(i=>i.checked);
        out[gk] = checked ? (checked.value||'on') : '';
      } else {
        if (g.inputs.length===1) out[gk] = g.inputs[0].checked;
        else out[gk] = g.inputs.filter(i=>i.checked).map(i=>i.value||'on');
      }
    });

    // Alias amigables para el backend (.gs) en esta sección:
    const given   = (document.getElementById('APP_GIVEN_NAME')?.value || '').trim();
    const surname = (document.getElementById('APP_SURNAME')?.value || '').trim();
    out.app_given_name = given;
    out.app_surname    = surname;
    out.full_name      = [given, surname].filter(Boolean).join(' ').trim();

    const native = (document.getElementById('APP_FULL_NAME_NATIVE')?.value || '').trim();
    if (native) out.app_full_name_native = native;

    return out;
  }

  function saveFormState(form){
    try{
      sessionStorage.setItem(FORM_KEY_RAW, JSON.stringify(collectRaw(form)));
      sessionStorage.setItem(FORM_KEY, JSON.stringify(collectNormalized(form)));
    }catch(e){ console.warn('saveFormState', e); }
  }

  function restoreFormState(form){
    try{
      const normStr = sessionStorage.getItem(FORM_KEY);
      const rawStr  = sessionStorage.getItem(FORM_KEY_RAW);

      if (normStr){
        const norm = JSON.parse(normStr);
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
          const nameKey = (el.name||'').trim();
          const idKey = el.id ? `#${el.id}` : '';
          const t = (el.type||'').toLowerCase();
          let val;
          if (nameKey && Object.prototype.hasOwnProperty.call(norm, nameKey)) val = norm[nameKey];
          else if (idKey && Object.prototype.hasOwnProperty.call(norm, idKey)) val = norm[idKey];
          else return;

          if (t==='radio'){
            el.checked = (el.value||'on') === String(val);
          } else if (t==='checkbox'){
            if (Array.isArray(val)) el.checked = val.includes(el.value||'on');
            else if (typeof val==='boolean') el.checked = val;
            else el.checked = (el.value||'on') === String(val);
          } else if (t!=='file'){
            el.value = val;
          }
        });
      } else if (rawStr){
        const data = JSON.parse(rawStr);
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
          const k = keyOf(el);
          if (!k) return;
          const t = (el.type||'').toLowerCase();
          if (t==='checkbox' || t==='radio'){
            const key = k+'::'+(el.id||'');
            if (key in data) el.checked = !!data[key];
          } else if (t!=='file'){
            if (k in data) el.value = data[k];
          }
        });
      }

      // Re-disparar dependencias
      Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
        el.dispatchEvent(new Event('change', {bubbles:true}));
        el.dispatchEvent(new Event('input', {bubbles:true}));
      });
    }catch(e){ console.warn('restoreFormState', e); }
  }

  function buildQueryFromForm(form){
    const norm = collectNormalized(form);
    const params = new URLSearchParams();
    Object.entries(norm).forEach(([k,v])=>{
      if (v==null) return;
      if (Array.isArray(v)) v.forEach(val=>params.append(k, String(val)));
      else params.append(k, String(v));
    });
    return params;
  }

  // ====== Maestro (ds160-all) ======
  function readMaster(){
    try{ const s=sessionStorage.getItem(MASTER_KEY); return s? JSON.parse(s):{}; }catch{ return {}; }
  }
  function writeMaster(obj){
    try{ sessionStorage.setItem(MASTER_KEY, JSON.stringify(obj)); }catch{}
  }
  function readImagesMeta(){
    try{ const s=sessionStorage.getItem(IMAGES_META_KEY); return s? JSON.parse(s):[]; }catch{ return []; }
  }

  function mergeIntoMaster(){
    const form = document.getElementById('ds160-personal1');
    if (!form) return;

    const section = collectNormalized(form);
    const imgs = readImagesMeta();

    const given   = section.app_given_name || '';
    const surname = section.app_surname || '';
    const full    = section.full_name || [given, surname].filter(Boolean).join(' ').trim();

    const master = readMaster();
    master.forms = master.forms || {};
    master.forms[PAGE_KEY] = section;

    // Nombres en raíz (ayuda al .gs a nombrar carpeta)
    if (surname) master.app_surname = surname;
    if (given)   master.app_given_name = given;
    if (full)    master.full_name = full;

    // Unificar imágenes (metadatos) por página
    const withPage = imgs.map(m => ({...m, __page: PAGE_KEY}));
    const prev = Array.isArray(master.images) ? master.images : [];
    master.images = prev.filter(x => x.__page !== PAGE_KEY).concat(withPage);

    master.__updatedAt = new Date().toISOString();
    writeMaster(master);
  }

  // ====== IndexedDB Imágenes ======
  const IDB = (function(){
    const DB_NAME='ds160-images-v1', STORE='images';
    function open(){ return new Promise((res,rej)=>{
      const req = indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{ const db=req.result;
        if (!db.objectStoreNames.contains(STORE)){
          const os=db.createObjectStore(STORE,{keyPath:'id'});
          os.createIndex('createdAt','createdAt',{unique:false});
          os.createIndex('name','name',{unique:false});
        }
      };
      req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error);
    });}
    function withStore(mode, fn){
      return open().then(db=>new Promise((res,rej)=>{
        const tx=db.transaction(STORE,mode); const store=tx.objectStore(STORE);
        let r; try{ r=fn(store,tx);}catch(e){ rej(e); return; }
        tx.oncomplete=()=>res(r); tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error||new Error('aborted'));
      }));
    }
    function putFile(file){
      const id = (crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()+Math.random());
      const rec={ id, name:file.name, size:file.size, type:file.type||'application/octet-stream', createdAt:Date.now(), blob:file };
      return withStore('readwrite',s=>s.put(rec)).then(()=>rec.id);
    }
    function listAll(){
      return withStore('readonly',store=>new Promise((res,rej)=>{
        const items=[]; const req=store.openCursor();
        req.onsuccess=e=>{ const c=e.target.result; if (c){ items.push(c.value); c.continue(); } else {
          items.sort((a,b)=>b.createdAt-a.createdAt); res(items);
        }};
        req.onerror=()=>rej(req.error);
      }));
    }
    function getById(id){ return withStore('readonly',s=>s.get(id)); }
    function remove(id){ return withStore('readwrite',s=>s.delete(id)); }
    return { putFile, listAll, getById, remove };
  })();

  function formatBytes(bytes){
    if (!bytes && bytes!==0) return '';
    const k=1024, sizes=['B','KB','MB','GB'];
    const i=Math.min(Math.floor(Math.log(bytes)/Math.log(k)), sizes.length-1);
    const val=bytes/Math.pow(k,i);
    return `${val.toFixed(i===0?0:1)} ${sizes[i]}`;
  }
  function formatDate(ts){ try{ return new Date(ts).toLocaleString(); }catch{ return ''; } }

  async function updateImagesMetaCache(){
    try{
      const items = await IDB.listAll();
      const meta = items.map(({id,name,size,type,createdAt})=>({id,name,size,type,createdAt}));
      sessionStorage.setItem(IMAGES_META_KEY, JSON.stringify(meta));
      mergeIntoMaster(); // subir cambios al maestro
    }catch{}
  }

  // ====== Reglas UI y comportamientos ======
  safe(()=>{
    const form = document.getElementById('ds160-personal1');
    if (!form) return;

    // Otros nombres -> No + ocultar
    const otherNamesN = document.getElementById('OtherNamesN');
    if (otherNamesN){ otherNamesN.checked=true; otherNamesN.dispatchEvent(new Event('change',{bubbles:true})); }
    const otherLabel = Array.from(document.querySelectorAll('label')).find(l=>/¿Ha utilizado otros nombres\?/i.test(l.textContent||''));
    if (otherLabel){ hide(otherLabel.closest('.row')||otherLabel.parentElement); }

    // Telecódigo -> No + ocultar
    const telecodeN = document.getElementById('TelecodeN');
    if (telecodeN){ telecodeN.checked=true; telecodeN.dispatchEvent(new Event('change',{bubbles:true})); }
    const teleLabel = Array.from(document.querySelectorAll('label')).find(l=>/telecódigo/i.test(l.textContent||''));
    if (teleLabel){ hide(teleLabel.closest('.row')||teleLabel.parentElement); }

    // Nombres / Apellidos
    const given = document.getElementById('APP_GIVEN_NAME');
    const surname = document.getElementById('APP_SURNAME');

    // Nombre completo en alfabeto nativo
    const fullNative = document.getElementById('APP_FULL_NAME_NATIVE');
    if (fullNative){
      const row = fullNative.closest('.row') || document.getElementById('row_full_name_native');
      const updateFull = ()=>{
        const g = (given?.value||'').trim();
        const s = (surname?.value||'').trim();
        fullNative.value = [g,s].filter(Boolean).join(' ').trim();
        mergeIntoMaster(); // mantener nombres al día
      };
      given?.addEventListener('input', updateFull);
      given?.addEventListener('change', updateFull);
      surname?.addEventListener('input', updateFull);
      surname?.addEventListener('change', updateFull);
      updateFull();

      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox){
        naCheckbox.checked=false;
        naCheckbox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naCheckbox.closest('.inline')
          || document.querySelector('label[for="APP_FULL_NAME_NATIVE_NA"]')?.parentElement || null;
        if (naContainer) hide(naContainer);
      }
      if (row) hide(row); // ocultar el campo
    }

    // Estado/Provincia visible; ocultar sólo "No aplica"
    const state = document.getElementById('POB_STATE');
    if (state){
      const stateRow = state.closest('.row'); if (stateRow) show(stateRow);
      const naBox = document.getElementById('POB_STATE_NA');
      if (naBox){
        naBox.checked=false; naBox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naBox.closest('.inline')
          || document.querySelector('label[for="POB_STATE_NA"]')?.parentElement || null;
        if (naContainer) hide(naContainer);
        const naLabel = document.querySelector('label[for="POB_STATE_NA"]');
        if (naLabel){
          const parent = naLabel.closest('.row')||naLabel.parentElement;
          if (parent && parent!==stateRow) hide(parent);
        }
      }
    }

    // País de nacimiento: fijar MÉXICO si existe
    const setMexicoOn = sel=>{
      if (!sel) return;
      const mxOpt = Array.from(sel.options).find(o=>{
        const t=(o.text||'').trim().toUpperCase(); return t==='MÉXICO'||t==='MEXICO';
      });
      if (mxOpt){ sel.value = mxOpt.value!=='' ? mxOpt.value : mxOpt.text; }
      sel.dispatchEvent(new Event('change', {bubbles:true}));
    };
    const visibleCountry = document.getElementById('POB_COUNTRY_VISIBLE');
    if (visibleCountry){ setMexicoOn(visibleCountry); show(visibleCountry.closest('.row')); }
    const hiddenCountry = document.getElementById('POB_COUNTRY');
    if (hiddenCountry){
      setMexicoOn(hiddenCountry);
      const cont = hiddenCountry.closest('.row') || document.getElementById('row_pob_country_container');
      if (cont?.classList?.contains('hide-red')) hide(cont);
    }

    // Fieldset "Imágenes" visible
    Array.from(document.querySelectorAll('fieldset')).forEach(fs=>{
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent||'')) show(fs);
    });

    // Traducciones de selects visibles
    const gender = document.getElementById('APP_GENDER');
    if (gender){
      gender.innerHTML = '<option value="">- Seleccione -</option>'
        + '<option value="MALE">Masculino</option>'
        + '<option value="FEMALE">Femenino</option>';
    }
    const ms = document.getElementById('APP_MARITAL_STATUS');
    if (ms){
      ms.innerHTML = [
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
  });

  // ====== Restaurar estado y primer merge ======
  safe(()=>{
    const form = document.getElementById('ds160-personal1');
    if (form) { restoreFormState(form); mergeIntoMaster(); }
  });

  // ====== Imágenes: UI ======
  safe(()=>{
    const input = document.getElementById('imagesNow');
    const uploadBtn = document.getElementById('uploadBtn');
    const refreshBtn = document.getElementById('refreshListBtn');
    const listWrap = document.getElementById('imagesList');
    const prog = document.getElementById('uploadProgress');
    const progText = document.getElementById('uploadProgressText');
    const status = document.getElementById('uploadStatusImages');

    function setProgress(pct, txt){ if (prog) prog.value=Math.max(0,Math.min(100,pct||0)); if (progText) progText.textContent=txt||''; }
    function setStatus(msg){ if (status) status.textContent = msg||''; }
    function clearListUI(){ if (listWrap) listWrap.innerHTML='<div class="muted">Sin archivos.</div>'; }
    function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    async function renderList(){
      if (!listWrap) return;
      const items = await IDB.listAll();
      if (!items?.length){ clearListUI(); await updateImagesMetaCache(); return; }
      const rows = items.map(rec=>`
        <tr data-id="${rec.id}">
          <td>${escapeHtml(rec.name)}</td>
          <td>${formatBytes(rec.size)}</td>
          <td>${rec.type?escapeHtml(rec.type):''}</td>
          <td>${formatDate(rec.createdAt)}</td>
          <td class="file-actions">
            <button type="button" data-action="view">Ver</button>
            <button type="button" data-action="download">Descargar</button>
            <button type="button" data-action="delete">Eliminar</button>
          </td>
        </tr>`).join('');
      listWrap.innerHTML = `
        <table class="files" aria-label="Archivos guardados">
          <thead><tr><th>Nombre</th><th>Tamaño</th><th>Tipo</th><th>Fecha</th><th>Acciones</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
      await updateImagesMetaCache();
    }

    async function handleActionClick(e){
      const btn = e.target.closest('button[data-action]'); if (!btn) return;
      const tr = btn.closest('tr[data-id]'); if (!tr) return;
      const id = tr.getAttribute('data-id');
      const action = btn.getAttribute('data-action');

      if (action==='delete'){ await IDB.remove(id); await renderList(); setStatus('Archivo eliminado.'); return; }

      if (action==='view' || action==='download'){
        const rec = await IDB.getById(id);
        if (!rec?.blob){ setStatus('No se pudo abrir el archivo.'); return; }
        const url = URL.createObjectURL(rec.blob);
        try{
          if (action==='view') window.open(url,'_blank','noopener');
          else { const a=document.createElement('a'); a.href=url; a.download=rec.name||'archivo'; document.body.appendChild(a); a.click(); a.remove(); }
        } finally { setTimeout(()=>URL.revokeObjectURL(url), 4000); }
      }
    }

    listWrap?.addEventListener('click', handleActionClick);

    uploadBtn?.addEventListener('click', async ()=>{
      try{
        const files = input?.files ? Array.from(input.files) : [];
        if (!files.length){ setStatus('No hay archivos seleccionados.'); return; }
        setStatus('Guardando...'); setProgress(0,'0%');
        const total = files.length; let done=0;
        for (const f of files){
          await IDB.putFile(f);
          done++; const pct = Math.round((done/total)*100);
          setProgress(pct, `${pct}% (${done}/${total})`);
        }
        setStatus(`Guardado: ${done} archivo(s).`);
        if (input) input.value='';
        await renderList();
      }catch(err){ console.error(err); setStatus('Error al guardar archivos.'); }
      finally{ setTimeout(()=>setProgress(0,''), 800); }
    });

    refreshBtn?.addEventListener('click', async ()=>{ await renderList(); setStatus('Lista actualizada.'); });
    renderList().catch(console.warn);
  });

  // ====== Botón Limpiar ======
  safe(()=>{
    const form = document.getElementById('ds160-personal1');
    const clearBtn = document.getElementById('clearBtn');
    if (!form || !clearBtn) return;
    clearBtn.addEventListener('click', ()=>{
      form.reset();
      sessionStorage.removeItem(FORM_KEY);
      sessionStorage.removeItem(FORM_KEY_RAW);
      Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
        el.dispatchEvent(new Event('change',{bubbles:true}));
        el.dispatchEvent(new Event('input',{bubbles:true}));
      });
      mergeIntoMaster(); // limpia sección en maestro
    });
  });

  // ====== Botón Siguiente ======
  safe(()=>{
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('ds160-personal1');
    if (!nextBtn || !form) return;

    form.addEventListener('submit', ev => ev.preventDefault());

    // Captura para asegurar merge antes de navegación
    nextBtn.addEventListener('click', ev=>{
      ev.preventDefault();
      removeRequiredFromHidden(form);
      if (!isFormValid(form)){
        alert('Faltan campos obligatorios. Revise antes de continuar.');
        return;
      }
      saveFormState(form);
      mergeIntoMaster(); // <-- FUSIÓN CLAVE

      const params = buildQueryFromForm(form);
      const nextUrl = new URL(NEXT_PAGE, window.location.href);
      nextUrl.search = params.toString();
      window.location.href = nextUrl.href;
    }, true);
  });

  // ====== Auto-guardado y auto-merge cada 3s ======
  safe(()=>{
    const form = document.getElementById('ds160-personal1');
    if (!form) return;
    let lastSnap='';
    setInterval(()=>{
      try{
        const norm = collectNormalized(form);
        const snap = JSON.stringify(norm);
        if (snap!==lastSnap){
          sessionStorage.setItem(FORM_KEY, snap);
          sessionStorage.setItem(FORM_KEY_RAW, JSON.stringify(collectRaw(form)));
          lastSnap = snap;
          mergeIntoMaster();
        }
      }catch{}
    }, 3000);
  });

  console.info('personal1.js listo. Maestro=', MASTER_KEY, 'Sección=', PAGE_KEY);
});
