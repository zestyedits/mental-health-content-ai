import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    // These are needed for the environment check, even if not explicitly called in the main flow
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    onSnapshot,
    updateDoc,
    collection,
    addDoc,
    query,
    orderBy,
    deleteDoc
} from 'firebase/firestore';

// --- Configuration ---
const SUBSCRIPTION_PLANS = {
    free: {
        name: 'Free',
        price: '$0',
        priceDescription: 'per month',
        tokens: 10,
        features: [
            '10 AI Generations/mo',
            'Access to Basic Prompts',
            'Community Support'
        ],
    },
    pro: {
        name: 'Creator',
        price: '$19',
        priceDescription: 'per month',
        tokens: 100,
        features: [
            '100 AI Generations/mo',
            'Access to All Prompts',
            'Saved Content Library',
            'Priority Email Support'
        ],
    },
    team: {
        name: 'Team',
        price: '$49',
        priceDescription: 'per month',
        tokens: 300,
        features: [
            '300 AI Generations/mo',
            'Up to 3 Team Members',
            'Saved Content Library',
            'Dedicated Account Manager'
        ],
    }
};

// --- SVG Icons ---
const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4Z" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 29C26.7614 29 29 26.7614 29 24C29 21.2386 26.7614 19 24 19C21.2386 19 19 21.2386 19 24C19 26.7614 21.2386 29 24 29Z" fill="#818cf8"/>
        <path d="M35 15C36.6569 15 38 13.6569 38 12C38 10.3431 36.6569 9 35 9C33.3431 9 32 10.3431 32 12C32 13.6569 33.3431 15 35 15Z" fill="#a78bfa"/>
        <path d="M13 39C14.6569 39 16 37.6569 16 36C16 34.3431 14.6569 33 13 33C11.3431 33 10 34.3431 10 36C10 37.6569 11.3431 39 13 39Z" fill="#a78bfa"/>
    </svg>
);
const CheckIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>;
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const PlannerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const SavedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;
const AccountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const BillingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m1-15h4m-2 2v4m6.5 1.5l-1.5 1.5M18 13l-1.5 1.5m-3-4l-1.5 1.5M12 8l-1.5 1.5" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;


// --- Accessibility Component ---
const SkipToContentLink = ({ targetId }) => (
    <a href={`#${targetId}`} className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 bg-indigo-600 text-white py-2 px-4 rounded-lg">
        Skip to main content
    </a>
);


// --- Landing Page Components ---
const LandingHeader = ({ setPage }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <header className="bg-slate-900/70 backdrop-blur-lg fixed w-full z-30">
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                <a href="#home" onClick={(e) => { e.preventDefault(); setPage('home'); }} className="flex items-center space-x-3 cursor-pointer">
                    <Logo />
                    <span className="text-xl font-bold text-white">MentalHealthContent.ai</span>
                </a>
                <div className="hidden md:flex items-center space-x-6">
                    <a href="#features" className="text-gray-300 hover:text-indigo-400">Features</a>
                    <a href="#pricing" className="text-gray-300 hover:text-indigo-400">Pricing</a>
                    <a href="#faq" className="text-gray-300 hover:text-indigo-400">FAQ</a>
                </div>
                <div className="hidden md:block">
                    <button onClick={() => setPage('login')} className="bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">Login</button>
                    <button onClick={() => setPage('signup')} className="ml-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors">Get Started</button>
                </div>
                <div className="md:hidden">
                    <button onClick={() => setIsOpen(!isOpen)} className="text-white">{isOpen ? <CloseIcon /> : <MenuIcon />}</button>
                </div>
            </nav>
            {isOpen && (
                <div className="md:hidden bg-slate-800 p-4">
                    <a href="#features" onClick={() => setIsOpen(false)} className="block text-gray-300 hover:text-indigo-400 py-2">Features</a>
                    <a href="#pricing" onClick={() => setIsOpen(false)} className="block text-gray-300 hover:text-indigo-400 py-2">Pricing</a>
                    <a href="#faq" onClick={() => setIsOpen(false)} className="block text-gray-300 hover:text-indigo-400 py-2">FAQ</a>
                    <div className="mt-4">
                        <button onClick={() => { setPage('login'); setIsOpen(false); }} className="w-full bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">Login</button>
                        <button onClick={() => { setPage('signup'); setIsOpen(false); }} className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors">Get Started</button>
                    </div>
                </div>
            )}
        </header>
    );
};

