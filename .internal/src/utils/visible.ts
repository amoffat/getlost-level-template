export function onVisible(
  element: Element,
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry: IntersectionObserverEntry) => {
        if (entry.isIntersecting) callback(entry);
      });
    },
    options
  );
  observer.observe(element);
  return observer;
}
