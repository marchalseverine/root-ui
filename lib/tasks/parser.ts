export interface ParsedTask {
  label: string;
  section: string | null;
  initialChecked: boolean;
}

const HEADING_RE = /^\s*#{2,6}\s+(.+?)\s*$/;
const TASK_RE = /^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/;

/**
 * Parse a tasks markdown document into checklist items.
 * - `## Heading` (level 2+) sets the current `section`.
 * - `- [ ] Label` / `- [x] Label` become tasks (1-based position by order).
 * - Everything else is ignored. Code blocks are parsed naively (v1).
 */
export function parseTasksFromMarkdown(content: string): { tasks: ParsedTask[] } {
  const tasks: ParsedTask[] = [];
  let section: string | null = null;

  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    const task = line.match(TASK_RE);
    if (task) {
      tasks.push({
        label: task[2].trim(),
        section,
        initialChecked: task[1].toLowerCase() === 'x',
      });
    }
  }

  return { tasks };
}
