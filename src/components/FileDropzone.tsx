import React, { useRef } from 'react';
import { Icon } from '../ui/Icon';

export const FONT_EXTENSIONS = ['woff2', 'woff', 'ttf', 'otf'];

export function isFontFile(name: string): boolean {
  const ext = name.toLowerCase().split('.').pop();
  return FONT_EXTENSIONS.includes(ext || '');
}

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
  isDragOver: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  isLoading,
  isDragOver
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => isFontFile(file.name));
    if (files.length > 0) onFilesSelected(files);
    event.target.value = '';
  };

  return (
    <div
      className="drop"
      data-over={isDragOver}
      role="button"
      tabIndex={0}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".woff2,.woff,.ttf,.otf"
        className="sr-only"
        onChange={handleInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error - non-standard but supported in Chromium and WebKit
        webkitdirectory="true"
        className="sr-only"
        onChange={handleInputChange}
      />

      <span className="dot">{isLoading ? 'READING…' : 'DROP FONTS'}</span>

      <p className="drop-note">
        WOFF2 · WOFF · TTF · OTF — DROP ANYWHERE ON THE SHEET, OR PICK FILES BELOW
      </p>

      <div className="drop-actions" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="btn btn--solid"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="file" />
          SELECT FILES
        </button>
        <button
          type="button"
          className="btn"
          disabled={isLoading}
          onClick={() => folderInputRef.current?.click()}
        >
          <Icon name="folder" />
          SELECT FOLDER
        </button>
      </div>
    </div>
  );
};