const HeroSection = ({ setPage }) => (
    <section className="bg-slate-900 text-white pt-32 pb-20">
        <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">Never Run Out of Content Ideas Again</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                AI-powered content generation for therapists, coaches, and mental health creators. Save time, reduce burnout, and grow your practice.
            </p>
            <button onClick={() => setPage('signup')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg shadow-indigo-500/30 flex items-center justify-center mx-auto">
                Start Creating for Free <ArrowRightIcon/>
            </button>
        </div>
    </section>
);

const FeaturesSection = () => (
    <section id="features" className="py-20 bg-slate-800">
        <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white">Your Personal Content Co-pilot</h2>
                <p className="text-gray-400 mt-4 max-w-2xl mx-auto">From blog posts to Instagram carousels, we've got you covered.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900 p-8 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">Versatile Content Types</h3>
                    <p className="text-gray-400">Generate blog ideas, Instagram posts, video scripts, client worksheets, and more in seconds.</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">Evidence-Informed Prompts</h3>
                    <p className="text-gray-400">Our AI is trained on therapeutic concepts to ensure your content is valuable and responsible.</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">Beat Creative Block</h3>
                    <p className="text-gray-400">Turn a single idea into dozens of content pieces, customized for your audience and platform.</p>
                </div>
            </div>
        </div>
    </section>
);

const PricingSection = ({ setPage }) => (
    <section id="pricing" className="py-20 bg-slate-900">
        <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white">Simple, Transparent Pricing</h2>
                <p className="text-gray-400 mt-4 max-w-2xl mx-auto">Choose the plan that fits your content creation needs.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                    <div key={plan.name} className={`bg-slate-800 rounded-lg p-8 border ${plan.name === 'Creator' ? 'border-indigo-500' : 'border-slate-700'} flex flex-col`}>
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                            <span className="text-gray-400"> {plan.priceDescription}</span>
                        </div>
                        <ul className="space-y-4 text-gray-300 mb-8 flex-grow">
                            {plan.features.map(feature => (
                                <li key={feature} className="flex items-start">
                                    <CheckIcon className="w-5 h-5 text-indigo-400 mr-3 mt-1 flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setPage('signup')} className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${plan.name === 'Creator' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                            Get Started
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const FaqSection = () => {
    const [open, setOpen] = useState(null);
    const faqs = [
        { q: "Who is this service for?", a: "MentalHealthContent.ai is designed for licensed therapists, certified coaches, mental health influencers, and students in the mental health field who create content online." },
        { q: "Is the generated content clinically sound?", a: "Our AI provides content ideas and drafts based on general mental health principles. It is NOT a substitute for professional clinical advice. You are responsible for reviewing, editing, and ensuring all content aligns with your professional expertise and ethical guidelines." },
        { q: "Can I cancel my subscription anytime?", a: "Yes, you can cancel your subscription at any time from your billing page. You will retain access until the end of your current billing period." },
        { q: "What is a 'generation'?", a: "One 'generation' refers to a single request to the AI to create a piece of content. Your monthly token limit determines how many generations you can perform." }
    ];

    return (
        <section id="faq" className="py-20 bg-slate-800">
            <div className="container mx-auto px-6 max-w-3xl">
                <h2 className="text-3xl font-bold text-center text-white mb-10">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="bg-slate-900 rounded-lg">
                            <button onClick={() => setOpen(open === index ? null : index)} className="w-full text-left p-6 flex justify-between items-center">
                                <span className="text-lg font-semibold text-white">{faq.q}</span>
                                <span className={`transform transition-transform duration-300 text-indigo-400 ${open === index ? 'rotate-45' : ''}`}>＋</span>
                            </button>
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${open === index ? 'max-h-96' : 'max-h-0'}`}>
                                <p className="p-6 pt-0 text-gray-300">{faq.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Footer = () => (
    <footer className="bg-slate-900 text-gray-400 py-10">
        <div className="container mx-auto px-6 text-center">
            <p>&copy; {new Date().getFullYear()} MentalHealthContent.ai. All rights reserved.</p>
        </div>
    </footer>
);

// --- Auth Page Components ---

const AuthWrapper = ({ title, children, setPage, switchText, switchPage }) => (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full mx-auto">
            <div className="text-center mb-8">
                <button onClick={() => setPage('home')} className="inline-block">
                    <Logo />
                </button>
                <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">{title}</h2>
            </div>
            <div className="bg-slate-800 p-8 rounded-lg shadow-lg border border-slate-700">
                {children}
            </div>
            <p className="mt-8 text-center text-sm text-gray-400">
                {switchText}{' '}
                <button onClick={() => setPage(switchPage)} className="font-semibold leading-6 text-indigo-400 hover:text-indigo-300">
                    Click here
                </button>
            </p>
        </div>
    </div>
);

const LoginPage = ({ handleAuth, setPage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const err = await handleAuth(email, password, 'login');
        if (err) setError(err);
        setLoading(false);
    };

    return (
        <AuthWrapper title="Sign in to your account" setPage={setPage} switchText="Not a member?" switchPage="signup">
            <form onSubmit={onSubmit} className="space-y-6">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full flex justify-center bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50">
                    {loading ? <Spinner/> : 'Sign In'}
                </button>
            </form>
        </AuthWrapper>
    );
};

const SignUpPage = ({ handleAuth, setPage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const err = await handleAuth(email, password, 'signup');
        if (err) setError(err);
        setLoading(false);
    };

    return (
        <AuthWrapper title="Create your account" setPage={setPage} switchText="Already have an account?" switchPage="login">
            <form onSubmit={onSubmit} className="space-y-6">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" required className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full flex justify-center bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50">
                    {loading ? <Spinner/> : 'Create Account'}
                </button>
            </form>
        </AuthWrapper>
    );
};

// --- Logged In Dashboard Components ---

const DashboardLayout = ({ children, handleLogout, setDashboardPage, activePage, userData }) => {
    const navItems = [
        { name: 'Generator', page: 'dashboard', icon: <DashboardIcon /> },
        { name: 'Planner', page: 'planner', icon: <PlannerIcon /> },
        { name: 'Saved Content', page: 'saved', icon: <SavedIcon /> },
        { name: 'Account', page: 'account', icon: <AccountIcon /> },
        { name: 'Billing', page: 'billing', icon: <BillingIcon /> },
    ];
    return (
        <div className="flex h-screen bg-slate-900 text-white">
            <aside className="w-64 bg-slate-800 p-6 flex-shrink-0 flex flex-col border-r border-slate-700">
                <button onClick={() => setDashboardPage('dashboard')} className="flex items-center space-x-3 mb-10 text-left">
                    <Logo />
                    <span className="text-xl font-bold">MHC.ai</span>
                </button>
                <nav className="flex-grow">
                    {navItems.map(item => (
                        <button key={item.name} onClick={() => setDashboardPage(item.page)} 
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg mb-2 text-left transition-colors ${activePage === item.page ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-gray-300'}`}>
                            {item.icon}
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>
                <div className="mt-auto">
                    {userData && (
                        <div className="text-sm text-gray-400 bg-slate-900 p-3 rounded-lg mb-4">
                            <p>Tokens Used: {userData.tokensUsedThisMonth} / {SUBSCRIPTION_PLANS[userData.subscriptionPlan]?.tokens}</p>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(userData.tokensUsedThisMonth / (SUBSCRIPTION_PLANS[userData.subscriptionPlan]?.tokens || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-700 text-gray-300">
                        <LogoutIcon />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <div className="flex-1 flex flex-col">
                <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-8 py-4 flex justify-between items-center">
                     <h1 className="text-xl font-bold capitalize">{activePage}</h1>
                     {/* Add other header elements here if needed */}
                </header>
                <main id="main-content" className="flex-1 overflow-y-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

const callGeminiAPI = async (userQuery, systemPrompt = null, schema = null) => {
    // In a real environment like Google's Canvas, the API key is provided automatically.
    // For local development or Codespaces, you might need to set this up as an environment variable.
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
    };

    if (systemPrompt) {
        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    if (schema) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: schema,
        };
    }
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("No content was generated from the API.");
    }
    
    return text;
};


const GeneratorPage = ({ userData, db, auth }) => {
    const [prompt, setPrompt] = useState('');
    const [contentType, setContentType] = useState('Instagram Post');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [personaDescription, setPersonaDescription] = useState('');
    const [generatedPersona, setGeneratedPersona] = useState('');
    const [isPersonaLoading, setIsPersonaLoading] = useState(false);

    const tokenLimit = useMemo(() => SUBSCRIPTION_PLANS[userData.subscriptionPlan]?.tokens || 0, [userData.subscriptionPlan]);
    const tokensRemaining = useMemo(() => tokenLimit - userData.tokensUsedThisMonth, [tokenLimit, userData.tokensUsedThisMonth]);
    
    const systemPrompt = "You are an AI assistant specialized in creating content for mental health professionals. Your tone should be empathetic, supportive, and professional. The content must be general advice and must not be presented as clinical diagnosis or treatment. Start every response with a disclaimer: 'Disclaimer: This content is for informational purposes only and is not a substitute for professional mental health advice.'";

    const handleAPICall = async (apiCallFn, shouldDecrementToken = true) => {
        if (shouldDecrementToken && tokensRemaining <= 0) {
            setError("You've used all your tokens for this month. Please upgrade your plan to continue generating content.");
            return;
        }
        setError('');
        try {
            await apiCallFn();
            if (shouldDecrementToken && auth.currentUser) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    tokensUsedThisMonth: userData.tokensUsedThisMonth + 1
                });
            }
        } catch (err) {
            console.error("Error during API call:", err);
            setError(`An error occurred: ${err.message}`);
        }
    };

    const handleGenerate = () => handleAPICall(async () => {
        if (!prompt) {
            setError('Please enter a topic or idea.');
            return;
        }
        setIsLoading(true);
        setGeneratedContent('');
        setSaveSuccess(false);
        let userQuery = `Generate a "${contentType}" about the following topic: "${prompt}"`;
        if (generatedPersona) {
            userQuery += ` Keep the following target audience persona in mind: ${generatedPersona}`;
        }
        const text = await callGeminiAPI(userQuery, systemPrompt);
        setGeneratedContent(text);
        setIsLoading(false);
    });
    
    const handleRefine = (refinement) => handleAPICall(async () => {
        if (!generatedContent) {
            setError('Please generate some content first before refining.');
            return;
        }
        setIsLoading(true);
        setSaveSuccess(false);
        const userQuery = `Take the following content and refine it. The refinement instruction is: "${refinement}".\n\nOriginal Content:\n${generatedContent}`;
        const text = await callGeminiAPI(userQuery, systemPrompt);
        setGeneratedContent(text);
        setIsLoading(false);
    });

    const handleGeneratePersona = () => handleAPICall(async () => {
        if (!personaDescription) {
            setError('Please describe your target audience.');
            return;
        }
        setIsPersonaLoading(true);
        setGeneratedPersona('');
        const personaSystemPrompt = "You are an expert marketing assistant for mental health professionals. Create a detailed, one-paragraph user persona based on the following description. Focus on their likely struggles, goals, and what kind of content tone and style would resonate with them.";
        const text = await callGeminiAPI(personaDescription, personaSystemPrompt);
        setGeneratedPersona(text);
        setIsPersonaLoading(false);
    });
    
    const handleSaveContent = () => handleAPICall(async () => {
        if (!generatedContent || !auth.currentUser) return;
        setSaveSuccess(false);
        const savedContentRef = collection(db, 'users', auth.currentUser.uid, 'savedContent');
        await addDoc(savedContentRef, {
            content: generatedContent,
            prompt: prompt,
            contentType: contentType,
            persona: generatedPersona,
            createdAt: new Date(),
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000); // Hide message after 3 seconds
    }, false);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Content Generator</h1>
            <p className="text-gray-400 mb-8">Let's create something amazing for your audience.</p>
            
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-8">
                 <h2 className="text-xl font-bold mb-4 flex items-center text-indigo-400"><SparklesIcon className="mr-2"/>Audience Persona Generator (Optional)</h2>
                 <p className="text-sm text-gray-400 mb-4">Describe your ideal client or follower, and the AI will create a persona to help tailor your content.</p>
                 <textarea
                    value={personaDescription}
                    onChange={(e) => setPersonaDescription(e.target.value)}
                    placeholder="e.g., 'New mothers in their early 30s feeling overwhelmed and anxious about parenting.'"
                    className="w-full h-20 bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleGeneratePersona} disabled={isPersonaLoading || tokensRemaining <= 0} className="mt-2 w-full md:w-auto bg-slate-600 text-white p-2 px-4 rounded-lg text-sm font-semibold hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                    {isPersonaLoading ? <Spinner/> : '✨ Generate Persona'}
                </button>
                {generatedPersona && (
                    <div className="mt-4 bg-slate-900 p-4 rounded-lg">
                        <h3 className="font-semibold text-white">Generated Persona:</h3>
                        <p className="text-gray-300 text-sm mt-1">{generatedPersona}</p>
                    </div>
                )}
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Content Topic</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., 'Tips for managing social anxiety at holiday parties'"
                            className="w-full h-24 bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
                        <select
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value)}
                            className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option>Instagram Post</option>
                            <option>Blog Post Idea</option>
                            <option>Short Video Script</option>
                            <option>Client Worksheet Idea</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleGenerate} disabled={isLoading || tokensRemaining <= 0} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                    {isLoading ? <Spinner/> : `Generate (${tokensRemaining} remaining)`}
                </button>
            </div>

            {error && <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">{error}</div>}

            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Generated Content:</h2>
                     {generatedContent && !isLoading && (
                        <button onClick={handleSaveContent} disabled={!userData || userData.subscriptionPlan === 'free'} className="flex items-center space-x-2 bg-slate-700 text-sm text-white py-1 px-3 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={userData && userData.subscriptionPlan === 'free' ? "Upgrade to save content" : "Save content"}>
                            <SavedIcon />
                            <span>{saveSuccess ? 'Saved!' : 'Save Content'}</span>
                        </button>
                    )}
                </div>
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 min-h-[200px] whitespace-pre-wrap text-gray-300">
                    {isLoading ? 'Generating...' : (generatedContent || 'Your AI-generated content will appear here.')}
                </div>
                {generatedContent && !isLoading && (
                     <div className="mt-4 flex flex-wrap gap-2">
                         <button onClick={() => handleRefine('Make it more empathetic')} className="bg-slate-700 text-sm text-white py-1 px-3 rounded-lg hover:bg-slate-600 transition-colors">✨ More Empathetic</button>
                         <button onClick={() => handleRefine('Make it more formal and professional')} className="bg-slate-700 text-sm text-white py-1 px-3 rounded-lg hover:bg-slate-600 transition-colors">✨ More Professional</button>
                         <button onClick={() => handleRefine('Shorten this for a Tweet')} className="bg-slate-700 text-sm text-white py-1 px-3 rounded-lg hover:bg-slate-600 transition-colors">✨ Shorten for X/Twitter</button>
                         <button onClick={() => handleRefine('Expand on this topic briefly')} className="bg-slate-700 text-sm text-white py-1 px-3 rounded-lg hover:bg-slate-600 transition-colors">✨ Expand on This</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const PlannerPage = ({ userData, db, auth }) => {
    const [theme, setTheme] = useState('');
    const [plan, setPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const tokenLimit = useMemo(() => SUBSCRIPTION_PLANS[userData.subscriptionPlan]?.tokens || 0, [userData.subscriptionPlan]);
    const tokensRemaining = useMemo(() => tokenLimit - userData.tokensUsedThisMonth, [tokenLimit, userData.tokensUsedThisMonth]);

    const handleGeneratePlan = async () => {
        if (!theme) {
            setError('Please enter a theme for the week.');
            return;
        }
         if (tokensRemaining <= 0) {
            setError("You've used all your tokens for this month. Please upgrade your plan.");
            return;
        }
        
        setIsLoading(true);
        setError('');
        setPlan(null);

        const systemPrompt = "You are an expert social media strategist for mental health professionals. Generate a 7-day content plan based on the user's theme. For each day, provide a unique topic, a suggested content format, and a brief prompt or starting idea. Output ONLY the JSON structure defined in the schema.";
        const userQuery = `Create a 7-day content plan for the theme: "${theme}"`;
        const schema = {
            type: "OBJECT",
            properties: {
                weekly_plan: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            day: { type: "STRING" },
                            topic: { type: "STRING" },
                            format: { type: "STRING" },
                            prompt: { type: "STRING" }
                        },
                        required: ["day", "topic", "format", "prompt"]
                    }
                }
            },
            required: ["weekly_plan"]
        };

        try {
            const jsonString = await callGeminiAPI(userQuery, systemPrompt, schema);
            const parsedPlan = JSON.parse(jsonString);
            setPlan(parsedPlan.weekly_plan);
            if(auth.currentUser){
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    tokensUsedThisMonth: userData.tokensUsedThisMonth + 1
                });
            }
        } catch(err) {
            console.error("Error generating plan:", err);
            setError(`Failed to generate plan: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div>
            <h1 className="text-3xl font-bold mb-2">Weekly Content Planner</h1>
            <p className="text-gray-400 mb-8">Plan your week's content around a central theme.</p>
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">Weekly Theme</label>
                <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., 'Setting Healthy Boundaries'"
                    className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleGeneratePlan} disabled={isLoading || tokensRemaining <= 0} className="mt-4 w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                   {isLoading ? <Spinner/> : `✨ Generate Plan (${tokensRemaining} remaining)`}
                </button>
            </div>
             {error && <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">{error}</div>}
            
            <div className="mt-8">
                {isLoading && <p>Generating your weekly plan...</p>}
                {plan && (
                    <div className="space-y-4">
                        {plan.map(dayPlan => (
                             <div key={dayPlan.day} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                                <h3 className="text-xl font-bold text-indigo-400">{dayPlan.day}: <span className="text-white">{dayPlan.topic}</span></h3>
                                <p className="text-sm font-semibold text-gray-300 bg-slate-700 inline-block px-2 py-1 rounded mt-2">{dayPlan.format}</p>
                                <p className="text-gray-400 mt-3">{dayPlan.prompt}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

const SavedContentPage = ({ db, auth }) => {
    const [savedContent, setSavedContent] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'users', auth.currentUser.uid, 'savedContent'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const content = [];
            querySnapshot.forEach((doc) => {
                content.push({ id: doc.id, ...doc.data() });
            });
            setSavedContent(content);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching saved content:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db, auth.currentUser]);
    
    const handleDelete = async (id) => {
        // In a real app, you would use a custom confirmation modal instead of window.confirm.
        const isConfirmed = window.confirm("Are you sure you want to delete this content?");
        if (isConfirmed) {
            if(!auth.currentUser) return;
            const docRef = doc(db, 'users', auth.currentUser.uid, 'savedContent', id);
            await deleteDoc(docRef);
        }
    };
    
    const handleCopy = (content, id) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Saved Content</h1>
            <p className="text-gray-400 mb-8">Your library of generated content.</p>
            {savedContent.length === 0 ? (
                <div className="text-center py-10 bg-slate-800 rounded-lg">
                    <p className="text-gray-400">You haven't saved any content yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Upgrade to a paid plan to unlock this feature.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedContent.map(item => (
                        <div key={item.id} className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col">
                            <p className="text-gray-300 text-sm flex-grow whitespace-pre-wrap">
                                {item.content.length > 200 ? `${item.content.substring(0, 200)}...` : item.content}
                            </p>
                            <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                                <span>{item.createdAt?.toDate().toLocaleDateString()}</span>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleCopy(item.content, item.id)} className="hover:text-indigo-400">
                                        {copiedId === item.id ? 'Copied!' : <CopyIcon />}
                                    </button>
                                     <button onClick={() => handleDelete(item.id)} className="hover:text-red-400">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const AccountPage = ({ user }) => (
    <div>
        <h1 className="text-3xl font-bold mb-2">Account</h1>
        <p className="text-gray-400 mb-8">Manage your account settings.</p>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-md">
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300">Email Address</label>
                <p className="text-lg mt-1">{user?.email}</p>
            </div>
            {/* Note: Password change requires a more complex flow (sendPasswordResetEmail) which is omitted for simplicity */}
            <button className="bg-slate-700 text-white p-3 rounded-lg hover:bg-slate-600 transition-colors">Change Password (coming soon)</button>
        </div>
    </div>
);

const BillingPage = ({ userData }) => {
    const handleManageSubscription = () => {
        // **STRIPE INTEGRATION POINT**
        // In a real application, this would call a backend function to create a
        // Stripe Customer Portal session and then redirect the user to the returned URL.
        alert("This would redirect to your Stripe Customer Portal to manage billing, invoices, and cancellations.");
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Billing</h1>
            <p className="text-gray-400 mb-8">Manage your subscription and payment details.</p>
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-md">
                <div className="mb-6">
                    <h3 className="font-semibold text-white">Current Plan</h3>
                    <p className="text-2xl font-bold text-indigo-400 mt-1">{SUBSCRIPTION_PLANS[userData.subscriptionPlan]?.name}</p>
                </div>
                {userData.subscriptionPlan !== 'free' ? (
                    <button onClick={handleManageSubscription} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-500 transition-colors">
                        Manage Billing & Invoices
                    </button>
                ) : (
                    <p className="text-gray-400">You are currently on the Free plan. Choose a plan below to upgrade.</p>
                )}
            </div>
             <div className="mt-12">
                 <h2 className="text-2xl font-bold mb-6">Upgrade Your Plan</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {Object.entries(SUBSCRIPTION_PLANS).filter(([key]) => key !== 'free').map(([key, plan]) => (
                        <div key={key} className={`bg-slate-800 rounded-lg p-8 border ${userData.subscriptionPlan === key ? 'border-indigo-500' : 'border-slate-700'} flex flex-col`}>
                            <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                             <div className="mb-6">
                                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                                <span className="text-gray-400"> {plan.priceDescription}</span>
                            </div>
                            <ul className="space-y-4 text-gray-300 mb-8 flex-grow">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-start">
                                        <CheckIcon className="w-5 h-5 text-indigo-400 mr-3 mt-1 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={handleManageSubscription}
                                disabled={userData.subscriptionPlan === key}
                                className="w-full py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                                {userData.subscriptionPlan === key ? 'Current Plan' : `Upgrade to ${plan.name}`}
                            </button>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
};


// --- Main App Component ---
/* global __firebase_config, __initial_auth_token */

export default function App() {
    const [page, setPage] = useState('home'); // home, login, signup, dashboard
    const [dashboardPage, setDashboardPage] = useState('dashboard'); // dashboard, planner, saved, account, billing
    
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Firebase state
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Use the config provided by the environment, or fall back to the React env var.
                const firebaseConfigStr = typeof __firebase_config !== 'undefined' 
                    ? __firebase_config
                    : process.env.REACT_APP_FIREBASE_CONFIG;
                
                if (!firebaseConfigStr) {
                    console.warn("Firebase config not found. App will run in offline mode.");
                    setLoading(false);
                    return;
                }

                const firebaseConfig = JSON.parse(firebaseConfigStr);
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                setAuth(authInstance);
                setDb(dbInstance);

                // Handle authentication based on the environment
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                   await signInWithCustomToken(authInstance, __initial_auth_token);
                }

                const unsubscribeAuth = onAuthStateChanged(authInstance, (currentUser) => {
                    setLoading(true); 
                    if (currentUser) {
                        setUser(currentUser);
                    } else {
                        setUser(null);
                        setUserData(null);
                        setPage('home');
                        setLoading(false);
                    }
                });
                return () => unsubscribeAuth();
            } catch (error) {
                console.error("Firebase initialization failed:", error);
                setLoading(false);
            }
        };

        initializeFirebase();
    }, []);
    
    useEffect(() => {
        let unsubscribeDb;
        if (user && db) {
            const userRef = doc(db, 'users', user.uid);
            unsubscribeDb = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                    setPage('dashboard'); 
                } else {
                    console.log("User document not found, creating one for new sign-up.");
                    const initialUserData = {
                        email: user.email,
                        createdAt: new Date(),
                        subscriptionPlan: 'free',
                        tokensUsedThisMonth: 0,
                    };
                    setDoc(userRef, initialUserData).then(() => {
                        setUserData(initialUserData);
                        setPage('dashboard');
                    }).catch(console.error);
                }
                setLoading(false); 
            }, (error) => {
                console.error("Error in user data snapshot:", error);
                setLoading(false);
            });
        }
        return () => {
            if (unsubscribeDb) unsubscribeDb();
        };
    }, [user, db]);


    const handleAuth = async (email, password, type) => {
        if (!auth || !db) return "Authentication service not ready. Please check your connection and Firebase setup.";
        try {
            if (type === 'signup') {
                await createUserWithEmailAndPassword(auth, email, password);
                // The onSnapshot listener will handle document creation for the new user.
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            return null;
        } catch (error) {
            return error.message.replace('Firebase: ', '');
        }
    };
    
    const handleLogout = async () => {
        if (auth) await signOut(auth);
    };

    if (loading) {
        return <div className="bg-slate-900 min-h-screen flex justify-center items-center"><Spinner /></div>;
    }

    const renderPage = () => {
        if (page === 'dashboard' && user && userData) {
            const dashboardContent = () => {
                switch (dashboardPage) {
                    case 'account': return <AccountPage user={user} />;
                    case 'billing': return <BillingPage userData={userData} />;
                    case 'planner': return <PlannerPage userData={userData} db={db} auth={auth} />;
                    case 'saved': return <SavedContentPage db={db} auth={auth} />;
                    case 'dashboard':
                    default:
                        return <GeneratorPage userData={userData} db={db} auth={auth} />;
                }
            };
            return (
                <>
                    <SkipToContentLink targetId="main-content" />
                    <DashboardLayout 
                        handleLogout={handleLogout} 
                        setDashboardPage={setDashboardPage}
                        activePage={dashboardPage}
                        userData={userData}
                    >
                        {dashboardContent()}
                    </DashboardLayout>
                </>
            );
        }
        
        switch (page) {
            case 'login': return <LoginPage handleAuth={handleAuth} setPage={setPage} />;
            case 'signup': return <SignUpPage handleAuth={handleAuth} setPage={setPage} />;
            case 'home':
            default: return (
                <>
                    <LandingHeader setPage={setPage} />
                    <main>
                        <HeroSection setPage={setPage} />
                        <FeaturesSection />
                        <PricingSection setPage={setPage} />
                        <FaqSection />
                    </main>
                    <Footer />
                </>
            );
        }
    };
    
    return <div className="bg-slate-900 font-sans">{renderPage()}</div>;
}

