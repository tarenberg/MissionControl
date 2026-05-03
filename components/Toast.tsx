
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [nextId, setNextId] = useState(0);

  const addToast = useCallback((message: string, type: ToastType) => {
    setToasts((prevToasts) => [...prevToasts, { id: nextId, message, type }]);
    const currentId = nextId;
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== currentId));
    }, 5000);
    setNextId((prevId) => prevId + 1);
  }, [nextId]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
