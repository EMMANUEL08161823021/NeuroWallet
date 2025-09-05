// LandingPage.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Lock, EyeOff, UserPlus, Fingerprint, Wallet } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { AccountCard } from "@/components/AccountCard";
// import { TransactionHistory } from "@/components/TransactionHistory";
// import { VoiceInput } from "@/components/VoiceInput";
import {
  Accessibility,
  Shield,
  Mic,
  Eye,
  Send,
  Plus,
  CreditCard,
  Settings,
  HelpCircle,
  Menu,
} from "lucide-react";


import { ChevronDown } from "lucide-react";

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
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between border items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">NeuroWallet</h1>
              </div>
              {/* <Badge variant="secondary" className="text-xs"> */}
                <Accessibility className="h-3 w-3 mr-1" />
                Accessible Banking
              {/* </Badge> */}
            </div>

            <nav className="hidden md:flex items-center gap-4">
              <button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              <button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </button>
              <Link to="/login">
                <button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Secure Login
                </button>
              </Link>
            </nav>

            <button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary via-primary-hover to-accent text-primary-foreground py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                Banking for <span className="text-accent-foreground">Everyone</span>
              </h1>
              <p className="text-xl opacity-90 leading-relaxed">
                Experience accessible digital banking designed for users with visual, hearing, and motor <br/>challenges. Banking should be simple and inclusive for all.
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Accessibility className="h-5 w-5" />
                  <span>Accessible Design</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  <span>Voice Commands</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <span>Secure Authentication</span>
                </div>
              </div>

              <div className="pt-4">
                {/* <VoiceInput onVoiceCommand={handleVoiceCommand} /> */}
              </div>
            </div>

            <div className="lg:flex justify-center hidden">
              <img
                // src={heroImage}
                alt="Diverse people using accessible banking technology"
                className="rounded-2xl shadow-2xl max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <br/>
      <br/>
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



      {/* How it works */}
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
                <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
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
                <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
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
                <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
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
                <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
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
      {/*Frequently Asked Question  */}
      <section className="max-w-3xl mx-auto px-6 ">
        <h2 className="text-3xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg shadow-sm"
            >
              <button
                className="w-full flex justify-between items-center px-4 py-3 text-left"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <span className="font-medium text-gray-800">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    openIndex === idx ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === idx && (
                <div className="px-4 pb-4 text-gray-600">{faq.answer}</div>
              )}
            </div>
          ))}
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