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

const parseCsvRow = (line, delimiter) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values.map((value) => value.trim());
};

const normalizeHeader = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const csvSchema = [
  { key: 'saldo_liquido', label: 'Saldo líquido', format: 'currency', placeholder: '1842500' },
  { key: 'receita_mensal', label: 'Receita mensal', format: 'currency', placeholder: '284000' },
  { key: 'ebitda', label: 'EBITDA', format: 'currency', placeholder: '96200' },
  { key: 'fluxo_caixa', label: 'Fluxo de caixa', format: 'currency', placeholder: '42800' },
  { key: 'margem_liquida', label: 'Margem líquida', format: 'percent', placeholder: '18.6' },
  { key: 'contas_receber', label: 'Contas a receber em dia', format: 'percent', placeholder: '90' },
  { key: 'cobertura_dividas', label: 'Cobertura de dívidas (x)', format: 'decimal-x', placeholder: '7.3' },
  { key: 'economia_custos', label: 'Economia em custos', format: 'currency-short', placeholder: '48000' },
  { key: 'equipe', label: 'Equipe (%)', format: 'percent', placeholder: '76' },
  { key: 'marketing', label: 'Marketing (%)', format: 'percent', placeholder: '48' },
  { key: 'operacao', label: 'Operação (%)', format: 'percent', placeholder: '61' },
];

const createFieldLookup = () => {
  const lookup = new Map();
  csvSchema.forEach((field) => {
    lookup.set(normalizeHeader(field.key), field.key);
    lookup.set(normalizeHeader(field.label), field.key);
    lookup.set(normalizeHeader(field.label.replace('%', ' percent')), field.key);
  });
  return lookup;
};

const fieldLookup = createFieldLookup();

const getSchemaField = (key) => csvSchema.find((field) => field.key === key);

const tryMatchFieldKey = (value) => {
  const normalized = normalizeHeader(value);
  return fieldLookup.get(normalized) || null;
};

const parseTableRows = (rows) => {
  const cleaned = rows.map((row) => row.map((cell) => (cell == null ? '' : String(cell).trim())));
  const nonEmpty = cleaned.filter((row) => row.some((cell) => cell !== ''));
  if (!nonEmpty.length) return [];

  const headerRow = nonEmpty[0].map((cell) => normalizeHeader(cell));
  const keyIndex = headerRow.findIndex((cell) => ['key', 'chave'].includes(cell));
  const valueIndex = headerRow.findIndex((cell) => ['value', 'valor', 'amount', 'quantia', 'quantidade'].includes(cell));
  const formatIndex = headerRow.findIndex((cell) => ['format', 'formato', 'tipo'].includes(cell));

  if (keyIndex !== -1 && valueIndex !== -1) {
    return nonEmpty.slice(1).reduce((items, row) => {
      const key = String(row[keyIndex] || '').trim();
      if (!key) return items;
      items.push({
        key,
        value: row[valueIndex] ?? '',
        format: row[formatIndex] || getSchemaField(key)?.format || 'number',
      });
      return items;
    }, []);
  }

  const mappedHeaders = headerRow.map((cell) => tryMatchFieldKey(cell));
  const matchedHeaders = mappedHeaders
    .map((key, index) => ({ key, index }))
    .filter((field) => field.key);

  if (matchedHeaders.length >= 2 && nonEmpty.length > 1) {
    return matchedHeaders.map(({ key, index }) => ({
      key,
      value: nonEmpty[1][index] ?? '',
      format: getSchemaField(key)?.format || 'number',
    }));
  }

  const verticalItems = nonEmpty.reduce((items, row) => {
    const key = tryMatchFieldKey(row[0]);
    if (!key) return items;
    items.push({
      key,
      value: row[1] ?? '',
      format: row[2] || getSchemaField(key)?.format || 'number',
    });
    return items;
  }, []);

  if (verticalItems.length >= 3) {
    return verticalItems;
  }

  const fallback = nonEmpty.slice(1).reduce((items, row) => {
    const key = tryMatchFieldKey(row[0]);
    if (!key) return items;
    items.push({
      key,
      value: row[1] ?? '',
      format: row[2] || getSchemaField(key)?.format || 'number',
    });
    return items;
  }, []);

  return fallback;
};

