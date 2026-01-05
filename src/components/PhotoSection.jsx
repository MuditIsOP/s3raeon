import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiary } from '../App';
import { getTodayIST } from '../utils/timeUtils';
import { uploadPhoto } from '../storj';

const MAX_PHOTOS = 5;

function PhotoSection({ todayEntry }) {
    const { saveEntry } = useDiary();
    const today = getTodayIST();
    const fileInputRef = useRef(null);

    const [photos, setPhotos] = useState(todayEntry?.photos || []);
    const [showUploadSheet, setShowUploadSheet] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => { if (todayEntry?.photos) setPhotos(todayEntry.photos); }, [todayEntry?.photos]);

    const handleFileSelect = (file) => {
        if (!file) return;
        if (photos.length >= MAX_PHOTOS) { alert('Max 5 photos/day'); return; }
        const reader = new FileReader();
        reader.onload = (e) => { setPreviewImage({ file, preview: e.target.result }); };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
            setShowUploadSheet(true);
        }
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => { setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        }
    };

    const confirmUpload = async () => {
        if (!previewImage) return;
        try {
            setUploading(true);
            const downloadUrl = await uploadPhoto(today, previewImage.file);
            const newPhoto = {
                url: downloadUrl,
                timestamp: new Date().toISOString(),
                starred: false,
                size: previewImage.file.size
            };
            const updatedPhotos = [...photos, newPhoto];
            setPhotos(updatedPhotos);
            await saveEntry(today, { photos: updatedPhotos });
            setShowUploadSheet(false);
            setPreviewImage(null);
        } catch (error) {
            console.error('Error:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const closeSheet = () => {
        setShowUploadSheet(false);
        setPreviewImage(null);
    };

    return (
        <section className="card">
            <div className="card-header">
                <h2 className="card-title">Today's Moments</h2>
                <span className="text-label">{photos.length}/{MAX_PHOTOS}</span>
            </div>

            <div className="photo-grid">
                {photos.map((photo) => (
                    <motion.div key={photo.timestamp} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="photo-item" onClick={() => setSelectedPhoto(photo)}>
                        <img src={photo.url} alt="" loading="lazy" />
                        {photo.starred && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', color: '#FBBF24' }}>
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            </div>
                        )}
                    </motion.div>
                ))}
                {photos.length < MAX_PHOTOS && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowUploadSheet(true)}
                        className="photo-add"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                        <span>Add</span>
                    </motion.button>
                )}
            </div>

            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleInputChange} className="hidden" />

            {/* Upload Bottom Sheet via Portal */}
            <UploadSheet
                isOpen={showUploadSheet}
                onClose={closeSheet}
                previewImage={previewImage}
                isDragging={isDragging}
                uploading={uploading}
                fileInputRef={fileInputRef}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                confirmUpload={confirmUpload}
                setPreviewImage={setPreviewImage}
            />

            {/* Full View Modal via Portal */}
            {selectedPhoto && createPortal(
                <AnimatePresence>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[9999]" onClick={() => setSelectedPhoto(null)} />
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                        <img src={selectedPhoto.url} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </section>
    );
}

function UploadSheet({ isOpen, onClose, previewImage, isDragging, uploading, fileInputRef, handleDragOver, handleDragLeave, handleDrop, confirmUpload, setPreviewImage }) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop z-[200]" onClick={onClose} />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="bottom-sheet z-[201]">
                        <div className="sheet-handle" />
                        <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text)' }}>Add Photo</h3>

                        {!previewImage ? (
                            <div
                                className="relative rounded-xl p-8 text-center transition-all cursor-pointer"
                                style={{
                                    background: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-elevated)',
                                    border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}>
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>
                                    {isDragging ? 'Drop your photo here' : 'Tap to select or drag photo'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Supports JPG, PNG, HEIC</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                                    <img src={previewImage.preview} alt="" className="w-full aspect-square object-cover" />
                                    <button
                                        onClick={() => setPreviewImage(null)}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ background: 'rgba(0,0,0,0.6)' }}
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex-1">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Change
                                    </button>
                                    <button onClick={confirmUpload} disabled={uploading} className="btn-primary flex-1">
                                        {uploading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Uploading...
                                            </span>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                Upload
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button onClick={onClose} className="w-full mt-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                            Cancel
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default PhotoSection;
