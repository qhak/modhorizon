/** @param {string} text @returns {Record<string, string>} */
export function parseLocalSettings(text) {
  const settings = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) settings[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return settings;
}
