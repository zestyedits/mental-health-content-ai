import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot,
    updateDoc
} from 'firebase/firestore';

// --- Configuration ---
// You can easily manage your subscription plans here.
const SUBSCRIPTION_PLANS = {
    free: {
        name: 'Free',
        price: '$0',
        priceDescription: 'per month',
        tokens: 5,
        features: [
            '5 AI Generations/mo',
            'Access to Basic Prompts',
            'Community Support'
        ],
    },
    pro: {
        name: 'Pro',
        price: '$29',
        priceDescription: 'per month',
        tokens: 50,
        features: [
            '50 AI Generations/mo',
            'Access to All Prompts',
            'Advanced Content Types',
            'Priority Email Support'
        ],
    },
    team: {
        name: 'Team',
        price: '$79',
        priceDescription: 'per month',
        tokens: 200,
        features: [
            '200 AI Generations/mo',
            'Up to 5 Team Members',
            'Collaborative Workspace',
            'Dedicated Account Manager'
        ],
    }
};

// --- SVG Icons ---
// Using inline SVGs to keep everything in one file and avoid external dependencies.
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
const AccountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const BillingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

// --- Landing Page Components ---
const LandingHeader = ({ setPage }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <header className="bg-slate-900/70 backdrop-blur-lg fixed w-full z-30">
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <Logo />
                    <span className="text-xl font-bold text-white">MentalHealthContent.ai</span>
                </div>
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
                    <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? <CloseIcon /> : <MenuIcon />}</button>
                </div>
            </nav>
            {isOpen && (
                <div className="md:hidden bg-slate-800 p-4">
                    <a href="#features" className="block text-gray-300 hover:text-indigo-400 py-2">Features</a>
                    <a href="#pricing" className="block text-gray-300 hover:text-indigo-400 py-2">Pricing</a>
                    <a href="#faq" className="block text-gray-300 hover:text-indigo-400 py-2">FAQ</a>
                    <div className="mt-4">
                        <button onClick={() => setPage('login')} className="w-full bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">Login</button>
                        <button onClick={() => setPage('signup')} className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors">Get Started</button>
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
            <button onClick={() => setPage('signup')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg shadow-indigo-500/30">
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
                    <div key={plan.name} className={`bg-slate-800 rounded-lg p-8 border ${plan.name === 'Pro' ? 'border-indigo-500' : 'border-slate-700'} flex flex-col`}>
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
                        <button onClick={() => setPage('signup')} className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${plan.name === 'Pro' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                            Get Started
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const FaqSection = () => {
    const faqs = [
        { q: "Who is this service for?", a: "MentalHealthContent.ai is designed for licensed therapists, certified coaches, mental health influencers, and students in the mental health field who create content online." },
        { q: "Is the generated content clinically sound?", a: "Our AI provides content ideas and drafts based on general mental health principles. It is NOT a substitute for professional clinical advice. You are responsible for reviewing, editing, and ensuring all content aligns with your professional expertise and ethical guidelines." },
        { q: "Can I cancel my subscription anytime?", a: "Yes, you can cancel your subscription at any time from your billing page. You will retain access until the end of your current billing period." },
        { q: "What is a 'generation'?", a: "One 'generation' refers to a single request to the AI to create a piece of content. Your monthly token limit determines how many generations you can perform." }
    ];
    const [open, setOpen] = useState(null);
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
                <Logo />
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

const DashboardLayout = ({ children, user, userData, handleLogout, setDashboardPage, activePage }) => {
    const navItems = [
        { name: 'Generator', page: 'dashboard', icon: <DashboardIcon /> },
        { name: 'Account', page: 'account', icon: <AccountIcon /> },
        { name: 'Billing', page: 'billing', icon: <BillingIcon /> },
    ];
    return (
        <div className="flex h-screen bg-slate-900 text-white">
            <aside className="w-64 bg-slate-800 p-6 flex-shrink-0 flex flex-col">
                <div className="flex items-center space-x-3 mb-10">
                    <Logo />
                    <span className="text-xl font-bold">MHC.ai</span>
                </div>
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
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(userData.tokensUsedThisMonth / SUBSCRIPTION_PLANS[userData.subscriptionPlan]?.tokens) * 100}%` }}></div>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-700 text-gray-300">
                        <LogoutIcon />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
};

const GeneratorPage = ({ userData, db, auth }) => {
    const [prompt, setPrompt] = useState('');
    const [contentType, setContentType] = useState('Instagram Post');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const tokenLimit = useMemo(() => SUBSCRIPTION_PLANS[userData.subscriptionPlan]?.tokens || 0, [userData.subscriptionPlan]);
    const tokensRemaining = useMemo(() => tokenLimit - userData.tokensUsedThisMonth, [tokenLimit, userData.tokensUsedThisMonth]);
    
    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a topic or idea.');
            return;
        }
        if (tokensRemaining <= 0) {
            setError("You've used all your tokens for this month. Please upgrade your plan to continue generating content.");
            return;
        }
        
        setIsLoading(true);
        setError('');
        setGeneratedContent('');
        
        // This is the core prompt sent to the Gemini API.
        // You can customize this to fine-tune the AI's personality and output.
        const systemPrompt = "You are an AI assistant specialized in creating content for mental health professionals. Your tone should be empathetic, supportive, and professional. The content must be general advice and must not be presented as clinical diagnosis or treatment. Start every response with a disclaimer: 'Disclaimer: This content is for informational purposes only and is not a substitute for professional mental health advice.'";
        const userQuery = `Generate a "${contentType}" about the following topic: "${prompt}"`;
        
        try {
            const apiKey = ""; // Canvas provides this
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };
            
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

            if (text) {
                setGeneratedContent(text);
                // After successful generation, update the token count in Firestore.
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    tokensUsedThisMonth: userData.tokensUsedThisMonth + 1
                });
            } else {
                throw new Error("No content was generated. Please try again.");
            }

        } catch (err) {
            console.error("Error generating content:", err);
            setError(`Failed to generate content: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Content Generator</h1>
            <p className="text-gray-400 mb-8">Let's create something amazing for your audience.</p>

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
                <h2 className="text-xl font-bold mb-4">Generated Content:</h2>
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 min-h-[200px] whitespace-pre-wrap text-gray-300">
                    {isLoading ? 'Generating...' : (generatedContent || 'Your AI-generated content will appear here.')}
                </div>
            </div>
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
            {/* Note: Password change requires more complex flow (sendPasswordResetEmail) which is omitted for simplicity */}
            <button className="bg-slate-700 text-white p-3 rounded-lg hover:bg-slate-600 transition-colors">Change Password (coming soon)</button>
        </div>
    </div>
);

const BillingPage = ({ userData, db, auth, setDashboardPage }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handlePlanChange = async (planKey) => {
        setIsLoading(true);
        // In a real app, this is where you would trigger your Stripe Checkout flow.
        // Upon successful payment, Stripe would call a webhook on your server (e.g., a Firebase Function),
        // which would then securely update the user's plan in Firestore.
        // For this demo, we'll directly update the plan in Firestore.
        console.log(`TODO: Integrate Stripe Checkout for plan: ${planKey}`);
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                subscriptionPlan: planKey,
            });
            alert("Plan updated successfully!");
        } catch (error) {
            console.error("Error updating plan:", error);
            alert("Failed to update plan.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Billing</h1>
            <p className="text-gray-400 mb-8">Manage your subscription and payment details.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
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
                            onClick={() => handlePlanChange(key)}
                            disabled={isLoading || userData.subscriptionPlan === key}
                            className="w-full py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            {userData.subscriptionPlan === key ? 'Current Plan' : 'Select Plan'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Main App Component ---

export default function App() {
    const [page, setPage] = useState('home'); // home, login, signup, dashboard
    const [dashboardPage, setDashboardPage] = useState('dashboard'); // dashboard, account, billing
    
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Firebase state
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    
    useEffect(() => {
        try {
            // This is where you will paste your Firebase configuration object.
            // It's checked against 'undefined' to prevent errors in development.
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
            if (Object.keys(firebaseConfig).length === 0) {
                 console.warn("Firebase config not found. App will run in offline mode.");
                 setLoading(false);
                 return;
            }
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribeAuth = onAuthStateChanged(authInstance, async (currentUser) => {
                setLoading(true);
                if (currentUser) {
                    setUser(currentUser);
                    setPage('dashboard');
                } else {
                    setUser(null);
                    setUserData(null);
                    setPage('home');
                }
                setLoading(false);
            });
            return () => unsubscribeAuth();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setLoading(false);
        }
    }, []);
    
    // This effect listens for changes to the user's data in Firestore
    useEffect(() => {
        let unsubscribeDb;
        if (user && db) {
            const userRef = doc(db, 'users', user.uid);
            unsubscribeDb = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    console.log("User document not found, creating one.");
                     // This case might happen if signup succeeded but doc creation failed.
                    const initialUserData = {
                        email: user.email,
                        createdAt: new Date(),
                        subscriptionPlan: 'free',
                        tokensUsedThisMonth: 0
                    };
                    setDoc(userRef, initialUserData);
                    setUserData(initialUserData);
                }
            });
        }
        return () => {
            if (unsubscribeDb) unsubscribeDb();
        };
    }, [user, db]);


    const handleAuth = async (email, password, type) => {
        if (!auth || !db) return "Authentication service not ready.";
        try {
            if (type === 'signup') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const newUser = userCredential.user;
                // Create a corresponding user document in Firestore
                const userRef = doc(db, 'users', newUser.uid);
                await setDoc(userRef, {
                    email: newUser.email,
                    createdAt: new Date(),
                    subscriptionPlan: 'free',
                    tokensUsedThisMonth: 0
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            // onAuthStateChanged will handle navigation
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

    // Main Page Router
    const renderPage = () => {
        if (page === 'dashboard' && user && userData) {
            const dashboardContent = () => {
                switch (dashboardPage) {
                    case 'account': return <AccountPage user={user} />;
                    case 'billing': return <BillingPage userData={userData} db={db} auth={auth} setDashboardPage={setDashboardPage} />;
                    case 'dashboard':
                    default:
                        return <GeneratorPage userData={userData} db={db} auth={auth} />;
                }
            };
            return (
                <DashboardLayout 
                    user={user} 
                    userData={userData}
                    handleLogout={handleLogout} 
                    setDashboardPage={setDashboardPage}
                    activePage={dashboardPage}
                >
                    {dashboardContent()}
                </DashboardLayout>
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
