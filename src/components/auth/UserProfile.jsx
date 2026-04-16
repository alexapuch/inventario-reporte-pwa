import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, Camera, Loader2, Mail, Shield } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../lib/compressImage';

export function UserProfile({ isOpen, onClose }) {
    const { currentUser, updateUserProfile } = useAuth();
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleUpdate = async () => {
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await updateUserProfile({ displayName });
            setMessage('Perfil actualizado correctamente.');
        } catch (err) {
            setError('Error al actualizar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError('');

        try {
            // Compress profile photo (smaller max dimension for avatars)
            let compressedFile = file;
            try {
                compressedFile = await compressImage(file, { maxDimension: 512, quality: 0.7 });
            } catch (err) {
                console.warn('[UserProfile] Compression failed, using original', err);
            }
            const storageRef = ref(storage, `users/${currentUser.uid}/profile_${Date.now()}`);
            await uploadBytes(storageRef, compressedFile);
            const photoURL = await getDownloadURL(storageRef);
            await updateUserProfile({ photoURL });
            setMessage('Foto actualizada.');
        } catch (err) {
            setError('Error al subir foto: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Mi Perfil"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                    <Button onClick={handleUpdate} disabled={loading} className="bg-primary text-white">
                        {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                        Guardar Cambios
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col items-center space-y-6">
                {/* Photo Section */}
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 bg-slate-200">
                        {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <User size={40} />
                            </div>
                        )}
                    </div>
                    <button
                        className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                    >
                        <Camera size={16} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                    />
                </div>

                {/* Info Section */}
                <div className="w-full space-y-4">
                    {message && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg text-center font-medium">{message}</div>}
                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">{error}</div>}

                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Nombre para mostrar</label>
                        <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full"
                            placeholder="Tu nombre"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Correo Electrónico</label>
                        <div className="flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 text-sm cursor-not-allowed">
                            <Mail size={16} className="mr-2" />
                            {currentUser.email}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
                            <Shield size={12} />
                            <span>Cuenta segura de StockMaster</span>
                            {currentUser.emailVerified && <span className="text-emerald-500 font-bold ml-1">Verificada</span>}
                        </div>
                        <div className="text-center text-[10px] text-slate-300 mt-1">UID: {currentUser.uid}</div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
