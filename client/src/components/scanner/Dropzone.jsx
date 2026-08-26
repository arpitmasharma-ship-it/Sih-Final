import { useCallback, useRef, useState, useEffect } from 'react';
import { UploadCloud, Camera, X, ZoomIn, RotateCw, Crop, Replace } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export const IMAGE_LABELS = [
  'FRONT_PACKAGE', 'BACK_PACKAGE', 'SIDE_IMAGE', 'LABEL_CLOSEUP', 'LISTING_SCREENSHOT', 'BARCODE_QR',
];

/**
 * Image slot with client-side rotate / crop / zoom helpers.
 * Files are kept as {id, file, previewUrl, label} objects.
 */
export function Dropzone({ images, setImages, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [editIdx, setEditIdx] = useState(null);

  useEffect(() => {
    const onPaste = (e) => {
      if (disabled) return;
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        setImages((prev) => {
          const next = [...prev];
          files.forEach((f) => {
            if (next.length >= 5) return;
            next.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              file: f,
              previewUrl: URL.createObjectURL(f),
              label: IMAGE_LABELS[next.length] || 'FRONT_PACKAGE',
            });
          });
          return next;
        });
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [disabled, setImages]);

  const addFiles = (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setImages((prev) => {
      const next = [...prev];
      files.forEach((f) => {
        if (next.length >= 5) return;
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          previewUrl: URL.createObjectURL(f),
          label: IMAGE_LABELS[next.length] || 'FRONT_PACKAGE',
        });
      });
      return next;
    });
  };

  const removeAt = (idx) =>
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });

  const replaceAt = (idx, fileList) => {
    const f = Array.from(fileList).find((x) => x.type.startsWith('image/'));
    if (!f) return;
    setImages((prev) =>
      prev.map((img, i) => {
        if (i === idx) {
          URL.revokeObjectURL(img.previewUrl);
          return { ...img, file: f, previewUrl: URL.createObjectURL(f) };
        }
        return img;
      })
    );
  };

  const updateImage = (idx, patch) =>
    setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, ...patch } : img)));

  return (
    <div>
      <div
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition
          ${dragOver ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-900/20' : 'border-slate-300 hover:border-primary-400 dark:border-slate-700'}
          ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <UploadCloud size={34} className="mb-3 text-primary-600 dark:text-primary-400" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Drag & drop package photos here
        </p>
        <p className="mt-1 text-xs text-slate-400">or click to browse · Ctrl+V to paste · JPG/PNG/WEBP · up to 5 images · max 10MB each</p>
      </div>

      <div className="mt-3 flex justify-center sm:hidden">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white">
          <Camera size={16} /> Take photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {images.map((img, idx) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <img src={img.previewUrl} alt={img.label} className="aspect-square w-full object-cover" />
              <select
                value={img.label}
                onChange={(e) => updateImage(idx, { label: e.target.value })}
                className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 px-1.5 py-1 text-[10px] font-semibold text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
              >
                {IMAGE_LABELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1.5 opacity-0 transition group-hover:opacity-100">
                <IconBtn title="Rotate" onClick={() => setEditIdx(idx)} icon={RotateCw} />
                <IconBtn title="Remove" onClick={() => removeAt(idx)} icon={X} danger />
              </div>
            </motion.div>
          ))}
          {images.length < 5 && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-primary-400 hover:text-primary-500 dark:border-slate-700"
              title="Add more images"
            >
              +
            </button>
          )}
        </div>
      )}

      <ImageEditorModal
        image={editIdx !== null ? images[editIdx] : null}
        onClose={() => setEditIdx(null)}
        onApply={(blobOrFile) => {
          if (editIdx !== null && blobOrFile) {
            replaceAt(editIdx, [blobOrFile]);
          }
          setEditIdx(null);
        }}
      />
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg bg-white/90 p-1.5 shadow backdrop-blur transition hover:bg-white dark:bg-slate-900/80 ${
        danger ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

/**
 * Rotate (any angle), crop via drag-select rectangle, zoom preview.
 * Applies changes onto a canvas and emits a PNG File.
 */
export function ImageEditorModal({ image, onClose, onApply }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [sel, setSel] = useState(null); // crop selection in canvas coords
  const dragRef = useRef(null);

  const drawCanvas = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rad = (rotation * Math.PI) / 180;
    // Fit rotated image into the canvas
    const w = img.width * zoom;
    const h = img.height * zoom;
    const diag = Math.sqrt(w * w + h * h);
    canvas.width = Math.min(640, Math.round(diag));
    canvas.height = Math.min(520, Math.round(diag));
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    if (sel) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const x = Math.min(sel.x0, sel.x1);
      const y = Math.min(sel.y0, sel.y1);
      const rw = Math.abs(sel.x1 - sel.x0);
      const rh = Math.abs(sel.y1 - sel.y0);
      ctx.strokeRect(x, y, rw, rh);
      ctx.fillStyle = 'rgba(37,99,235,.12)';
      ctx.fillRect(x, y, rw, rh);
    }
  }, [rotation, zoom, sel]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const pointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvasRef.current.width) / rect.width,
      y: ((e.clientY - rect.top) * canvasRef.current.height) / rect.height,
    };
  };

  const applyCrop = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    let out = canvas;

    if (sel && Math.abs(sel.x1 - sel.x0) > 10 && Math.abs(sel.y1 - sel.y0) > 10) {
      const x = Math.min(sel.x0, sel.x1);
      const y = Math.min(sel.y0, sel.y1);
      const w = Math.abs(sel.x1 - sel.x0);
      const h = Math.abs(sel.y1 - sel.y0);
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      tmp.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
      out = tmp;
    }

    const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
    return new File([blob], `edited-${Date.now()}.png`, { type: 'image/png' });
  };

  return (
    <Modal open={Boolean(image)} onClose={onClose} title="Adjust image" size="lg">
      {image && (
        <div className="space-y-4">
          {/* Hidden source image */}
          <img
            ref={imgRef}
            src={image.previewUrl}
            alt=""
            className="hidden"
            onLoad={() => drawCanvas()}
          />
          <div className="flex items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            <canvas
              ref={canvasRef}
              className="max-h-[52vh] cursor-crosshair touch-none select-none"
              onMouseDown={(e) => {
                setSel({ ...pointerPos(e), x1: null, y1: null });
                dragRef.current = true;
              }}
              onMouseMove={(e) => dragRef.current && setSel((s) => s && { ...s, ...pointerPos(e) })}
              onMouseUp={() => (dragRef.current = false)}
              onMouseLeave={() => (dragRef.current = false)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" size="sm" icon={RotateCw} onClick={() => setRotation((r) => r + 90)}>
              Rotate 90°
            </Button>
            <Button variant="secondary" size="sm" icon={ZoomIn} onClick={() => setZoom((z) => Math.round(((z + 0.15) % 1.65) * 100) / 100)}>
              Zoom ×{zoom.toFixed(2)}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={X}
              onClick={() => {
                setSel(null);
                setRotation(0);
                setZoom(1);
              }}
            >
              Reset
            </Button>
            <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
              <Crop size={12} /> Drag on image to select crop area
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              icon={Replace}
              onClick={async () => {
                const f = await applyCrop();
                onApply(f);
              }}
            >
              Apply to scan
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
