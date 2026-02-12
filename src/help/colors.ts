import pc from "picocolors";

export const COLOR_HEADING = (text: string) => pc.bold(pc.cyan(text));
export const COLOR_COMMAND = (text: string) => pc.green(text);
export const COLOR_MODEL = (text: string) => pc.yellow(text);
export const COLOR_SECTION = (text: string) => pc.bold(pc.magenta(text));
export const COLOR_TERM = (text: string) => pc.bold(pc.cyan(text));
export const COLOR_META = (text: string) => pc.dim(text);
export const COLOR_GOOD = (text: string) => pc.green(text);
export const COLOR_BAD = (text: string) => pc.red(text);

function colorExampleLine(line: string) {
  const parts = line.match(/"[^"]*"|\S+/g);
  if (!parts || parts.length === 0) {
    return COLOR_COMMAND(line);
  }

  return parts
    .map((part, index) => {
      if (part.startsWith("\"") && part.endsWith("\"")) {
        return COLOR_MODEL(part);
      }

      if (part.startsWith("-")) {
        return COLOR_TERM(part);
      }

      if (index === 0) {
        return COLOR_COMMAND(part);
      }

      return COLOR_META(part);
    })
    .join(" ");
}

export function colorizeHelp(output: string) {
  return output
    .replace(/^Usage:/gm, COLOR_SECTION("Usage:"))
    .replace(/^Arguments:/gm, COLOR_SECTION("Arguments:"))
    .replace(/^Options:/gm, COLOR_SECTION("Options:"))
    .replace(/^\s{2}(-[^\s,]+,[ \t]+--[^\s]+[ \t]*(?:<[^>]+>)?)/gm, (_, term: string) => {
      return `  ${COLOR_TERM(term)}`;
    })
    .replace(/^\s{2}([a-zA-Z][^\s]*)[ \t]{2,}/gm, (_, term: string) => {
      if (term === "Examples:" || term === "Available") {
        return `  ${term}  `;
      }

      return `  ${COLOR_TERM(term)}  `;
    })
    .replace(/^(yap .*)$/gm, (_, line: string) => `  ${colorExampleLine(line)}`)
    .replace(/\((default:[^)]+)\)/g, (_, text: string) => `(${COLOR_META(text)})`)
    .replace(/\((choices:[^)]+)\)/g, (_, text: string) => `(${COLOR_META(text)})`);
}
