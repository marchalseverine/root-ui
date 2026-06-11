'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge, Card } from '@/components/ui';
import type { Project } from '@/lib/types';
import { MiniPipeline } from './MiniPipeline';

export function ProjectCard({ project }: { project: Project }) {
  const tp = useTranslations('pipeline');
  const td = useTranslations('dashboard');
  const stageLabel = tp(`stages.${project.stage}` as 'stages.1');

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card shadow className="flex h-full flex-col gap-3 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-lg text-white">{project.name}</h3>
          <Badge variant={project.status === 'archived' ? 'pending' : 'active'}>
            {project.status}
          </Badge>
        </div>
        {project.description && (
          <p className="line-clamp-2 font-body text-sm text-gray-400">
            {project.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-body text-xs uppercase tracking-wide text-gray-400">
            {td('card.stage')} {project.stage} · {stageLabel}
          </span>
          <MiniPipeline stage={project.stage} />
        </div>
      </Card>
    </Link>
  );
}
