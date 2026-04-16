import React, { useState } from 'react';
import { storage, db } from '../../lib/firebase';
import { ref, updateMetadata, getMetadata, getDownloadURL, uploadBytes, deleteObject, listAll } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Bug, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function MagicFixButton({ items, activeCompanyId, currentUser }) {
    const [isFixing, setIsFixing] = useState(false);
    const [status, setStatus] = useState('');
    const [stats, setStats] = useState({ scanned: 0, fixed: 0 });

    const runFix = async () => {
        if (!items || items.length === 0 || !activeCompanyId || !currentUser) {
            alert("⚠️ Selecciona un proyecto válido en la barra lateral que contenga elementos de inventario.");
            return;
        }

        if (!confirm(`Esto examinara todas las fotos del proyecto actual y creará nuevas versiones JPEG de aquellas que sean incompatibles (HEIC). ¿Continuar?`)) return;

        setIsFixing(true);
        setStatus('Iniciando inspección profunda...');
        setStats({ scanned: 0, fixed: 0 });

        try {
            // Helper to check magic bytes
            const isBlobHeic = async (blob) => {
                try {
                    const buffer = await blob.slice(0, 12).arrayBuffer();
                    const view = new Uint8Array(buffer);
                    if (view[4] === 102 && view[5] === 116 && view[6] === 121 && view[7] === 112) { // 'ftyp'
                        const brand = String.fromCharCode(view[8], view[9], view[10], view[11]);
                        if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
                            return true;
                        }
                    }
                    return false;
                } catch (e) { return false; }
            };

            // We must update the full array of checklists
            const updatedChecklists = JSON.parse(JSON.stringify(items)); // Deep copy 

            let madeGlobalChanges = false;

            for (let c = 0; c < updatedChecklists.length; c++) {
                const checklist = updatedChecklists[c];
                if (!checklist.photos || !Array.isArray(checklist.photos)) continue;

                let madeChecklistChanges = false;

                for (let p = 0; p < checklist.photos.length; p++) {
                    const url = checklist.photos[p];
                    if (!url || typeof url !== 'string' || url.startsWith('PENDING_OFFLINE|')) continue;

                    setStatus(`Evaluando ${checklist.name} (Foto ${p + 1})...`);
                    setStats(s => ({ ...s, scanned: s.scanned + 1 }));

                    try {
                        const itemRef = ref(storage, url);
                        let meta = null;
                        try {
                            meta = await getMetadata(itemRef);
                        } catch (metaErr) {
                            if (metaErr.code === 'storage/object-not-found') {
                                setStatus(`⚠️ Archivo faltante: ${checklist.name} (Foto ${p + 1}). Intentando recuperar variante convertida...`);
                                const dirRef = ref(storage, `evidence/${checklist.location}/${checklist.id}`);
                                const dirList = await listAll(dirRef);
                                const recoveredFileRef = dirList.items.find(i => i.name.startsWith(`${p}_`) && i.name.endsWith('_fixed.jpg'));

                                if (recoveredFileRef) {
                                    const recoveredUrl = await getDownloadURL(recoveredFileRef);
                                    setStatus(`¡URL Recuperada con éxito! Reconectando...`);
                                    checklist.photos[p] = recoveredUrl;
                                    madeChecklistChanges = true;
                                    madeGlobalChanges = true;
                                    setStats(s => ({ ...s, fixed: s.fixed + 1 }));
                                    continue; // Skip the rest of the conversion logic since we recovered it
                                }
                            }
                            throw metaErr; // If not a recovery scenario, throw
                        }

                        // Fetch the file to check its TRUE identity
                        const response = await fetch(url);
                        const rawBlob = await response.blob();
                        const isActuallyHeic = await isBlobHeic(rawBlob);

                        if (isActuallyHeic || meta.contentType === 'application/octet-stream') {
                            setStatus(`Reparando: ${checklist.name} (Foto ${p + 1}) - Extrayendo HEIC...`);

                            if (isActuallyHeic) {
                                let finalBlob = rawBlob;
                                const heic2any = (await import('heic2any')).default;
                                try {
                                    setStatus(`Convirtiendo motor gráfico...`);
                                    const convertedBlob = await heic2any({
                                        blob: rawBlob,
                                        toType: 'image/jpeg',
                                        quality: 0.8
                                    });
                                    finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                                } catch (convertErr) {
                                    console.warn("heic2any falló, saltando foto", convertErr);
                                    continue;
                                }

                                // We have a converted blob! 
                                // Upload it as a NEW FILE to prevent browser caching from persisting the broken image
                                const newPath = `evidence/${checklist.location}/${checklist.id}/${p}_${Date.now()}_fixed.jpg`;
                                const newRef = ref(storage, newPath);

                                setStatus(`Guardando versión JPEG...`);
                                await uploadBytes(newRef, finalBlob, { contentType: 'image/jpeg' });
                                const newUrl = await getDownloadURL(newRef);

                                // Update the checklist photos array with the new URL
                                checklist.photos[p] = newUrl;
                                madeChecklistChanges = true;
                                madeGlobalChanges = true;
                                setStats(s => ({ ...s, fixed: s.fixed + 1 }));

                                // Attempt to delete the old corrupted HEIC file to save space
                                try {
                                    await deleteObject(itemRef);
                                } catch (delErr) { console.warn("No se pudo borrar el archivo original viejo", delErr); }
                            } else {
                                // It wasn't HEIC, just a JPEG that was uploaded as octet-stream. Fix the metadata.
                                await updateMetadata(itemRef, { contentType: 'image/jpeg' });
                                setStats(s => ({ ...s, fixed: s.fixed + 1 }));
                            }

                        } else if (meta.contentType !== 'image/jpeg' && meta.contentType !== 'image/png') {
                            // It's a real JPEG/PNG but bad metadata
                            await updateMetadata(itemRef, { contentType: 'image/jpeg' });
                            setStats(s => ({ ...s, fixed: s.fixed + 1 }));
                        }

                    } catch (err) {
                        console.error("Error analizning URL", url, err);
                    }
                } // End photos loop
            } // End checklists loop

            if (madeGlobalChanges) {
                setStatus('Aplicando cambios a la Base de Datos...');
                const companyRef = doc(db, 'users', currentUser.uid, 'companies', activeCompanyId);
                await updateDoc(companyRef, { checklists: updatedChecklists });
            }

            setStatus('¡Escaneo completo!');
            alert(`Operación terminada. Se sanaron ${stats.fixed} imágenes permanentemente. Por favor, recarga y verifica la tabla.`);
        } catch (error) {
            console.error(error);
            setStatus('Error: ' + error.message);
            alert("Ocurrió un error: " + error.message);
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div className="mt-4 p-4 border border-dashed border-purple-300 bg-purple-50 rounded-lg">
            <h4 className="text-xs font-bold text-purple-800 uppercase mb-2 flex items-center gap-1"><Bug size={14} /> Botón Mágico (Admin)</h4>
            <p className="text-[10px] text-purple-600 mb-2">Repara las evidencias rotas por culpa de la subida offline de Android.</p>

            <Button
                onClick={runFix}
                disabled={isFixing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs flex justify-center mb-2"
            >
                {isFixing ? <><Loader2 size={14} className="animate-spin mr-1" /> Analizando base de datos...</> : 'Ejecutar Solución Inmediata'}
            </Button>

            {status && (
                <div className="bg-white/60 p-2 rounded text-center">
                    <p className="text-[10px] text-purple-700 font-bold mb-1 truncate">{status}</p>
                    <div className="flex justify-between text-[9px] text-purple-600 font-medium px-1">
                        <span>Revisadas: {stats.scanned}</span>
                        <span>Corregidas: {stats.fixed}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
