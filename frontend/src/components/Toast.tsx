import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        const borderColor = isSuccess
          ? 'border-[#00a572]'
          : isWarning
          ? 'border-[#f19b03]'
          : isError
          ? 'border-[#ffb4ab]'
          : 'border-[#68d6ff]';

        const iconColor = isSuccess
          ? 'text-[#4edea3]'
          : isWarning
          ? 'text-[#ffbc69]'
          : isError
          ? 'text-[#ffb4ab]'
          : 'text-[#68d6ff]';

        const bgGradient = isSuccess
          ? 'from-[#171b26] to-[#1c2e28]'
          : isWarning
          ? 'from-[#171b26] to-[#2d2212]'
          : isError
          ? 'from-[#171b26] to-[#2d1214]'
          : 'from-[#171b26] to-[#142330]';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${borderColor} bg-gradient-to-r ${bgGradient} text-[#dfe2f1] shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md min-w-[320px] max-w-md animate-in slide-in-from-bottom-5 duration-200`}
            role="alert"
          >
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              {isSuccess && <CheckCircle2 className="w-5 h-5" />}
              {isWarning && <AlertTriangle className="w-5 h-5" />}
              {isError && <XCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1 pr-2">
              <h4 className="text-sm font-semibold tracking-wide text-[#dfe2f1]">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-xs text-[#bcc8cf] mt-1 font-mono leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#bcc8cf] hover:text-[#dfe2f1] transition-colors p-1 rounded-md hover:bg-white/10"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
