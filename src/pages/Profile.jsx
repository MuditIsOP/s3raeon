import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { loadProfile, saveProfile, uploadProfilePhoto, getInitials } from '../profile';
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [message, setMessage] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await loadProfile();
            setProfile(data);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveProfile(profile);
            setMessage({ type: 'success', text: 'Profile updated' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
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
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span> : 'Save Changes'}
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

export default Profile;
