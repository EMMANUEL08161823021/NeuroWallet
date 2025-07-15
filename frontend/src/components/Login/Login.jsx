import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { startRegistration, startAuthentication } from '@simplewebauthn/browser';


const Login = () => {
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userId] = useState('user-' + Math.random().toString(36).substr(2, 9));
  const navigate = useNavigate();


  // Check if WebAuthn is supported
  const isWebAuthnSupported = () => {
    return window.PublicKeyCredential !== undefined && window.isSecureContext;
  };

  // Generate a random challenge
  const generateChallenge = () => {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge;
  };

  // Register new credential
  const registerCredential = async () => {
    if (!isWebAuthnSupported()) {
      setStatus('WebAuthn is not supported or not running in a secure context (use HTTPS or localhost)');
      return;
    }

    setStatus('Initiating registration... Please follow the biometric prompt.');

    try {
      const publicKey = {
        challenge: generateChallenge(),
        rp: {
            name: "Fingerprint Auth Demo",
            id: "localhost"
        },
        user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: "Demo User"
        },
        pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
            userVerification: "required"
        },
        timeout: 120000 // Increased to 2 minutes
      };

      const credential = await navigator.credentials.create({ publicKey });
      setStatus('Registration successful!');
      setIsRegistered(true);
      console.log('Registered credential:', credential);
    } catch (error) {
      setStatus(`Registration failed: ${error.message}. Ensure biometrics are set up and try again.`);
    }
  };

  // Authenticate with existing credential
  const authenticate = async () => {
    if (!isWebAuthnSupported()) {
      setStatus('WebAuthn is not supported or not running in a secure context (use HTTPS or localhost)');
      return;
    }

    setStatus('Initiating authentication... Please follow the biometric prompt.');

    try {
      const publicKey = {
        challenge: generateChallenge(),
        rpId: "localhost",
        allowCredentials: [],
        userVerification: "required",
        timeout: 120000 // Increased to 2 minutes
      };

      const assertion = await navigator.credentials.get({ publicKey });
      setStatus('Authentication successful!');
      navigate('/home');

      console.log('Authentication assertion:', assertion);
    } catch (error) {
      setStatus(`Authentication failed: ${error.message}. Ensure biometrics are set up and try again.`);
    }
  };


  return (
    <div>
      <div style={{ height: '56px' }}></div>
      <div className="col-12 col-lg-5 mx-auto" style={{border: '2px solid black', height: '90vh'}}>
        <div className="bg-white bg-opacity-95 border-t border-gray-200 flex flex-col items-center justify-center space-y-4 p-2">
          {message && <div className={`text-center ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</div>}
          <div>
            <h2>Hello Steve,</h2>
            <p>Use touchID to login to bank account</p>
          </div>
          <div className='' style={{height: '40vh'}}>
            {/* <h1>FINGERPRINT BAR</h1> */}
          </div>
          <div className="d-flex flex-column gap-3 space-y-4">

            {!isWebAuthnSupported() && (
              <p className="text-red-500 mb-4">WebAuthn is not supported or not running in a secure context. Use HTTPS or localhost.</p>
            )}
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!isRegistered ? (
                <button
                    onClick={registerCredential}
                    className="w-full bg-blue-500 text-dark py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
                    disabled={!isWebAuthnSupported()}
                >
                    Register Fingerprint
                </button>
            ) : (
                <button
                    onClick={authenticate}
                    className="w-full bg-green-500 text-dark py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
                    disabled={!isWebAuthnSupported()}
                >
                    Authenticate with Fingerprint
                </button>
            )}
            <button
                onClick={authenticate}
                className="w-full bg-green-500 text-dark py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
                disabled={!isWebAuthnSupported()}
            >
                Authenticate with Fingerprint
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;