import React, { createContext, useState, useEffect } from 'react';
// import jwtDecode from 'jwt-decode';
import { jwtDecode } from 'jwt-decode';


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const login = (token) => {
        localStorage.setItem('token', token);
        try {
            const decoded = jwtDecode(token);
            setUser({ id: decoded.userId, isAdmin: decoded.isAdmin });
        } catch (err) {
            console.error('Token decode error:', err);
            setUser(null);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // Check token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Optionally verify token with backend
                fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                })
                    .then(response => {
                        if (response.ok) {
                            setUser({ id: decoded.userId, isAdmin: decoded.isAdmin });
                        } else {
                            logout();
                        }
                    })
                    .catch(err => {
                        console.error('Verify token error:', err);
                        logout();
                    });
            } catch (err) {
                console.error('Token decode error:', err);
                logout();
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};