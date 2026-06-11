export type Locale = 'en' | 'fr' | 'es';
export type ProjectStatus = 'active' | 'archived' | 'deleted';
export type ArtifactType = 'prd' | 'spec' | 'tasks';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  stage: number;
  status: ProjectStatus;
  is_demo: boolean;
  prompt_language: Locale;
  gate_prd: boolean;
  gate_spec: boolean;
  gate_tasks: boolean;
  gate_build: boolean;
  gate_deploy: boolean;
  last_deploy_check_at: string | null;
  last_deploy_check_passed: boolean | null;
  last_deploy_check_detail: unknown;
  created_at: string;
  updated_at: string;
}

export interface ArtifactSummary {
  id: string;
  content: string;
  approved_at: string | null;
  prompt_lang: Locale;
}

export interface TaskStats {
  total: number;
  checked: number;
}

export interface ProjectDetail extends Project {
  latest_artifacts: Record<ArtifactType, ArtifactSummary | null>;
  task_stats: TaskStats;
}

export interface Task {
  id: string;
  project_id: string;
  artifact_id: string;
  position: number;
  label: string;
  section: string | null;
  checked: boolean;
  checked_at: string | null;
}

export const STAGE_COUNT = 6;
export const GATE_BY_STAGE: Record<number, keyof Project> = {
  2: 'gate_prd',
  3: 'gate_spec',
  4: 'gate_tasks',
  5: 'gate_build',
  6: 'gate_deploy',
};
