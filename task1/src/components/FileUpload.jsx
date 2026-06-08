import { useRef } from "react";

export default function FileUpload({ onUpload }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files);
      // Reset input so same file can be uploaded again
      e.target.value = "";
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onUpload(files);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex items-center gap-2"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 bg-[#E07A5F] text-white text-sm font-medium rounded-lg hover:bg-[#C9614A] transition-colors"
      >
        Upload Model Sweep
      </button>
      <span className="text-[#403D39] text-sm font-medium">
        or drag & drop .xlsx files
      </span>
    </div>
  );
}
