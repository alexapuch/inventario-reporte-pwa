import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, UserPlus, ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
// import './LoginView.css'; // Removed old styles

export function LoginView() {
    const { login, signup, loginWithGoogle } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
        } catch (err) {
            setError('Error de autenticación: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            setError('Error con Google: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-200">
            <div className="w-full max-w-md animate-fade-in space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg mb-6">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        StockMaster
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {isLogin ? 'Bienvenido de vuelta, inicia sesión.' : 'Crea una cuenta para comenzar.'}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100 dark:border-slate-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Correo Electrónico
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg leading-5 bg-white dark:bg-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out dark:text-white"
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Contraseña
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg leading-5 bg-white dark:bg-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out dark:text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                                {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                                    o continuar con
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-sm font-medium text-primary hover:text-blue-500 transition-colors"
                        >
                            {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
