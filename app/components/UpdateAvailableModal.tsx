"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ContentUpdate {
  category: string;
  label: string;
  hasUpdate: boolean;
  localVersion?: string;
  serverVersion: string;
  count: number;
}

interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  updates: ContentUpdate[];
  onDownloadSelected: (selectedCategories: string[]) => void;
  isDownloading: boolean;
}

export default function UpdateAvailableModal({
  isOpen,
  onClose,
  updates,
  onDownloadSelected,
  isDownloading
}: UpdateAvailableModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    updates.filter(u => u.hasUpdate).map(u => u.category)
  );

  if (!isOpen) return null;

  const updatesAvailable = updates.filter(u => u.hasUpdate);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleDownload = () => {
    if (selectedCategories.length > 0) {
      onDownloadSelected(selectedCategories);
    }
  };

  const selectAll = () => {
    setSelectedCategories(updatesAvailable.map(u => u.category));
  };

  const deselectAll = () => {
    setSelectedCategories([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-1">Updates Available</h2>
            <p className="text-blue-100 text-sm">
              New content is ready to download
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {updatesAvailable.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">You're all up to date!</p>
              <p className="text-gray-400 text-sm mt-1">All content is current</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600 text-sm">
                  {updatesAvailable.length} {updatesAvailable.length === 1 ? 'update' : 'updates'} available
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    disabled={isDownloading}
                    className="text-blue-600 text-xs font-medium hover:text-blue-700 disabled:opacity-50"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    disabled={isDownloading}
                    className="text-gray-600 text-xs font-medium hover:text-gray-700 disabled:opacity-50"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {updatesAvailable.map((update) => (
                  <label
                    key={update.category}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCategories.includes(update.category)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    } ${isDownloading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(update.category)}
                      onChange={() => toggleCategory(update.category)}
                      disabled={isDownloading}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{update.label}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {update.count.toLocaleString()} {update.count === 1 ? 'item' : 'items'}
                      </div>
                      {update.localVersion && (
                        <div className="text-xs text-gray-400 mt-1">
                          Last updated: {new Date(update.localVersion).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                      New
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Later
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading || selectedCategories.length === 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isDownloading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Downloading...
                </span>
              ) : (
                `Download ${selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
