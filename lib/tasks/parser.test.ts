import { describe, expect, it } from 'vitest';
import { parseTasksFromMarkdown } from './parser';

describe('parseTasksFromMarkdown', () => {
  it('returns [] for empty input', () => {
    expect(parseTasksFromMarkdown('').tasks).toEqual([]);
  });

  it('returns [] for headings with no tasks', () => {
    expect(parseTasksFromMarkdown('## A\n\n## B\nsome prose').tasks).toEqual([]);
  });

  it('parses a single task with no section', () => {
    const { tasks } = parseTasksFromMarkdown('- [ ] Do the thing');
    expect(tasks).toEqual([
      { label: 'Do the thing', section: null, initialChecked: false },
    ]);
  });

  it('marks - [x] / - [X] as initialChecked', () => {
    const { tasks } = parseTasksFromMarkdown('- [x] lower\n- [X] upper');
    expect(tasks.map((t) => t.initialChecked)).toEqual([true, true]);
  });

  it('strips leading/trailing whitespace from labels', () => {
    const { tasks } = parseTasksFromMarkdown('   - [ ]    spaced label   ');
    expect(tasks[0].label).toBe('spaced label');
  });

  it('attributes 10 tasks across 3 sections', () => {
    const md = [
      '# Title (ignored)',
      '## Alpha',
      '- [ ] a1',
      '- [x] a2',
      '- [ ] a3',
      'a paragraph that is ignored',
      '## Beta',
      '- [ ] b1',
      '- [ ] b2',
      '## Gamma',
      '- [x] g1',
      '- [ ] g2',
      '- [ ] g3',
      '- [ ] g4',
      '- [ ] g5',
    ].join('\n');
    const { tasks } = parseTasksFromMarkdown(md);
    expect(tasks).toHaveLength(10);
    expect(tasks.filter((t) => t.section === 'Alpha')).toHaveLength(3);
    expect(tasks.filter((t) => t.section === 'Beta')).toHaveLength(2);
    expect(tasks.filter((t) => t.section === 'Gamma')).toHaveLength(5);
    expect(tasks[0]).toEqual({
      label: 'a1',
      section: 'Alpha',
      initialChecked: false,
    });
    expect(tasks[1].initialChecked).toBe(true);
  });

  it('ignores non-task lines (paragraphs, bullets without checkboxes)', () => {
    const md = '## S\nintro text\n- a plain bullet\n- [ ] real task\nmore text';
    const { tasks } = parseTasksFromMarkdown(md);
    expect(tasks).toEqual([
      { label: 'real task', section: 'S', initialChecked: false },
    ]);
  });

  it('parses checkboxes inside code blocks naively (v1 behaviour)', () => {
    const md = '## S\n```\n- [ ] looks like a task\n```\n- [ ] real task';
    const { tasks } = parseTasksFromMarkdown(md);
    // Code fences are not stripped in v1, so both lines are parsed.
    expect(tasks.map((t) => t.label)).toEqual([
      'looks like a task',
      'real task',
    ]);
  });
});
