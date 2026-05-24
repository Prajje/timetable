export function openDrawer(drawerEl, contentBuilder) {
  drawerEl.innerHTML = '';
  contentBuilder(drawerEl);
  drawerEl.hidden = false;

  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => {
    drawerEl.classList.add('open');
    backdrop.classList.add('open');
  });

  function close() {
    drawerEl.classList.remove('open');
    backdrop.classList.remove('open');
    setTimeout(() => {
      drawerEl.hidden = true;
      backdrop.remove();
    }, 280);
  }
  backdrop.addEventListener('click', close);
  drawerEl._close = close;
  return close;
}

export function closeDrawer(drawerEl) {
  drawerEl._close?.();
}
