import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            console.log('Sending register request:', { name, email });
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });
            if (!response.ok) {
                const text = await response.text();
                console.log('Register failed with status:', response.status, 'Response:', text);
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.message || 'Registration failed');
                } catch (jsonErr) {
                    throw new Error(`Non-JSON response: ${text.slice(0, 100)}...`);
                }
            }
            const data = await response.json();
            localStorage.setItem('token', data.token);
            console.log('Registration successful, token:', data.token);
            setError(null);
            navigate('/'); // Redirect to homepage
        } catch (err) {
            console.error('Register error:', err);
            setError(err.message);
        }
    };

    return (
        <div>
            {/* <Navbar /> */}
            <div style={{ height: '56px' }}></div>
            <div className='container d-flex justify-content-start'>

                <div className="col-12 col-lg-6 mt-5">
                    <h2>Register</h2>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="name" className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-control"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-control"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary">Register</button>
                    </form>
                    <p className="mt-3">
                        Already have an account? <a href="/login">Login</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;