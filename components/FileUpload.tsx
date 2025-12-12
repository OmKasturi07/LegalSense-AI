import React, { useState, ChangeEvent } from 'react';
import { Image as ImageIcon, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out
          ${dragActive ? 'border-gold-500 bg-gold-50/10' : 'border-slate-300 bg-white hover:bg-slate-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleChange}
          disabled={disabled}
          accept="image/*,application/pdf"
        />
        
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className="flex gap-4 mb-4">
            <div className={`p-3 rounded-full ${dragActive ? 'bg-gold-100 text-gold-600' : 'bg-slate-100 text-slate-400'}`}>
              <FileText className="w-6 h-6" />
            </div>
            <div className={`p-3 rounded-full ${dragActive ? 'bg-gold-100 text-gold-600' : 'bg-slate-100 text-slate-400'}`}>
              <ImageIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="mb-2 text-lg font-medium text-slate-700">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm text-slate-500 max-w-xs">
            Contracts (PDF), Invoices, or <span className="text-navy-900 font-semibold">Screenshots</span> of Texts/Emails for scam checks.
          </p>
          <p className="text-xs text-slate-400 mt-2">Max file size: 5MB</p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
