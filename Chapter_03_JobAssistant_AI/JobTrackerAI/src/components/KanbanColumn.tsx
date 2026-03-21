import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Job, JobStatus } from '../types';
import { JobCard } from './JobCard';

interface KanbanColumnProps {
  status: JobStatus;
  jobs: Job[];
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
}

export function KanbanColumn({ status, jobs, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: {
      type: 'Column',
      status,
    },
  });

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-800/50 rounded-xl w-[320px] shrink-0 h-full border border-gray-100 dark:border-gray-800">
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 font-medium text-gray-700 dark:text-gray-200">
        <h2 className="flex items-center gap-2">
          {status}
          <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
            {jobs.length}
          </span>
        </h2>
      </div>

      <div
        ref={setNodeRef}
        className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]"
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
