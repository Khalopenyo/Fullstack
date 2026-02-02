export function setMeta({ title, description }) {
  if (typeof document === "undefined") return;
  if (title) document.title = title;

  if (description) {
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", description);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute("content", description);
  }

  if (title) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute("content", title);
  }
}

export function setRobots(content) {
  if (typeof document === "undefined") return;
  if (!content) return;
  let node = document.querySelector('meta[name="robots"]');
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("name", "robots");
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

export function setCanonical(url) {
  if (typeof document === "undefined") return;
  if (!url) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

export function setOpenGraphImage(url) {
  if (typeof document === "undefined") return;
  if (!url) return;
  const og = document.querySelector('meta[property="og:image"]');
  if (og) og.setAttribute("content", url);
  const tw = document.querySelector('meta[name="twitter:image"]');
  if (tw) tw.setAttribute("content", url);
}

export function setJsonLd(id, data) {
  if (typeof document === "undefined") return;
  const scriptId = id || "jsonld";
  let node = document.getElementById(scriptId);
  if (!node) {
    node = document.createElement("script");
    node.type = "application/ld+json";
    node.id = scriptId;
    document.head.appendChild(node);
  }
  node.text = JSON.stringify(data);
}

export function clearJsonLd(id) {
  if (typeof document === "undefined") return;
  const node = document.getElementById(id);
  if (node && node.parentNode) node.parentNode.removeChild(node);
}
