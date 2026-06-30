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

const defaultCsv = './data.csv';
const sheetUrl = new URLSearchParams(window.location.search).get('sheet');
const source = sheetUrl ? sheetUrl : defaultCsv;

fetch(source)
  .then((response) => {
    if (!response.ok) throw new Error('CSV não encontrado');
    return response.text();
  })
  .then(parseCsv)
  .then(populateDashboard)
  .catch((error) => {
    document.querySelector('.dashboard-shell').insertAdjacentHTML(
      'afterbegin',
      '<p class="error-banner">Não foi possível carregar os dados da planilha.</p>'
    );
    console.error(error);
  });
