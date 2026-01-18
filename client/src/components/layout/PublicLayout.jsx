import React from 'react';
import { Outlet } from 'react-router-dom';
import logo from '../../assets/logo.png';

const PublicLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center">
            <header className="w-full bg-primary-700 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {/* Logo */}
                        <img src={logo} alt="Uttarakhand Govt" className="h-10 w-auto bg-white rounded-full p-1" />
                        <h1 className="text-xl font-bold">Sankal Samwad</h1>
                    </div>
                    <div className="text-sm opacity-80">Uttarkashi District Administration</div>
                </div>
            </header>

            <main className="w-full bg-white min-h-[calc(100vh-4rem)] sm:min-h-0 sm:mt-8 sm:rounded-xl sm:shadow-lg overflow-hidden sm:max-w-md md:max-w-2xl lg:max-w-4xl transition-all duration-300">
                <Outlet />
            </main>

            <footer className="mt-8 text-slate-400 text-xs text-center pb-4 sm:pb-0">
                &copy; 2024 District Administration Uttarkashi
            </footer>
        </div>
    );
};

export default PublicLayout;
