import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { AlertCircle, BookOpenCheck, Loader2, Moon, Sun } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { auth } from '../lib/firebase';

interface AuthScreenProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRegisteredNick: (nick: string) => void;
}

function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ten adres e-mail jest już zarejestrowany. Zaloguj się na swoje konto.';
    case 'auth/invalid-email':
      return 'Podany adres e-mail ma nieprawidłowy format.';
    case 'auth/weak-password':
      return 'Hasło jest za krótkie — wpisz co najmniej 6 znaków.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Nieprawidłowy adres e-mail lub hasło.';
    case 'auth/too-many-requests':
      return 'Zbyt wiele nieudanych prób. Odczekaj chwilę i spróbuj ponownie.';
    case 'auth/operation-not-allowed':
      return 'Logowanie E-mail/Hasło nie zostało jeszcze włączone w konsoli Firebase (Authentication → Sign-in method → E-mail/Hasło → Włącz).';
    case 'auth/network-request-failed':
      return 'Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.';
    default:
      return 'Wystąpił błąd logowania. Sprawdź dane i spróbuj ponownie.';
  }
}

export function AuthScreen({ theme, onToggleTheme, onRegisteredNick }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    const trimmedNick = nick.trim();

    if (mode === 'register' && trimmedNick.length < 2) {
      setErrorMsg('Podaj nazwę użytkownika (Nick do rankingu) — minimum 2 znaki.');
      return;
    }
    if (!trimmedEmail || !password) {
      setErrorMsg('Wpisz adres e-mail oraz hasło.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        onRegisteredNick(trimmedNick);
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: trimmedNick });
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      setErrorMsg(mapFirebaseAuthError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          InstruktorPro
        </span>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <main className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-16">
        <section className="space-y-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-700 dark:text-blue-400">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            <span>Kurs dla kandydatów na instruktorów nauki jazdy</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance] sm:text-4xl dark:text-white">
            Przygotuj się do egzaminu na instruktora pewnie i systematycznie
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Ucz się działami z natychmiastowym sprawdzaniem pytań wielokrotnego wyboru, powtarzaj błędne odpowiedzi aż do opanowania i sprawdzaj gotowość w symulacji egzaminu.
          </p>

          <dl className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Powtórka błędów
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                2 poprawne z rzędu usuwają błąd
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Próg egzaminacyjny
              </dt>
              <dd className="font-mono mt-1 text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                85% (25 min / test)
              </dd>
            </div>
          </dl>
        </section>

        <section className="lg:col-span-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Logowanie
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Rejestracja kursanta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-nick"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    Nazwa użytkownika (Nick do rankingu)
                  </label>
                  <input
                    id="auth-nick"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    value={nick}
                    onChange={(e) => setNick(e.target.value)}
                    placeholder="np. Marek_Krakow"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Adres e-mail
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kursant@przyklad.pl"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Hasło
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 znaków"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                <span>{mode === 'login' ? 'Zaloguj się' : 'Załóż konto i rozpocznij naukę'}</span>
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Rejestracja nie wymaga potwierdzania adresu e-mail — sesja pozostaje aktywna na urządzeniu.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
