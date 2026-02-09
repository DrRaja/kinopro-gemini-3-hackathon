const cachedImages = new Set<string>();
const inflight = new Map<string, Promise<void>>();

export function preloadImages(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const tasks = uniqueUrls.map((url) => {
    if (cachedImages.has(url)) {
      return Promise.resolve();
    }
    const existing = inflight.get(url);
    if (existing) {
      return existing;
    }
    const task = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        cachedImages.add(url);
        inflight.delete(url);
        resolve();
      };
      img.onerror = () => {
        inflight.delete(url);
        resolve();
      };
      img.src = url;
    });
    inflight.set(url, task);
    return task;
  });
  return Promise.all(tasks).then(() => undefined);
}
