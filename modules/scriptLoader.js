const loadedScripts = new Map();

export const loadScript = src => {
  if (!loadedScripts.has(src)) loadedScripts.set(src, new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Skript konnte nicht geladen werden: ${src}`));
    document.head.appendChild(script);
  }));
  return loadedScripts.get(src);
};
