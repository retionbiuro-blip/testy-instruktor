import { Bell, LogIn, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { AppView } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  nick: string;
  isAdmin: boolean;
  isGuest: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  onSwitchToAuth: () => void;
  onOpenInbox: () => void;
  unreadNotifications: number;
  mistakesCount: number;
  openReportsCount: number;
}

export function Navbar({
  currentView,
  onNavigate,
  nick,
  isAdmin,
  isGuest,
  theme,
  onToggleTheme,
  onLogout,
  onSwitchToAuth,
  onOpenInbox,
  unreadNotifications,
  mistakesCount,
  openReportsCount
}: NavbarProps) {
  const navItems: { id: AppView; label: string; mobileLabel?: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Pulpit' },
    { id: 'knowledge', label: 'Baza Wiedzy', mobileLabel: 'Wiedza' },
    { id: 'legal-acts', label: 'Akty prawne', mobileLabel: 'Akty' },
    { id: 'study', label: 'Nauka' },
    { id: 'mistakes', label: 'Powtórka', badge: mistakesCount > 0 ? mistakesCount : undefined },
    { id: 'exam', label: 'Egzamin' },
    { id: 'leaderboard', label: 'Ranking' }
  ];

  if (isAdmin) {
    navItems.push({
      id: 'admin',
      label: 'Panel Admina',
      mobileLabel: 'Admin',
      badge: openReportsCount > 0 ? openReportsCount : undefined
    });
  }

  return (
    <>
      {/* Górna nawigacja zgodna z kontraktem 3 stref */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          {/* Strefa 1: Marka (pojedynczy element tekstowy) */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="font-display shrink-0 cursor-pointer text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-white"
          >
            InstruktorPro
          </button>

          {/* Strefa 2: Linki nawigacyjne na desktopie */}
          <nav
            aria-label="Nawigacja główna"
            className="hidden items-center gap-3.5 lg:gap-5 md:flex"
          >
            {navItems.map((item) => {
              const isActive =
                currentView === item.id ||
                (item.id === 'exam' && currentView === 'quick10') ||
                (item.id === 'study' && currentView === 'lecturer');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
                    isActive
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {item.id === 'admin' && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      ({item.badge})
                    </span>
                  )}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute right-0 -bottom-[13px] left-0 h-0.5 bg-blue-700 dark:bg-blue-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Strefa 3: Główna akcja, instalacja PWA, skrzynka powiadomień i przełącznik motywu */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 sm:inline dark:text-slate-300">
              {isGuest ? 'Gość' : nick}
            </span>
            <PWAInstallButton />
            {!isGuest && (
              <button
                type="button"
                onClick={onOpenInbox}
                aria-label={
                  unreadNotifications > 0
                    ? `Moje zgłoszenia i odpowiedzi (nowe powiadomienia: ${unreadNotifications})`
                    : 'Moje zgłoszenia i odpowiedzi'
                }
                title="Moje zgłoszenia i odpowiedzi"
                className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadNotifications > 0 && (
                  <span className="font-mono absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white tabular-nums shadow-xs">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
              title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {isGuest ? (
              <button
                type="button"
                onClick={onSwitchToAuth}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-3.5 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>Zaloguj się</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Wyloguj</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Kompaktowy pasek nawigacji mobilnej z bezpiecznym marginesem dolnym dla nakładek hostingu */}
      <nav
        aria-label="Nawigacja mobilna"
        className="fixed right-0 bottom-0 left-0 z-30 flex items-center justify-between gap-0.5 overflow-x-auto border-t border-slate-200 bg-white/95 px-1.5 pt-1.5 pb-12 backdrop-blur-sm md:hidden dark:border-slate-800 dark:bg-slate-950/95"
      >
        {navItems.map((item) => {
          const isActive =
            currentView === item.id ||
            (item.id === 'exam' && currentView === 'quick10') ||
            (item.id === 'study' && currentView === 'lecturer');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex min-h-[44px] min-w-[52px] flex-1 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="truncate">
                {item.mobileLabel ?? item.label}
                {item.badge !== undefined ? ` (${item.badge})` : ''}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
