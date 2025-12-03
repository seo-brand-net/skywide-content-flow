import { Upload, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onFileSelect, disabled }: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const validateAndSelectFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['.txt', '.pdf', '.docx', '.doc'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (file.size > maxSize) {
      toast.error('File is too large. Maximum size is 10MB.');
      return;
    }

    if (!allowedTypes.includes(fileExt)) {
      toast.error('Unsupported file type. Please upload .txt, .pdf, or .docx files.');
      return;
    }

    onFileSelect(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && document.getElementById('file-upload')?.click()}
    >
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept=".txt,.pdf,.docx,.doc"
        onChange={handleFileInput}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-muted">
          {dragActive ? (
            <Upload className="h-6 w-6 text-primary" />
          ) : (
            <FileText className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Drop your document here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports .txt, .pdf, .docx (max 10MB)
          </p>
        </div>
      </div>
    </div>
  );
}
