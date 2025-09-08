// LandingPage.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lock, CreditCard, ChevronLeft, ChevronRight, ChevronDown, EyeOff, UserPlus, Fingerprint, Wallet, Mic, Eye } from "lucide-react";
import {
  Accessibility,
  Shield,
  // Eye,
  Send,
  Plus,
  
  Settings,
  HelpCircle,
  Menu,
} from "lucide-react";
import Hero from "../../assets/hero-img.png";

const screenshots = [
  { src: "/images/dashboard.png", caption: "Clean & Accessible Dashboard" },
  { src: "/images/transfer.png", caption: "Seamless Money Transfers" },
  { src: "/images/voice-command.png", caption: "Voice Command Navigation" },
];

const features = [
  {
    icon: <Mic className="h-8 w-8 text-blue-600" />,
    title: "Voice-to-Text Transfers",
    description:
      "Send and receive money using your voice. NeuroWallet makes transactions easy for users with limited mobility.",
  },
  {
    icon: <Eye className="h-8 w-8 text-green-600" />,
    title: "Screen-Reader Friendly",
    description:
      "Our high-contrast design and ARIA support ensure smooth navigation for visually impaired users.",
  },
  {
    icon: <Fingerprint className="h-8 w-8 text-purple-600" />,
    title: "Multi-Modal Login",
    description:
      "Choose between biometrics, PIN, or voice login — empowering everyone to bank their own way.",
  },
];

const faqs = [
  {
    question: "What is NeuroWallet?",
    answer:
      "NeuroWallet is an accessible digital banking app that combines biometrics, voice commands, and PIN fallback to make banking inclusive for everyone.",
  },
  {
    question: "Is NeuroWallet secure?",
    answer:
      "Yes! All transactions are protected with multi-layered authentication, encryption, and optional PIN verification.",
  },
  {
    question: "Can visually impaired users use NeuroWallet?",
    answer:
      "Absolutely. NeuroWallet supports voice commands, screen readers, and high-contrast UI for visually impaired users.",
  },
  {
    question: "How do I get started?",
    answer:
      "Simply sign up with your email, set up biometrics or a PIN, and you’re ready to start banking securely.",
  },
];
// import heroImage from "@/assets/hero-banking.jpg";
// import { useToast } from "@/hooks/use-toast";

