import { useState } from 'react';
import { ScanEye, ImageOff } from 'lucide-react';
import { buildAssetUrl } from '../../services/api';
import { FIELD_LABEL } from '../../constants';

/**
 * Package photo with optional OCR bounding-box overlay.
 * fields: [{field, bbox{x,y,width,height}, sourceImageIndex, confidence}]
 */
export default function BboxViewer({ url, alt, fields = [], imageIndex = 0 }) {
  const [showBoxes, setShowBoxes] = useState(false);
  const [hasError, setHasError] = useState(false);
  const mine = fields.filter((f) => f.bbox && (f.sourceImageIndex ?? 0) === imageIndex);
  const assetUrl = buildAssetUrl(url);

  return (
    <figure className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
      {hasError || !assetUrl ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[160px]">
          <ImageOff size={28} className="mb-2 opacity-60" />
          <p className="text-xs font-semibold">Image unavailable</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Scanned on local instance or expired</p>
        </div>
      ) : (
        <img
          src={assetUrl}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full object-contain max-h-[420px] bg-slate-950/5"
        />
      )}
      {!hasError && mine.length > 0 && (
        <>
          {showBoxes && (
            <div className="absolute inset-0">
              {mine.map((f, i) => {
                const hue = (i * 137) % 360;
                return (
                  <div
                    key={`${f.field}-${i}`}
                    className="absolute"
                    style={{
                      left: `${f.bbox.x}%`,
                      top: `${f.bbox.y}%`,
                      width: `${f.bbox.width}%`,
                      height: `${f.bbox.height}%`,
                      border: `2px solid hsl(${hue}, 75%, 45%)`,
                      background: `hsla(${hue}, 75%, 45%, 0.12)`,
                    }}
                  >
                    <span
                      className="absolute -top-4 left-0 whitespace-nowrap rounded px-1 text-[9px] font-bold text-white"
                      style={{ background: `hsl(${hue}, 75%, 40%)` }}
                    >
                      {FIELD_LABEL[f.field] || f.field}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowBoxes((s) => !s)}
            title={showBoxes ? 'Hide detected fields' : 'Show detected fields'}
            className={`absolute bottom-2 right-2 rounded-lg p-1.5 shadow backdrop-blur transition ${
              showBoxes ? 'bg-primary-600 text-white' : 'bg-white/85 text-slate-600 hover:bg-white dark:bg-slate-900/80 dark:text-slate-300'
            }`}
          >
            <ScanEye size={15} />
          </button>
        </>
      )}
      <figcaption className="border-t border-slate-100 bg-white/90 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        {alt}
      </figcaption>
    </figure>
  );
}