const parseCsv = (text) => {
  const sanitized = text.replace(/\uFEFF/g, '').trim();
  const rows = sanitized
    .split(/\r?\n/)
    .filter((row) => row.trim() !== '')
    .map((row) => {
      const delimiter = row.includes(';') && !row.includes(',') ? ';' : ',';
      return parseCsvRow(row, delimiter);
    });

  return parseTableRows(rows);
};

const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          reject(new Error('Nenhuma planilha encontrada no arquivo Excel.'));
          return;
        }
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(parseTableRows(rows));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo Excel.'));
    reader.readAsArrayBuffer(file);
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

const showNotification = (message, duration = 3200) => {
  let notification = document.getElementById('dashboardNotification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'dashboardNotification';
    notification.style.position = 'fixed';
    notification.style.right = '20px';
    notification.style.bottom = '20px';
    notification.style.padding = '14px 18px';
    notification.style.borderRadius = '16px';
    notification.style.background = 'rgba(15, 35, 60, 0.95)';
    notification.style.color = '#fff';
    notification.style.boxShadow = '0 24px 60px rgba(0,0,0,0.35)';
    notification.style.zIndex = '20';
    notification.style.maxWidth = '320px';
    notification.style.fontSize = '0.95rem';
    notification.style.lineHeight = '1.4';
    document.body.appendChild(notification);
  }
  notification.textContent = message;
  notification.style.opacity = '1';
  setTimeout(() => {
    notification.style.opacity = '0';
  }, duration);
};

