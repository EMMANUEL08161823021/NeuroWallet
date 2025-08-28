import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Added password state
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userId] = useState('user-' + Math.random().toString(36).substr(2, 9));
  const navigate = useNavigate();

  const isWebAuthnSupported = () => window.PublicKeyCredential !== undefined && window.isSecureContext;

  const generateChallenge = () => {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge;
  };

  const registerCredential = async () => {
    if (!isWebAuthnSupported()) {
      setStatus('WebAuthn is not supported or not running in a secure context.');
      return;
    }
    setStatus('Initiating registration... Please follow the biometric prompt.');
    try {
      const publicKey = {
        challenge: generateChallenge(),
        rp: { name: "Fingerprint Auth Demo", id: "localhost" },
        user: { id: new TextEncoder().encode(userId), name: userId, displayName: "Demo User" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { userVerification: "required" },
        timeout: 120000,
      };
      const credential = await navigator.credentials.create({ publicKey });
      setStatus('Registration successful!');
      setIsRegistered(true);
    } catch (error) {
      setStatus(`Registration failed: ${error.message}.`);
    }
  };

  const authenticate = async () => {
    if (!isWebAuthnSupported()) {
      setStatus('WebAuthn is not supported or not running in a secure context.');
      return;
    }
    setStatus('Initiating authentication... Please follow the biometric prompt.');
    try {
      const publicKey = {
        challenge: generateChallenge(),
        rpId: "localhost",
        allowCredentials: [],
        userVerification: "required",
        timeout: 120000,
      };
      const assertion = await navigator.credentials.get({ publicKey });
      setStatus('Authentication successful!');
      navigate('/home');
    } catch (error) {
      setStatus(`Authentication failed: ${error.message}.`);
    }
  };

  const handlePasswordLogin = () => {
    // Mock password login (replace with actual API call)
    if (email && password === 'password') {
      setStatus('Password login successful!');
      navigate('/home');
    } else {
      setStatus('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md border-2 border-black">
        <h2 className="text-2xl font-bold mb-4 text-center">Hello, Steve</h2>
        <p className="text-center mb-6">Use TouchID or password to log in</p>

        {status && (
          <p className="text-center mb-4" aria-live="polite">
            {status}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
              placeholder="Your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 mb-1">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
              placeholder="Your password"
            />
          </div>

          <button
            onClick={registerCredential}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-400"
            disabled={!isWebAuthnSupported() || isRegistered}
            aria-label="Register biometric authentication"
          >
            Register Fingerprint
          </button>

          <button
            onClick={authenticate}
            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-400"
            disabled={!isWebAuthnSupported()}
            aria-label="Authenticate with fingerprint"
          >
            Authenticate with Fingerprint
          </button>

          <button
            onClick={handlePasswordLogin}
            className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            aria-label="Log in with password"
          >
            Login with Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;