const LandingPage = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [transferAmount, setTransferAmount] = useState("");
  const [openIndex, setOpenIndex] = useState(null);

  const [current, setCurrent] = useState(0);

  const prevSlide = () =>
    setCurrent((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1));

  const nextSlide = () =>
    setCurrent((prev) => (prev === screenshots.length - 1 ? 0 : prev + 1));
  // const { toast } = useToast();

  // Mock data - in real app, this would come from API
  const accounts = [
    {
      id: "1",
      name: "Main Checking",
      type: "checking",
      balance: 2450.75,
      accountNumber: "1234567890",
    },
    {
      id: "2",
      name: "Savings Account",
      type: "savings",
      balance: 8320.5,
      accountNumber: "0987654321",
    },
    {
      id: "3",
      name: "Digital Wallet",
      type: "wallet",
      balance: 156.25,
      accountNumber: "5432109876",
    },
  ];

  const transactions = [
    {
      id: "1",
      type: "credit",
      amount: 1250.0,
      description: "Salary Deposit",
      date: "2024-01-15T10:30:00Z",
      status: "completed",
      category: "Salary",
    },
    {
      id: "2",
      type: "debit",
      amount: 89.99,
      description: "Grocery Store Purchase",
      date: "2024-01-14T15:45:00Z",
      status: "completed",
      category: "Food",
    },
    {
      id: "3",
      type: "debit",
      amount: 450.0,
      description: "Rent Payment",
      date: "2024-01-13T09:00:00Z",
      status: "completed",
      category: "Housing",
    },
    {
      id: "4",
      type: "credit",
      amount: 25.5,
      description: "Cashback Reward",
      date: "2024-01-12T14:20:00Z",
      status: "completed",
      category: "Rewards",
    },
  ];

  const handleVoiceCommand = (command) => {
    const lowerCommand = String(command).toLowerCase();

    if (lowerCommand.includes("balance") || lowerCommand.includes("account")) {
      setShowBalance(true);
      toast({
        title: "Voice command processed",
        description: "Showing account balances",
      });
    } else if (lowerCommand.includes("hide") || lowerCommand.includes("privacy")) {
      setShowBalance(false);
      toast({
        title: "Voice command processed",
        description: "Balances hidden for privacy",
      });
    } else if (lowerCommand.includes("send") || lowerCommand.includes("transfer")) {
      toast({
        title: "Voice command processed",
        description: "Opening transfer interface",
      });
    } else {
      toast({
        title: "Command not recognized",
        description: 'Try commands like "show balance", "hide balance", or "send money"',
      });
    }
  };

  const handleQuickTransfer = () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid transfer amount",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Transfer initiated",
      description: `Transfer of $${transferAmount} is being processed`,
    });
    setTransferAmount("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">NeuroWallet</h1>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Accessibility className="h-3 w-3 mr-1" />
                Accessible Banking
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4">
              <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </button>
              <Link to="/login">
                <button className="flex items-center text-sm border border-blue-600 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                  <Shield className="h-4 w-4 mr-2" />
                  Secure Login
                </button>
              </Link>
            </nav>

            {/* Mobile Menu Icon */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      <br/>
      {/* <br/> */}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-20 overflow-hidden">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Decorative blurred gradient circle */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8  h-[80vh]">
          <div className="flex justify-between w-[100%] text-center border-2 border-red-600 items-start">
            {/* Left Text Section */}
            <div className="space-y-8 text-center w-[45%] border-2 lg:text-left flex flex-col justify-center">
              <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight">
                Banking for{" "}
                <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-red-400 bg-clip-text text-transparent">
                  Everyone
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-200 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Experience accessible digital banking designed for users with visual,
                hearing, and motor challenges. <br />
                Banking should be simple, secure, and inclusive for all.
              </p>

              {/* Feature Highlights */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full shadow-md">
                  <Accessibility className="h-5 w-5" />
                  <span className="text-sm font-medium">Accessible Design</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full shadow-md">
                  <Mic className="h-5 w-5" />
                  <span className="text-sm font-medium">Voice Commands</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full shadow-md">
                  <Shield className="h-5 w-5" />
                  <span className="text-sm font-medium">Secure Authentication</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start">
                <Link to={"/login"}>
                  <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition transform">
                    Get Started
                  </button>
                </Link>
                <button className="px-6 py-3 border border-white/60 rounded-xl font-semibold hover:bg-white/10 hover:scale-105 transition transform">
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Image Section */}
            <div className="border-2 hidden w-[45%] lg:flex justify-center">
              <img
                src={Hero}
                style={{height: '500px', width: '300px'}}
                alt="Diverse people using accessible banking technology"
                className="rounded-3xl shadow-2xl border-4 border-white/20 hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

        </div>
      </section>

      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-extrabold text-gray-900"
          >
            Why Traditional Banking Apps Fail
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-3 text-gray-600 max-w-2xl"
          >
            Millions struggle with inaccessible financial services that weren’t designed with inclusivity in mind.
          </motion.p>

          {/* Grid Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-10 w-full">
            {/* Card 1 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col items-center"
            >
              <AlertTriangle className="h-10 w-10 mb-3" />
              <h2 className="text-xl font-semibold">Poor Accessibility</h2>
              <p className="mt-2 text-sm">
                No screen reader support, tiny buttons, and low contrast make banking impossible for visually impaired users.
              </p>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-600 text-white p-6 rounded-2xl shadow-lg flex flex-col items-center"
            >
              <Lock className="h-10 w-10 mb-3" />
              <h2 className="text-xl font-semibold">Complex Authentication</h2>
              <p className="mt-2 text-sm">
                Overly complex passwords and multi-step verification create barriers for users with motor limitations.
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-purple-600 text-white p-6 rounded-2xl shadow-lg flex flex-col items-center"
            >
              <EyeOff className="h-10 w-10 mb-3" />
              <h2 className="text-xl font-semibold">Confusing Interface</h2>
              <p className="mt-2 text-sm">
                Cluttered designs with no voice navigation or alternative input methods exclude hearing-impaired users.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Meet NeuroWallet */}
      <br/>
      <br/>
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Meet <span className="text-blue-600">NeuroWallet</span>
          </h1>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            A new way to bank — built from the ground up to be inclusive, 
            accessible, and empowering for everyone. No barriers, no compromises.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Accessibility First</h2>
              <p className="text-gray-600">
                Full screen reader support, large touch targets, and 
                high-contrast design so everyone can manage money independently.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.105.895-2 2-2s2 .895 2 2v1h-4v-1zM7 13h1v-1a4 4 0 118 0v1h1a2 2 0 012 2v5H5v-5a2 2 0 012-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Simplified Security</h2>
              <p className="text-gray-600">
                Login with biometrics, passkeys, or a single secure tap. 
                Safe authentication without frustrating steps.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m0 4v12m6-4l6 4V5l-6 4z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Intuitive Experience</h2>
              <p className="text-gray-600">
                Clean design with voice navigation, haptic cues, and 
                alternative input support — banking that adapts to you.
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Key Features */}
      <br/>
      <br/>
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Key <span className="text-blue-600">Features</span>
          </h1>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Get started in just a few steps — designed to be simple, secure, and accessible for everyone.
          </p>

          <div className="grid md:grid-cols-2 gap-8 text-left">
            {/* Step 1 */}
            <div className="bg-gray-50 p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-600 text-white whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-full">
                  Step 1
                </span>
                <h2 className="text-xl font-semibold text-gray-800">Biometric Login</h2>
              </div>
              <p className="text-gray-600">
                Create your account with just an email address — no complex forms, 
                just secure and fast onboarding.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-50 p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-600 text-white whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-full">
                  Step 2
                </span>
                <h2 className="text-xl font-semibold text-gray-800">Voice Commands</h2>
              </div>
              <p className="text-gray-600">
                Set up biometrics, create a PIN, or use voice recognition —
                choose the method that works best for you.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-50 p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-600 text-white whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-full">
                  Step 3
                </span>
                <h2 className="text-xl font-semibold text-gray-800">PIN Fallback</h2>
              </div>
              <p className="text-gray-600">
                If biometrics aren’t available, fallback to your personal PIN 
                for quick and safe access.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-gray-50 p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-600 text-white whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-full">
                  Step 4
                </span>
                <h2 className="text-xl font-semibold text-gray-800">Inclusive Accessibility</h2>
              </div>
              <p className="text-gray-600">
                Enjoy a fully accessible experience with voice commands, 
                intuitive layouts, and screen reader support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Accessibility First, Always*/}

      <br/>
      <br/>
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {/* Section Heading */}
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-extrabold text-gray-900"
          >
            Accessibility First, Always
          </motion.h2>
          <p className="mt-3 text-gray-600 text-lg">
            NeuroWallet is built for everyone — inclusive, adaptive, and empowering.
          </p>

          {/* Feature Grid */}
          <div className="mt-10 grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition"
              >
                <div className="flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-600 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* How it works */}
      <br/>
      <br/>
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-extrabold text-gray-900"
          >
            How It Works
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-3 text-gray-600 max-w-2xl"
          >
            Get started in three simple steps.
          </motion.p>

          {/* Steps Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-10 w-full">
            {/* Step 1 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-50 p-6 rounded-2xl shadow-lg text-left"
            >
              <div className="flex items-center mb-4">
                <div className="bg-blue-900 text-white px-3 py-1 rounded-md text-sm font-semibold">
                  Step 1
                </div>
              </div>
              <UserPlus className="h-10 w-10 text-blue-900 mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Sign Up</h2>
              <p className="mt-2 text-gray-600 text-sm">
                Create your account with just an email address. No complex forms or unnecessary barriers.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-50 p-6 rounded-2xl shadow-lg text-left"
            >
              <div className="flex items-center mb-4">
                <div className="bg-blue-900 text-white px-3 py-1 rounded-md text-sm font-semibold">
                  Step 2
                </div>
              </div>
              <Fingerprint className="h-10 w-10 text-blue-900 mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Login</h2>
              <p className="mt-2 text-gray-600 text-sm">
                Set up biometric authentication, create a PIN, or use voice recognition — whatever works for you.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gray-50 p-6 rounded-2xl shadow-lg text-left"
            >
              <div className="flex items-center mb-4">
                <div className="bg-blue-900 text-white px-3 py-1 rounded-md text-sm font-semibold">
                  Step 3
                </div>
              </div>
              <Wallet className="h-10 w-10 text-blue-900 mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Start Banking</h2>
              <p className="mt-2 text-gray-600 text-sm">
                Enjoy secure, accessible banking with voice commands, intuitive design, and full independence.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      <br/>
      <br/>

      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {/* Section Title */}
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Screenshots / Demo
          </h2>
          <p className="text-gray-600 mb-10">
            A quick look at how NeuroWallet empowers inclusive, secure banking
          </p>

          {/* Carousel Container */}
          <div className="relative w-full max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="rounded-xl overflow-hidden shadow-lg bg-white"
              >
                <img
                  src={screenshots[current].src}
                  alt={screenshots[current].caption}
                  className="w-full h-[400px] object-cover"
                />
                <div className="p-4 bg-gray-100 text-gray-800 font-medium text-sm">
                  {screenshots[current].caption}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-2 hover:bg-gray-100"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {screenshots.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-3 h-3 rounded-full transition ${
                  idx === current ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/*Frequently Asked Question  */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-extrabold text-gray-900"
          >
            Frequently Asked Questions
          </motion.h2>

          {/* FAQ List */}
          <div className="mt-10 space-y-4 text-left">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  className="w-full flex justify-between items-center px-5 py-4 text-left focus:outline-none hover:bg-gray-50"
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                >
                  <span className="font-medium text-gray-800">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${
                      openIndex === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {openIndex === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-5 pb-4 text-gray-600 text-sm leading-relaxed"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-muted border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-semibold">NeuroWallet</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Accessible banking designed for everyone. Your financial freedom starts here.
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Accessibility Features
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Security Center
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;




// {/* Main Dashboard */}
// <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//   {/* Account Overview */}
//   <section className="mb-12">
//     <div className="flex items-center justify-between mb-6">
//       <h2 className="text-2xl font-bold text-foreground">Your Accounts</h2>
//       <Button
//         variant="outline"
//         size="sm"
//         onClick={() => setShowBalance(!showBalance)}
//         aria-label={showBalance ? "Hide all balances" : "Show all balances"}
//       >
//         <Eye className="h-4 w-4 mr-2" />
//         {showBalance ? "Hide Balances" : "Show Balances"}
//       </Button>
//     </div>

//     <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
//       {accounts.map((account) => (
//         <AccountCard
//           key={account.id}
//           account={account}
//           showBalance={showBalance}
//           onToggleBalance={() => setShowBalance(!showBalance)}
//           onViewDetails={() => {
//             toast({
//               title: "Account details",
//               description: `Viewing details for ${account.name}`,
//             });
//           }}
//         />
//       ))}
//     </div>
//   </section>

//   {/* Quick Actions */}
//   <section className="mb-12">
//     <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
//     <div className="grid sm:grid-cols-2 gap-6">
//       {/* Quick Transfer */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Send className="h-5 w-5" />
//             Quick Transfer
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="space-y-2">
//             <label htmlFor="transfer-amount" className="text-sm font-medium">
//               Amount ($)
//             </label>
//             <Input
//               id="transfer-amount"
//               type="number"
//               placeholder="0.00"
//               value={transferAmount}
//               onChange={(e) => setTransferAmount(e.target.value)}
//               className="text-lg h-12"
//               min={0}
//               step={0.01}
//             />
//           </div>
//           <Button onClick={handleQuickTransfer} className="w-full h-12" size="lg">
//             <Send className="h-4 w-4 mr-2" />
//             Send Money
//           </Button>
//         </CardContent>
//       </Card>

//       {/* Add Money */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Plus className="h-5 w-5" />
//             Add Money
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="grid grid-cols-2 gap-3">
//             <Button variant="outline" size="lg">
//               $25
//             </Button>
//             <Button variant="outline" size="lg">
//               $50
//             </Button>
//             <Button variant="outline" size="lg">
//               $100
//             </Button>
//             <Button variant="outline" size="lg">
//               Custom
//             </Button>
//           </div>
//           <Button className="w-full h-12" size="lg">
//             <Plus className="h-4 w-4 mr-2" />
//             Add to Wallet
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   </section>

//   {/* Transaction History */}
//   <section>
//     <TransactionHistory transactions={transactions} maxVisible={6} />
//   </section>
// </main>