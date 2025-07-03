// lib/swr.ts
export const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Fetch error");
    return res.json();
  });
