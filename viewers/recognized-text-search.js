/** Shared find controls for the image OCR and PDF text panels. */
export function attachRecognizedTextSearch(slot, lines, scroller, label = 'Search recognized text') {
  const form = document.createElement('form');
  form.setAttribute('role', 'search'); form.setAttribute('aria-label', label);
  const id = `sacda-text-search-${crypto.randomUUID()}`;
  const title = document.createElement('label'); title.htmlFor = id; title.textContent = label;
  title.className = 'text-xs font-bold text-muted-foreground tracking-wider mb-1';
  const input = document.createElement('input'); input.id = id; input.type = 'search';
  input.className = 'form-search w-full'; input.autocomplete = 'off';
  const controls = document.createElement('div'); controls.className = 'sacda-text-search-controls';
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '↑'; previous.title = 'Previous match';
  const next = document.createElement('button'); next.type = 'button'; next.textContent = '↓'; next.title = 'Next match';
  previous.className = next.className = 'sacda-panel-toggle';
  previous.setAttribute('aria-label', 'Previous text match'); next.setAttribute('aria-label', 'Next text match');
  const status = document.createElement('span'); status.className = 'text-sm'; status.setAttribute('role', 'status');
  controls.append(previous, next, status); form.append(title, input, controls); slot.append(form);
  let matches = []; let current = -1; let focusIndex = 0;
  const hint = document.createElement('p'); hint.id = `${id}-keys`; hint.className = 'visually-hidden';
  hint.textContent = 'Use Up and Down arrow keys to move between text lines. Press Enter to show a line on the image.';
  form.append(hint); lines.setAttribute('role', 'group'); lines.setAttribute('aria-label', 'Recognized text lines');
  lines.setAttribute('aria-describedby', hint.id);
  const setTabStop = index => {
    const buttons = [...lines.querySelectorAll('[data-ocr-line]')];
    focusIndex = Math.max(0, Math.min(index, buttons.length - 1));
    buttons.forEach((line, n) => { line.tabIndex = n === focusIndex ? 0 : -1; });
    return buttons[focusIndex];
  };
  const normalize = text => text.normalize('NFC').toLocaleLowerCase();
  const reveal = line => {
    if (!line) return;
    const box = line.getBoundingClientRect(); const area = scroller.getBoundingClientRect();
    const clearance = Math.min(slot.getBoundingClientRect().height + 16, area.height - 32);
    if (box.top < area.top + clearance || box.bottom > area.bottom) {
      scroller.scrollTop += box.top - area.top - clearance;
    }
  };
  const announce = () => {
    previous.disabled = next.disabled = matches.length === 0;
    status.textContent = !input.value.trim() ? '' : matches.length === 0 ? 'No matches'
      : `${current + 1} of ${matches.length} matching lines`;
  };
  const select = (index, scroll = false) => {
    matches.forEach((line, n) => {
      line.classList.toggle('sacda-ocr-current', n === index);
      if (n === index) line.setAttribute('aria-current', 'true'); else line.removeAttribute('aria-current');
    });
    current = index; announce();
    if (scroll) { setTabStop([...lines.querySelectorAll('[data-ocr-line]')].indexOf(matches[index])); reveal(matches[index]); matches[index]?.click(); }
  };
  const update = () => {
    setTabStop(focusIndex);
    const query = normalize(input.value.trim());
    lines.querySelectorAll('[data-ocr-line]').forEach(line => {
      line.classList.remove('sacda-ocr-match', 'sacda-ocr-current'); line.removeAttribute('aria-current');
    });
    matches = query ? [...lines.querySelectorAll('[data-ocr-line]')].filter(line => normalize(line.textContent).includes(query)) : [];
    matches.forEach(line => line.classList.add('sacda-ocr-match')); select(matches.length ? 0 : -1);
  };
  const move = delta => { if (matches.length) select((current + delta + matches.length) % matches.length, true); };
  const submit = event => { event.preventDefault(); move(1); };
  form.addEventListener('submit', submit); input.addEventListener('input', update);
  previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
  const keys = event => {
    if (!event.target.matches('[data-ocr-line]') || event.ctrlKey || event.metaKey || event.altKey) return;
    const buttons = [...lines.querySelectorAll('[data-ocr-line]')];
    const index = buttons.indexOf(event.target);
    const nextIndex = { ArrowDown: Math.min(index + 1, buttons.length - 1), ArrowUp: Math.max(index - 1, 0), Home: 0, End: buttons.length - 1 }[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault(); const line = setTabStop(nextIndex); line?.focus({ preventScroll: true }); reveal(line);
  };
  const focus = event => { if (event.target.matches('[data-ocr-line]')) setTabStop([...lines.querySelectorAll('[data-ocr-line]')].indexOf(event.target)); };
  lines.addEventListener('keydown', keys); lines.addEventListener('focusin', focus);
  const observer = new MutationObserver(update); observer.observe(lines, { childList: true, subtree: true, characterData: true });
  update();
  return () => { observer.disconnect(); lines.removeEventListener('keydown', keys); lines.removeEventListener('focusin', focus); form.remove(); };
}
