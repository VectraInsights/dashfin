const targets = document.querySelectorAll('[data-target]');

const animateValue = (element, target) => {
  const currentText = element.textContent;
  const prefix = currentText.includes('R$') ? 'R$ ' : '';
  const suffix = currentText.includes('%') ? '%' : '';
  const numericTarget = Number(String(target).replace(/[R$%.,]/g, ''));

  const duration = 1200;
  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = numericTarget * eased;

    if (String(target).includes('.')) {
      element.textContent = `${prefix}${currentValue.toFixed(1)}${suffix}`;
    } else if (currentText.includes('R$')) {
      element.textContent = `${prefix}${Math.round(currentValue).toLocaleString('pt-BR')}${suffix}`;
    } else {
      element.textContent = `${currentValue.toFixed(1)}${suffix}`;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = `${prefix}${String(target)}${suffix}`;
    }
  };

  requestAnimationFrame(step);
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const target = element.getAttribute('data-target');
        animateValue(element, target);
        observer.unobserve(element);
      }
    });
  },
  { threshold: 0.5 }
);

targets.forEach((target) => observer.observe(target));
