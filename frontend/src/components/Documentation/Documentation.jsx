import { useState } from "react";
import {
  KeyRound,
  Mail,
  Lock,
  Send,
  Download,
  Shuffle,
  Menu,
  X,
} from "lucide-react";
import Logo from "../../../public/logo.png";
import { Link } from "react-router-dom";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const docs = {
    "getting-started": {
      title: "Getting Started",
      icon: <Shuffle className="h-4 w-4 mr-2" />,
      content: (
        <>
          <p className="mb-4">
            Welcome to <strong>NeuroWallet</strong> — your secure and accessible way to
            manage money. This guide will walk you through how to set up and use
            the app with ease.
          </p>
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-gray-700">
            <p className="font-semibold mb-2">Quick Walkthrough</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Open the app — it can read the screen aloud for you.</li>
              <li>Swipe left or right to move between options.</li>
              <li>Double-tap anywhere to select.</li>
            </ul>
          </div>
        </>
      ),
    },
    authentication: {
      title: "Authentication",
      icon: <KeyRound className="h-4 w-4 mr-2" />,
      content: (
        <>
          <p className="mb-4">Choose how you want to log in:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-blue-600 mt-1" />
              <span>
                <strong>Email MagicLink:</strong> Tap the link we send to your
                inbox and you’re in.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="h-5 w-5 text-blue-600 mt-1" />
              <span>
                <strong>PIN:</strong> Set a 4–6 digit code. Quick and secure for
                everyday logins.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <KeyRound className="h-5 w-5 text-blue-600 mt-1" />
              <span>
                <strong>Passkeys:</strong> Use your fingerprint or FaceID to
                unlock instantly.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    send: {
      title: "Send Money",
      icon: <Send className="h-4 w-4 mr-2" />,
      content: (
        <ol className="list-decimal list-inside space-y-2">
          <li>Go to <strong>Send Money</strong>.</li>
          <li>Enter recipient’s details or pick from contacts.</li>
          <li>Type the amount you want to send.</li>
          <li>Confirm with PIN, passkey, or MagicLink.</li>
          <li>Get a confirmation notification ✅.</li>
        </ol>
      ),
    },
    receive: {
      title: "Receive Money",
      icon: <Download className="h-4 w-4 mr-2" />,
      content: (
        <ol className="list-decimal list-inside space-y-2">
          <li>Go to <strong>Receive Money</strong>.</li>
          <li>Copy your wallet address or share your QR code.</li>
          <li>Wait for the sender to pay.</li>
          <li>Instant confirmation when funds arrive 🎉.</li>
        </ol>
      ),
    },
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Navbar */}
      <header className="flex justify-between items-center px-4 sm:px-6 py-3 bg-white dark:bg-gray-900 shadow-md">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src={Logo}
            alt="Logo"
            className="h-8 w-8 sm:h-10 sm:w-10 dark:invert"
          />
          <h1 className="font-bold text-lg sm:text-xl text-blue-600 dark:text-blue-400">
            NeuroWallet
          </h1>
        </div>

        {/* Search + Button (hidden on small screens) */}
        <div className="hidden md:flex items-center gap-4 w-[60%]">
          <input
            type="search"
            placeholder="Search guides..."
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       bg-white text-gray-900 placeholder-gray-400 border-gray-200
                       dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
            aria-label="Search guides"
          />
          <Link to={"/login"}>
            <button
              
              className="px-4 py-2 border rounded-lg hover:bg-blue-600 hover:text-white transition
                        bg-white text-gray-800 border-gray-300
                        dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-blue-600"
            >
              Sign Up
            </button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:block w-64 bg-gray-100 dark:bg-gray-800 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">📖 User Guide</h2>
          <nav className="space-y-2" aria-label="Documentation sections">
            {Object.keys(docs).map((key) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex items-center w-full px-3 py-2 rounded-lg transition text-sm text-left gap-2
                  ${activeSection === key
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-800 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
              >
                <span className="flex-shrink-0">{docs[key].icon}</span>
                <span className="truncate">{docs[key].title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Sidebar (Mobile Drawer) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              className="flex-1 bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
            {/* Drawer */}
            <aside className="w-64 bg-white dark:bg-gray-900 p-6 space-y-4 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📖 User Guide</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
              <nav className="space-y-2" aria-label="Mobile documentation sections">
                {Object.keys(docs).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveSection(key);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center w-full px-3 py-2 rounded-lg transition text-sm gap-2
                      ${activeSection === key
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      }`}
                  >
                    <span className="flex-shrink-0">{docs[key].icon}</span>
                    <span className="truncate">{docs[key].title}</span>
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">
              {docs[activeSection].title}
            </h1>
            <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-100">
              {docs[activeSection].content}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
