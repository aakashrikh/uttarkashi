import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

const AdminLayout = () => {
    const { logoutUser, user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900">
            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent pointer-events-none z-0" />
            <div className="fixed -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none z-0" />
            <div className="fixed top-20 -left-20 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-40 pointer-events-none z-0" />

            {/* Floating Glass Header */}
            <header className="relative z-50 pt-6 px-6">
                <nav className="max-w-7xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/50 rounded-2xl px-6 py-4 flex justify-between items-center transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-0.5">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-500/20">
                            <img src={logo} alt="Uttarakhand Govt" className="h-8 w-auto brightness-0 invert" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">DM Dashboard</h1>
                            <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Sankal Samwad Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-800">{user?.name || 'District Magistrate'}</span>
                            <span className="text-xs text-slate-500">Uttarkashi Administration</span>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>
                        <button
                            onClick={logoutUser}
                            className="group flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold text-sm transition-all hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30"
                        >
                            <span>Logout</span>
                            <span className="text-lg leading-none group-hover:translate-x-0.5 transition-transform">→</span>
                        </button>
                    </div>
                </nav>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
