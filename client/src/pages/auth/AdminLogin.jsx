import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (username === 'admin' && password === 'admin') {
            await loginUser({
                name: 'District Magistrate',
                role: 'dm',
                mobile: '0000000000'
            });
            navigate('/admin/dashboard');
        } else {
            alert("Invalid credentials (try admin/admin)");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md relative z-50">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Official Login</h1>
                    <p className="text-gray-500">Sankal Samwad Administrative Portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-secondary-900 text-white py-3 rounded-lg font-semibold hover:bg-secondary-800 transition"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
