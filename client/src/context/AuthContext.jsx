import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../lib/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { name, role, mobile, id }
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        const storedUser = localStorage.getItem('sankal_user');

        // Global listener for registration success
        const onRegistrationSuccess = () => {
            console.log("Socket registration successful");
            setIsRegistered(true);
        };

        socket.on('registration_success', onRegistrationSuccess);

        if (storedUser) {
            let userData;
            try {
                userData = JSON.parse(storedUser);
            } catch (e) {
                console.error("Failed to parse user data properly", e);
                localStorage.removeItem('sankal_user');
                return;
            }
            setUser(userData);
            setIsAuthenticated(true);

            // Function to handle registration
            const handleRegister = () => {
                console.log("Attempting to register socket:", userData.name);
                setIsRegistered(false); // Reset on reconnect attempt
                socket.emit('register_user', userData);
            };

            // If already connected, register immediately
            if (socket.connected) {
                handleRegister();
            } else {
                socket.connect();
            }

            // Listen for future connections (reconnects)
            socket.on('connect', handleRegister);

            return () => {
                socket.off('connect', handleRegister);
                socket.off('registration_success', onRegistrationSuccess);
                socket.off('connect', onConnect);
                socket.off('disconnect', onDisconnect);
            };
        } else {
            return () => {
                socket.off('registration_success', onRegistrationSuccess);
                socket.off('connect', onConnect);
                socket.off('disconnect', onDisconnect);
            };
        }
    }, []);

    const loginUser = (userData) => {
        return new Promise((resolve, reject) => {
            // Function to handle completion
            const handleSuccess = ({ id }) => {
                clearTimeout(timeoutId);
                const finalUser = { ...userData, id };
                setUser(finalUser);
                setIsAuthenticated(true);
                setIsRegistered(true);
                localStorage.setItem('sankal_user', JSON.stringify(finalUser));
                resolve(finalUser);
            };

            // Connect socket if not connected
            if (!socket.connected) {
                socket.connect();
            }

            // Register event
            console.log("Login: Registering user", userData.name);
            socket.emit('register_user', userData);

            // Wait for success
            socket.once('registration_success', handleSuccess);

            // Timeout after 5 seconds
            const timeoutId = setTimeout(() => {
                socket.off('registration_success', handleSuccess);
                console.error("Login timed out. Server might be unreachable.");
                alert("Login timed out. Please check your connection or try again.");
                reject(new Error("Login timeout"));
            }, 5000);
        });
    };

    const logoutUser = () => {
        socket.disconnect();
        setUser(null);
        setIsAuthenticated(false);
        setIsRegistered(false);
        localStorage.removeItem('sankal_user');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isRegistered, isConnected, loginUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
