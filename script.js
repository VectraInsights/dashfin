const elements = document.querySelectorAll('[data-field]');

const formatValue = (value, formatType) => {
  if (formatType === 'currency') {
    return `R$ ${Number(value).toLocaleString('pt-BR')}`;
  }
  if (formatType === 'currency-short') {
    const absValue = Math.abs(Number(value));
    if (absValue >= 1000000) {
      return `R$ ${(absValue / 1000000).toFixed(1).replace('.0', '')}M`;
    }
    if (absValue >= 1000) {
      return `R$ ${(absValue / 1000).toFixed(0)}K`;
    }
    return `R$ ${Math.round(absValue)}`;
  }
  if (formatType === 'percent') {
    return `${Number(value).toFixed(1).replace('.0', '')}%`;
  }
  if (formatType === 'decimal-x') {
    return `${Number(value).toFixed(1).replace('.0', '')}x`;
  }
  return `${value}`;
};

const animateValue = (element, target, formatType) => {
  const duration = 1000;
  const startTime = performance.now();
  const numericTarget = Number(target);

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = numericTarget * eased;

    if (element.tagName === 'I') {
      element.style.width = `${Math.max(0, Math.min(100, currentValue))}%`;
    } else if (formatType === 'percent') {
      element.textContent = `${currentValue.toFixed(1).replace('.0', '')}%`;
    } else if (formatType === 'decimal-x') {
      element.textContent = `${currentValue.toFixed(1).replace('.0', '')}x`;
    } else if (formatType === 'currency') {
      element.textContent = `R$ ${Math.round(currentValue).toLocaleString('pt-BR')}`;
    } else if (formatType === 'currency-short') {
      const absValue = Math.abs(currentValue);
      if (absValue >= 1000000) {
        element.textContent = `R$ ${(absValue / 1000000).toFixed(1).replace('.0', '')}M`;
      } else if (absValue >= 1000) {
        element.textContent = `R$ ${(absValue / 1000).toFixed(0)}K`;
      } else {
        element.textContent = `R$ ${Math.round(absValue)}`;
      }
    } else {
      element.textContent = `${currentValue.toFixed(1).replace('.0', '')}`;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      const finalValue = formatValue(target, formatType);
      element.textContent = finalValue;
      if (element.tagName === 'I') {
        element.style.width = `${Math.max(0, Math.min(100, Number(target)))}%`;
      }
    }
  };

  requestAnimationFrame(step);
};

const parseCsv = (text) => {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = rows[0].split(',').map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const values = row.split(',').map((value) => value.trim());
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
};

const populateDashboard = (data) => {
  const metrics = Object.fromEntries(data.map((row) => [row.key, row]));

  elements.forEach((element) => {
    const field = element.getAttribute('data-field');
    const metric = metrics[field];
    if (!metric) return;

    const formatType = element.getAttribute('data-format') || metric.format || 'number';
    animateValue(element, metric.value, formatType);
  });
};

const localStorageKey = 'dashboard-data-csv';
const defaultCsv = './data.csv';
const sheetUrl = new URLSearchParams(window.location.search).get('sheet');
const source = sheetUrl ? sheetUrl : null;

const loadLocalCsv = () => {
  return localStorage.getItem(localStorageKey);
};

const saveLocalCsv = (csv) => {
  localStorage.setItem(localStorageKey, csv);
};

