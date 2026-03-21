import React, { useState, useEffect, useMemo } from 'react';
import type { Job } from './types';
import { addJob, updateJob, deleteJob, getAllJobs, clearAllJobs } from './db';
import { KanbanBoard } from './components/KanbanBoard';
import { JobModal } from './components/JobModal';
import { Plus, Search, Moon, Sun, Download, Upload } from 'lucide-react';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  useEffect(() => {
    // Load Jobs
    getAllJobs().then(setJobs).catch(console.error);

    // Initial Theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const existingResumes = useMemo(() => {
    const resumes = new Set<string>();
    jobs.forEach(j => {
      if (j.resumeUsed) resumes.add(j.resumeUsed.trim());
    });
    return Array.from(resumes);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs;
    const lowerQ = searchQuery.toLowerCase();
    return jobs.filter(j => 
      j.companyName.toLowerCase().includes(lowerQ) ||
      j.jobTitle.toLowerCase().includes(lowerQ)
    );
  }, [jobs, searchQuery]);

  const handleSaveJob = async (job: Job) => {
    const isEditing = jobs.some(j => j.id === job.id);
    if (isEditing) {
      await updateJob(job);
      setJobs(prev => prev.map(j => j.id === job.id ? job : j));
    } else {
      await addJob(job);
      setJobs(prev => [...prev, job]);
    }
  };

  const handleUpdateJobStateDirect = async (job: Job) => {
    await updateJob(job);
  };

  const handleDeleteJob = async (id: string) => {
    await deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "job-tracker-backup.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('Importing will replace all current jobs. Ensure you have a backup. Continue?')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importedJobs = JSON.parse(event.target?.result as string) as Job[];
          // Basic validation
          if (Array.isArray(importedJobs) && importedJobs.every(j => j.id && j.companyName)) {
            await clearAllJobs();
            for (const j of importedJobs) {
              await addJob(j);
            }
            setJobs(importedJobs);
            alert('Import successful!');
          } else {
            alert('Invalid JSON file format.');
          }
        } catch (err) {
          alert('Error parsing JSON file.');
          console.error(err);
        }
      };
      reader.readAsText(file);
    }
    // reset input
    e.target.value = '';
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const openAddModal = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setEditingJob(null);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-lg p-2 text-white">
            <Plus size={20} className="rotate-45" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Job Tracker</h1>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="relative w-full max-w-sm hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button title="Toggle Theme" onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button title="Export Data" onClick={handleExport} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Download size={20} />
            </button>
            <label title="Import Data" className="p-2 cursor-pointer text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Upload size={20} />
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={openAddModal} className="hidden sm:flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-full font-medium text-sm hover:opacity-90 active:scale-95 transition-all">
              <Plus size={16} />
              <span>Add Job</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Actions */}
      <div className="sm:hidden px-4 pt-4 flex gap-3">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <button onClick={openAddModal} className="flex-shrink-0 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 w-10 h-10 rounded-lg shadow">
             <Plus size={20} />
          </button>
      </div>

      <main className="flex-1 overflow-hidden p-6">
        <KanbanBoard 
          jobs={filteredJobs} 
          setJobs={setJobs} 
          onUpdateJob={handleUpdateJobStateDirect}
          onEdit={(job) => { setEditingJob(job); setIsModalOpen(true); }}
          onDelete={handleDeleteJob}
        />
      </main>

      {(isModalOpen || editingJob) && (
        <JobModal 
          job={editingJob} 
          onClose={closeModals} 
          onSave={handleSaveJob}
          existingResumes={existingResumes}
        />
      )}
    </div>
  );
}
