import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// ---------- Загрузка данных ----------
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

// ---------- Уведомления ----------
const ToastContext = createContext<(text: string, isError?: boolean) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; error: boolean; id: number } | null>(null);
  const show = useCallback((text: string, error = false) => setToast({ text, error, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <div className={`toast${toast.error ? ' error' : ''}`} role="status" key={toast.id}>
          {toast.text}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

/** Выполняет действие, показывает результат и ошибку */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<unknown>, success?: string) => {
      setBusy(true);
      try {
        await fn();
        if (success) toast(success);
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), true);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { run, busy };
}

// ---------- Элементы ----------
export function Spinner() {
  return <div className="spinner" aria-label="Загрузка" />;
}

export function Alert({ children, error }: { children: ReactNode; error?: boolean }) {
  return <div className={`alert${error ? ' error' : ''}`}>{children}</div>;
}

export function State({ loading, error, onRetry, empty, children }: { loading: boolean; error: string | null; onRetry?: () => void; empty?: boolean; children: ReactNode }) {
  if (loading) return <Spinner />;
  if (error) {
    return (
      <Alert error>
        <div style={{ flex: 1 }}>{error}</div>
        {onRetry ? (
          <button className="btn small" onClick={onRetry}>
            Повторить
          </button>
        ) : null}
      </Alert>
    );
  }
  if (empty) return <div className="card empty">Записей нет</div>;
  return <>{children}</>;
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost small" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        {children}
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint ? <span className="small">{hint}</span> : null}
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function PageHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <div className="muted" style={{ marginTop: 4 }}>{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}

/** Числовое значение поля формы с проверкой границ */
export function num(value: string, min: number, max: number, label: string): number {
  const n = Number(String(value).replace(',', '.'));
  if (String(value).trim() === '' || Number.isNaN(n) || n < min || n > max) {
    throw new Error(`${label}: укажите число от ${min} до ${max}`);
  }
  return n;
}