const generateEditor = (csv) => {
  const editorBody = document.getElementById('editorBody');
  editorBody.innerHTML = '';

  const uploadLabel = document.createElement('label');
  uploadLabel.className = 'editor-input-label';
  uploadLabel.innerHTML = 'Upload CSV <input type="file" id="csvUpload" accept=".csv" />';
  editorBody.appendChild(uploadLabel);

  const urlLabel = document.createElement('label');
  urlLabel.className = 'editor-input-label';
  urlLabel.innerHTML = 'Importar URL (Google Sheets ou CSV público) <input type="url" id="csvUrl" placeholder="https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=0" />';
  editorBody.appendChild(urlLabel);

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.id = 'importUrl';
  importButton.className = 'secondary';
  importButton.textContent = 'Importar URL';
  editorBody.appendChild(importButton);

  const textArea = document.createElement('textarea');
  textArea.rows = 12;
  textArea.value = csv;
  textArea.id = 'dataCsvEditor';
  editorBody.appendChild(textArea);

  const info = document.createElement('p');
  info.style.color = 'var(--muted)';
  info.style.fontSize = '0.95rem';
  info.style.margin = '0';
  info.textContent = 'Você pode fazer upload de um arquivo CSV ou colar o link de uma planilha pública.
  Depois clique em Salvar no navegador para aplicar os dados.';
  editorBody.appendChild(info);

  const fileInput = uploadLabel.querySelector('input');
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      textArea.value = reader.result;
    };
    reader.readAsText(file, 'UTF-8');
  });

  importButton.addEventListener('click', () => {
    const urlInput = document.getElementById('csvUrl');
    const url = urlInput.value.trim();
    if (!url) return;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('URL inválida ou planilha indisponível');
        return res.text();
      })
      .then((csvText) => {
        textArea.value = csvText;
        applyData(csvText);
      })
      .catch((error) => {
        console.error(error);
        alert('Não foi possível importar o CSV. Verifique a URL.');
      });
  });
};

const applyData = (csvText) => {
  const data = parseCsv(csvText);
  populateDashboard(data);
};

const initEditor = () => {
  const openEditor = document.getElementById('openEditor');
  const closeEditor = document.getElementById('closeEditor');
  const saveData = document.getElementById('saveData');
  const resetData = document.getElementById('resetData');
  const downloadCsv = document.getElementById('downloadCsv');
  const editorOverlay = document.getElementById('editorOverlay');

  const open = () => {
    editorOverlay.classList.remove('hidden');
    if (!document.getElementById('dataCsvEditor')) {
      const localCsv = loadLocalCsv();
      if (localCsv) {
        generateEditor(localCsv);
      } else {
        fetch(defaultCsv).then((res) => res.text()).then(generateEditor);
      }
    }
  };

  openEditor.addEventListener('click', open);
  closeEditor.addEventListener('click', () => editorOverlay.classList.add('hidden'));

  saveData.addEventListener('click', () => {
    const textArea = document.getElementById('dataCsvEditor');
    if (!textArea) return;
    saveLocalCsv(textArea.value);
    applyData(textArea.value);
    editorOverlay.classList.add('hidden');
  });

  resetData.addEventListener('click', () => {
    localStorage.removeItem(localStorageKey);
    fetch(defaultCsv)
      .then((res) => res.text())
      .then((text) => {
        generateEditor(text);
        applyData(text);
      });
  });

  downloadCsv.addEventListener('click', () => {
    const csvText = document.getElementById('dataCsvEditor')?.value || loadLocalCsv() || '';
    if (!csvText) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));
    link.download = 'dashboard-data.csv';
    link.click();
  });
};

const initialLoad = () => {
  const localCsv = loadLocalCsv();

  if (source) {
    fetch(source)
      .then((response) => {
        if (!response.ok) throw new Error('CSV não encontrado');
        return response.text();
      })
      .then((csvText) => {
        saveLocalCsv(csvText);
        applyData(csvText);
      })
      .catch((error) => {
        document.querySelector('.dashboard-shell').insertAdjacentHTML(
          'afterbegin',
          '<p class="error-banner">Não foi possível carregar os dados da planilha.</p>'
        );
        console.error(error);
      });
    return;
  }

  if (localCsv) {
    applyData(localCsv);
    return;
  }

  fetch(defaultCsv)
    .then((response) => {
      if (!response.ok) throw new Error('CSV não encontrado');
      return response.text();
    })
    .then((csvText) => applyData(csvText))
    .catch((error) => {
      document.querySelector('.dashboard-shell').insertAdjacentHTML(
        'afterbegin',
        '<p class="error-banner">Não foi possível carregar os dados da planilha.</p>'
      );
      console.error(error);
    });
};

window.addEventListener('DOMContentLoaded', () => {
  initEditor();
  initialLoad();
});