const buildMetricForm = (metrics = {}) => {
  const container = document.createElement('div');
  container.className = 'editor-grid';

  csvSchema.forEach((field) => {
    const row = document.createElement('div');
    row.className = 'editor-row';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = `field-${field.key}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `field-${field.key}`;
    input.dataset.key = field.key;
    input.placeholder = field.placeholder;
    input.value = metrics[field.key] ? metrics[field.key].value || metrics[field.key] : '';

    const hint = document.createElement('span');
    hint.className = 'field-hint';
    hint.textContent = field.format;

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(hint);
    container.appendChild(row);
  });

  return container;
};

const getFormCsv = () => {
  const lines = ['key,value,format'];
  csvSchema.forEach((field) => {
    const input = document.querySelector(`input[data-key="${field.key}"]`);
    const value = input ? input.value.trim() : '';
    lines.push(`${field.key},${value},${field.format}`);
  });
  return lines.join('\n');
};

const generateEditor = (csv) => {
  const editorBody = document.getElementById('editorBody');
  editorBody.innerHTML = '';

  const uploadLabel = document.createElement('label');
  uploadLabel.className = 'editor-input-label';
  uploadLabel.innerHTML = 'Upload CSV ou Excel <input type="file" id="csvUpload" accept=".csv,.xlsx,.xls,.xlsm,.xlsb" />';
  editorBody.appendChild(uploadLabel);

  const urlLabel = document.createElement('label');
  urlLabel.className = 'editor-input-label';
  urlLabel.innerHTML =
    'Importar URL (Google Sheets ou CSV público) <input type="url" id="csvUrl" placeholder="https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=0" />';
  editorBody.appendChild(urlLabel);

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.id = 'importUrl';
  importButton.className = 'secondary';
  importButton.textContent = 'Importar URL';
  editorBody.appendChild(importButton);

  const metrics = Object.fromEntries(parseCsv(csv).map((row) => [row.key, row]));
  const form = buildMetricForm(metrics);
  editorBody.appendChild(form);

  const info = document.createElement('p');
  info.style.color = 'var(--muted)';
  info.style.fontSize = '0.95rem';
  info.style.margin = '0';
  info.textContent =
    'Preencha cada célula com o valor correto. O nome exato da chave está à esquerda e o formato esperado aparece embaixo.';
  editorBody.appendChild(info);

  const fileInput = uploadLabel.querySelector('input');
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    const handleCsv = (csvText) => {
      const parsed = parseCsv(csvText);
      const metrics = Object.fromEntries(parsed.map((row) => [row.key, row]));
      editorBody.querySelector('.editor-grid').replaceWith(buildMetricForm(metrics));
      showNotification('Dados carregados no editor. Clique em Salvar para aplicar.');
    };

    const handleAnyText = (csvText) => {
      const parsed = parseCsv(csvText);
      if (!parsed.length) {
        showNotification('Não foi possível identificar os dados na planilha. Confira os cabeçalhos ou o formato.');
        return;
      }
      const metrics = Object.fromEntries(parsed.map((row) => [row.key, row]));
      editorBody.querySelector('.editor-grid').replaceWith(buildMetricForm(metrics));
      showNotification('Dados carregados no editor. Clique em Salvar para aplicar.');
    };

    if (extension === 'xls' || extension === 'xlsx' || extension === 'xlsm' || extension === 'xlsb') {
      parseExcelFile(file)
        .then((parsed) => {
          if (!parsed.length) {
            showNotification('Não foi possível identificar os dados no Excel. Verifique a planilha.');
            return;
          }
          const metrics = Object.fromEntries(parsed.map((row) => [row.key, row]));
          editorBody.querySelector('.editor-grid').replaceWith(buildMetricForm(metrics));
          showNotification('Dados carregados no editor. Clique em Salvar para aplicar.');
        })
        .catch((error) => {
          console.error(error);
          showNotification('Não foi possível ler o arquivo Excel. Verifique o formato.');
        });
    } else {
      const reader = new FileReader();
      reader.onload = () => handleAnyText(reader.result);
      reader.onerror = () => showNotification('Não foi possível ler o arquivo CSV.');
      reader.readAsText(file, 'UTF-8');
    }
  });

  importButton.addEventListener('click', () => {
    const urlInput = document.getElementById('csvUrl');
    const url = urlInput.value.trim();
    if (!url) {
      showNotification('Cole a URL do CSV ou do Google Sheets antes de importar.');
      return;
    }
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('URL inválida ou planilha indisponível');
        return res.text();
      })
      .then((csvText) => {
        const parsed = parseCsv(csvText);
        if (!parsed.length) {
          showNotification('Não foi possível identificar os dados na planilha. Verifique o arquivo ou o URL.');
          return;
        }
        const metrics = Object.fromEntries(parsed.map((row) => [row.key, row]));
        editorBody.querySelector('.editor-grid').replaceWith(buildMetricForm(metrics));
        showNotification('Planilha importada com sucesso.');
      })
      .catch((error) => {
        console.error(error);
        showNotification('Não foi possível importar o CSV. Verifique a URL.');
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
    const localCsv = loadLocalCsv();
    if (localCsv) {
      generateEditor(localCsv);
    } else {
      fetch(defaultCsv).then((res) => res.text()).then(generateEditor);
    }
  };

  openEditor.addEventListener('click', open);
  closeEditor.addEventListener('click', () => editorOverlay.classList.add('hidden'));

  saveData.addEventListener('click', () => {
    const csvText = getFormCsv();
    saveLocalCsv(csvText);
    applyData(csvText);
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
    const csvText = document.querySelector('.editor-grid') ? getFormCsv() : loadLocalCsv() || '';
    if (!csvText) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));
    link.download = 'dashboard-data.csv';
    link.click();
  });

  const downloadTemplate = document.getElementById('downloadTemplate');
  downloadTemplate.addEventListener('click', () => {
    const template = `chave;valor;formato
saldo_liquido;1842500;currency
receita_mensal;284000;currency
ebitda;96200;currency
fluxo_caixa;42800;currency
margem_liquida;18.6;percent
contas_receber;90;percent
cobertura_dividas;7.3;decimal-x
economia_custos;48000;currency-short
equipe;76;percent
marketing;48;percent
operacao;61;percent
`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([template], { type: 'text/csv' }));
    link.download = 'template-dashboard.csv';
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
