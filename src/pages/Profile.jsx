import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { loadProfile, saveProfile, uploadProfilePhoto, getInitials } from '../profile';
import { loadConfig, saveConfig } from '../storj'; // Import config functions
import { DateTime } from 'luxon';
import Header from '../components/Header';

function Profile() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [profile, setProfile] = useState({
        firstName: 'Arshita',
        lastName: '',
        email: '',
        mobile: '',
        dob: '',
        profilePhotoUrl: null
    });
    const [originalProfile, setOriginalProfile] = useState(null); // Track original for change detection
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [message, setMessage] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Security State
    const [securityConfig, setSecurityConfig] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);

    // Check if there are unsaved changes (normalize undefined to empty string)
    const normalize = (val) => val || '';
    const hasChanges = originalProfile && (
        normalize(profile.firstName) !== normalize(originalProfile.firstName) ||
        normalize(profile.lastName) !== normalize(originalProfile.lastName) ||
        normalize(profile.email) !== normalize(originalProfile.email) ||
        normalize(profile.mobile) !== normalize(originalProfile.mobile) ||
        normalize(profile.dob) !== normalize(originalProfile.dob)
    );

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileData, configData] = await Promise.all([
                loadProfile(),
                loadConfig()
            ]);
            setProfile(profileData);
            setOriginalProfile({ ...profileData }); // Clone for comparison
            setSecurityConfig(configData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        try {
            // Save to server
            await saveProfile(profile);

            // Verify save succeeded by reloading from server
            const serverProfile = await loadProfile();
            if (serverProfile.firstName !== profile.firstName ||
                serverProfile.lastName !== profile.lastName ||
                serverProfile.email !== profile.email ||
                serverProfile.mobile !== profile.mobile ||
                serverProfile.dob !== profile.dob) {
                throw new Error('Server profile does not match - save may have failed');
            }

            // Only show success after server confirms
            setOriginalProfile({ ...profile });
            setMessage({ type: 'success', text: 'Profile updated' });
            setTimeout(() => {
                setMessage(null);
                navigate(-1); // Go back to previous page
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            setMessage({ type: 'error', text: 'Failed to save' });
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const url = await uploadProfilePhoto(file);
            const updatedProfile = { ...profile, profilePhotoUrl: url };
            setProfile(updatedProfile);
            await saveProfile(updatedProfile);
            setMessage({ type: 'success', text: 'Photo updated' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Upload failed' });
        } finally {
            setUploadingPhoto(false);
        }
    };

    const refreshConfig = async () => {
        const config = await loadConfig();
        setSecurityConfig(config);
    };

    if (loading) return <div className="page flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    const formattedDob = profile.dob ? DateTime.fromISO(profile.dob).toFormat('MMMM d, yyyy') : '';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header title="Profile" showProfile={false} onClose={() => navigate('/')} />

            <div className="flex flex-col items-center mb-8">
                <div
                    className="relative w-24 h-24 rounded-full mb-4 cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {profile.profilePhotoUrl ? (
                        <img
                            src={profile.profilePhotoUrl}
                            alt="Profile"
                            className="w-full h-full object-cover rounded-full border-2 border-[var(--border)] group-hover:border-[var(--primary)] transition-colors"
                        />
                    ) : (
                        <div className="w-full h-full rounded-full flex items-center justify-center text-3xl font-bold bg-[var(--bg-elevated)] text-[var(--text-muted)] border-2 border-[var(--border)] group-hover:border-[var(--primary)] transition-colors">
                            {getInitials(profile.firstName)}
                        </div>
                    )}

                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>

                    {uploadingPhoto && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoSelect} />

                <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{profile.firstName} {profile.lastName}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{profile.email || 'No email set'}</p>
            </div>

            <div className="space-y-4">
                <div className="card">
                    <h3 className="card-title mb-4">Personal Details</h3>

                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-label mb-1 block">First Name</label>
                                <input
                                    type="text"
                                    value={profile.firstName}
                                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="First Name"
                                />
                            </div>
                            <div>
                                <label className="text-label mb-1 block">Last Name</label>
                                <input
                                    type="text"
                                    value={profile.lastName}
                                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="Last Name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-label mb-1 block">Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                className="input-field w-full"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="text-label mb-1 block">Mobile Number</label>
                            <input
                                type="tel"
                                value={profile.mobile}
                                onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                                className="input-field w-full"
                                placeholder="+1 234 567 8900"
                            />
                        </div>

                        <div>
                            <label className="text-label mb-1 block">Date of Birth</label>
                            <div
                                onClick={() => setShowDatePicker(true)}
                                className="input-field w-full flex items-center justify-between cursor-pointer"
                                style={{ minHeight: '3rem' }}
                            >
                                <span style={{ color: formattedDob ? 'var(--text)' : 'var(--text-muted)' }}>
                                    {formattedDob || 'Select Date of Birth'}
                                </span>
                                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="card">
                    <h3 className="card-title mb-4">Security</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg)] transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <span className="font-medium" style={{ color: 'var(--text)' }}>Change Password</span>
                            </div>
                            <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>

                        <button
                            onClick={() => setShowSecurityModal(true)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg)] transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <span className="font-medium" style={{ color: 'var(--text)' }}>Change Security Question</span>
                            </div>
                            <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-6">
                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`text-center py-2 rounded-lg text-sm font-medium ${message.type === 'success' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}
                            >
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className={`w-full py-3 rounded-xl font-semibold transition-all ${hasChanges ? 'btn-primary' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'}`}
                    >
                        {saving ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span> : 'Save Changes'}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showDatePicker && (
                    <DatePickerModal
                        initialDate={profile.dob}
                        onSelect={(date) => { setProfile({ ...profile, dob: date }); setShowDatePicker(false); }}
                        onClose={() => setShowDatePicker(false)}
                    />
                )}
                {showPasswordModal && (
                    <ChangePasswordModal
                        config={securityConfig}
                        onClose={() => setShowPasswordModal(false)}
                        onSuccess={() => {
                            refreshConfig();
                            setShowPasswordModal(false);
                            setMessage({ type: 'success', text: 'Password changed successfully' });
                            setTimeout(() => setMessage(null), 3000);
                        }}
                    />
                )}
                {showSecurityModal && (
                    <ChangeSecurityModal
                        config={securityConfig}
                        onClose={() => setShowSecurityModal(false)}
                        onSuccess={() => {
                            refreshConfig();
                            setShowSecurityModal(false);
                            setMessage({ type: 'success', text: 'Security question updated' });
                            setTimeout(() => setMessage(null), 3000);
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function DatePickerModal({ initialDate, onSelect, onClose }) {
    const today = DateTime.now();
    const [selectedDate, setSelectedDate] = useState(initialDate ? DateTime.fromISO(initialDate) : today.minus({ years: 20 })); // Default 20 years ago
    const [view, setView] = useState('day'); // 'day', 'month', 'year'

    const years = Array.from({ length: 100 }, (_, i) => today.year - i); // Last 100 years
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Days grid for current month
    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    const daysInMonth = endOfMonth.day;
    const startWeekday = startOfMonth.weekday % 7; // 0 = Sun, 6 = Sat

    const days = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const handleDaySelect = (day) => {
        if (!day) return;
        const newDate = selectedDate.set({ day });
        onSelect(newDate.toISODate());
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={onClose} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bottom-sheet h-auto max-h-[80vh]">
                <div className="sheet-handle" />

                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg hover:text-[var(--primary)] cursor-pointer transition-colors" onClick={() => setView(view === 'year' ? 'day' : 'year')} style={{ color: 'var(--text)' }}>
                        {selectedDate.toFormat('MMMM yyyy')}
                        <svg className={`inline w-4 h-4 ml-1 transition-transform ${view === 'year' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={() => setSelectedDate(selectedDate.minus({ months: 1 }))} className="p-2 rounded-full hover:bg-[var(--bg-elevated)]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                        <button onClick={() => setSelectedDate(selectedDate.plus({ months: 1 }))} className="p-2 rounded-full hover:bg-[var(--bg-elevated)]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                    </div>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
                    {view === 'year' ? (
                        <div className="grid grid-cols-4 gap-4 p-2">
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => { setSelectedDate(selectedDate.set({ year })); setView('day'); }}
                                    className={`py-2 rounded-lg text-sm font-medium ${selectedDate.year === year ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg-elevated)]'}`}
                                    style={{ color: selectedDate.year === year ? 'white' : 'var(--text)' }}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="grid grid-cols-7 mb-2 text-center">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day, i) => (
                                    <div key={i} className="aspect-square flex items-center justify-center">
                                        {day && (
                                            <button
                                                onClick={() => handleDaySelect(day)}
                                                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${day === selectedDate.day ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-[var(--bg-elevated)]'}`}
                                                style={{ color: day === selectedDate.day ? 'white' : 'var(--text)' }}
                                            >
                                                {day}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="w-full mt-6 py-3 rounded-xl bg-[var(--bg-elevated)] text-[var(--text)] font-semibold">
                    Cancel
                </button>
            </motion.div>
        </>
    );
}

function ChangePasswordModal({ config, onClose, onSuccess }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required'); return;
        }
        if (currentPassword !== config.password) {
            setError('Incorrect current password'); return;
        }
        if (newPassword.length < 4) {
            setError('New password too short (min 4 chars)'); return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match'); return;
        }

        setSaving(true);
        try {
            const newConfig = { ...config, password: newPassword };
            await saveConfig(newConfig);
            onSuccess();
        } catch (err) {
            setError('Failed to save');
            setSaving(false);
        }
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={onClose} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bottom-sheet">
                <div className="sheet-handle" />
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text)' }}>Change Password</h3>

                <div className="space-y-4">
                    <div>
                        <label className="text-label mb-1 block">Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input-field w-full"
                            placeholder="Enter current password"
                        />
                    </div>
                    <div>
                        <label className="text-label mb-1 block">
                            New Password <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(at least 4 chars)</span>
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-field w-full"
                            placeholder="Enter new password"
                        />
                    </div>
                    <div>
                        <label className="text-label mb-1 block">Retype Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-field w-full"
                            placeholder="Re-enter new password"
                        />
                    </div>
                </div>

                {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="flex-1 btn-primary">
                        {saving ? 'Saving...' : 'Update'}
                    </button>
                </div>
            </motion.div>
        </>
    );
}

function ChangeSecurityModal({ config, onClose, onSuccess }) {
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleVerify = () => {
        if (currentAnswer.toLowerCase().trim() === config.securityAnswer.toLowerCase().trim()) {
            setIsVerified(true);
            setError('');
        } else {
            setError('Incorrect answer');
        }
    };

    const handleSubmit = async () => {
        if (!newQuestion || !newAnswer) {
            setError('Both fields required'); return;
        }

        setSaving(true);
        try {
            const newConfig = { ...config, securityQuestion: newQuestion, securityAnswer: newAnswer };
            await saveConfig(newConfig);
            onSuccess();
        } catch (err) {
            setError('Failed to save');
            setSaving(false);
        }
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={onClose} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bottom-sheet">
                <div className="sheet-handle" />
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text)' }}>Change Security Question</h3>

                {!isVerified ? (
                    <div className="space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            To make changes, please answer your current security question:
                        </p>
                        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] text-sm font-medium" style={{ color: 'var(--text)' }}>
                            {config?.securityQuestion}
                        </div>
                        <input
                            type="text"
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            className="input-field w-full"
                            placeholder="Your Answer"
                            autoFocus
                        />
                        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}

                        <div className="flex gap-3 mt-4">
                            <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                            <button onClick={handleVerify} className="flex-1 btn-primary">Verify</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-green-500 mb-2">✓ Verified. Set new question:</p>
                        <div>
                            <label className="text-label mb-1 block">New Question</label>
                            <input
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                className="input-field w-full"
                                placeholder="e.g. Favorite color?"
                            />
                        </div>
                        <div>
                            <label className="text-label mb-1 block">New Answer</label>
                            <input
                                type="text"
                                value={newAnswer}
                                onChange={(e) => setNewAnswer(e.target.value)}
                                className="input-field w-full"
                                placeholder="Answer"
                            />
                        </div>
                        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}

                        <div className="flex gap-3 mt-6">
                            <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving} className="flex-1 btn-primary">
                                {saving ? 'Saving...' : 'Update'}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    );
}

export default Profile;
