let busyDepth = 0;
let busyTimer = null;

const busyOverlayDelay = 180;
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

const setBusyVisible = visible => {
  document.body.classList.toggle("is-busy-visible", visible);
  document.querySelector("#busy-indicator")?.toggleAttribute("hidden", !visible);
};

const beginBusy = ({ immediate = false } = {}) => {
  busyDepth += 1;
  document.body.classList.add("is-busy");
  if (immediate) {
    if (busyTimer) clearTimeout(busyTimer);
    busyTimer = null;
    setBusyVisible(true);
    return;
  }
  if (!busyTimer) busyTimer = setTimeout(() => {
    busyTimer = null;
    if (busyDepth > 0) setBusyVisible(true);
  }, busyOverlayDelay);
};

const endBusy = () => {
  busyDepth = Math.max(0, busyDepth - 1);
  if (busyDepth > 0) return;
  if (busyTimer) clearTimeout(busyTimer);
  busyTimer = null;
  document.body.classList.remove("is-busy");
  setBusyVisible(false);
};

export const runBusy = async (task, options = {}) => {
  beginBusy(options);
  try {
    if (options.defer) await nextFrame();
    return await task();
  } finally {
    endBusy();
  }
};
