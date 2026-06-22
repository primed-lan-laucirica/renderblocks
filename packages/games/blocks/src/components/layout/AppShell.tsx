import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ children, header, footer }: AppShellProps) {
  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {header && (
        <header className="absolute top-0 left-0 right-0 px-4 py-2 md:px-6 md:py-3 z-50 pointer-events-none">
          {header}
        </header>
      )}

      <main className="absolute inset-0">{children}</main>

      {footer && (
        <footer className="absolute bottom-0 left-0 right-0 px-4 py-2 md:px-6 md:py-3 pointer-events-none z-40">
          {footer}
        </footer>
      )}
    </div>
  );
}

export default AppShell;
