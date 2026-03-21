import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Job, JobStatus } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { JobCard } from './JobCard';

const COLUMNS: JobStatus[] = ['Wishlist', 'Applied', 'Follow-up', 'Interview', 'Offer', 'Rejected'];

interface KanbanBoardProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  onUpdateJob: (job: Job) => Promise<void>;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
}

export function KanbanBoard({ jobs, setJobs, onUpdateJob, onEdit, onDelete }: KanbanBoardProps) {
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const job = jobs.find((j) => j.id === active.id);
    if (job) setActiveJob(job);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Job';
    const isOverTask = over.data.current?.type === 'Job';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    setJobs((jobs) => {
      const activeIndex = jobs.findIndex((j) => j.id === activeId);
      const activeJob = jobs[activeIndex];

      if (isOverTask) {
        const overIndex = jobs.findIndex((j) => j.id === overId);
        const overJob = jobs[overIndex];
        
        if (activeJob.status !== overJob.status) {
          activeJob.status = overJob.status;
          return arrayMove(jobs, activeIndex, overIndex);
        }
        return arrayMove(jobs, activeIndex, overIndex);
      }

      const isOverCol = isOverColumn ? overId : null;
      if (isOverCol && activeJob.status !== isOverCol) {
        activeJob.status = isOverCol as JobStatus;
        return arrayMove(jobs, activeIndex, activeIndex);
      }

      return jobs;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId !== overId) {
      setJobs((jobs) => {
        const activeIndex = jobs.findIndex((j) => j.id === activeId);
        const overIndex = jobs.findIndex((j) => j.id === overId);
        return arrayMove(jobs, activeIndex, overIndex);
      });
    }

    // Persist final status to IndexedDB
    const finalJob = jobs.find((j) => j.id === activeId);
    if (finalJob) {
      await onUpdateJob(finalJob);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4 custom-scrollbar items-start">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            status={col}
            jobs={jobs.filter((j) => j.status === col)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
        {activeJob ? (
          <JobCard job={activeJob} onEdit={onEdit} onDelete={onDelete} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
