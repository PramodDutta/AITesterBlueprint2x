import React, { useState, useEffect } from 'react';
import type { Job, JobStatus } from '../types';
import { X } from 'lucide-react';

interface JobModalProps {
  job?: Job | null;
  onClose: () => void;
  onSave: (job: Job) => Promise<void>;
  existingResumes: string[];
}

const STATUSES: JobStatus[] = ['Wishlist', 'Applied', 'Follow-up', 'Interview', 'Offer', 'Rejected'];

export function JobModal({ job, onClose, onSave, existingResumes }: JobModalProps) {
  const [formData, setFormData] = useState<Partial<Job>>({
    companyName: '',
    jobTitle: '',
    jobUrl: '',
    resumeUsed: '',
    dateApplied: Date.now(),
    salaryRange: '',
    notes: '',
    status: 'Wishlist',
  });

  useEffect(() => {
    if (job) {
      setFormData(job);
    }
  }, [job]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dateApplied' ? new Date(value).getTime() : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.jobTitle) return;

    const newJob: Job = {
      ...(formData as Job),
      id: job?.id || crypto.randomUUID(),
    };
    
    await onSave(newJob);
    onClose();
  };

  const formattedDate = new Date(formData.dateApplied || Date.now()).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-opacity">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col border-l border-gray-200 dark:border-gray-800 animate-slide-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {job ? 'Edit Job' : 'Add New Job'}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 flex flex-col">
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
              <input required name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Acme Corp" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title / Role *</label>
              <input required name="jobTitle" value={formData.jobTitle} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Software Engineer" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status ⚑</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 outline-none">
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn / Job URL</label>
              <input type="url" name="jobUrl" value={formData.jobUrl} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="https://linkedin.com/jobs/..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resume Used</label>
              <input list="resumes" name="resumeUsed" value={formData.resumeUsed} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Frontend_Resume_v2" />
              <datalist id="resumes">
                {existingResumes.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Applied</label>
                <input type="date" name="dateApplied" value={formattedDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Range</label>
                <input name="salaryRange" value={formData.salaryRange} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="$150-180K" />
              </div>
            </div>

            <div className="flex-1 min-h-[100px] flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" placeholder="Referred by John Doe. HM name is Smith..." />
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm">
              {job ? 'Save Changes' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
