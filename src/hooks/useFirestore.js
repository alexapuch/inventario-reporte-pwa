import { useState, useEffect } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useFirestore() {
    const { currentUser } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Subscribe to Companies
    useEffect(() => {
        if (!currentUser) {
            setCompanies([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'users', currentUser.uid, 'companies'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCompanies(data);
            setLoading(false);
        }, (err) => {
            console.error("Firestore Error:", err);
            setError(err.message);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    // Actions
    const addCompany = async (name, type = 'bank', parentId = null) => {
        if (!currentUser) return;
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'companies'), {
                name,
                type,
                parentId,
                customZones: [],
                createdAt: serverTimestamp(),
                checklists: [],
                deletedAt: null // Initialize as not deleted
            });
        } catch (err) {
            console.error("Error adding company:", err);
            throw err;
        }
    };

    const moveCompany = async (id, parentId) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'companies', id), {
                parentId: parentId
            });
        } catch (err) {
            console.error("Error moving company:", err);
            throw err;
        }
    };

    // Soft delete
    const deleteCompany = async (id) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'companies', id), {
                deletedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Error deleting company:", err);
            throw err;
        }
    };

    const restoreCompany = async (id) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'companies', id), {
                deletedAt: null
            });
        } catch (err) {
            console.error("Error restoring company:", err);
            throw err;
        }
    };

    const permanentlyDeleteCompany = async (id) => {
        if (!currentUser) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'companies', id));
        } catch (err) {
            console.error("Error permanently deleting company:", err);
            throw err;
        }
    };

    const updateCompany = async (company) => {
        if (!currentUser) return;
        try {
            const { id, ...data } = company;
            await updateDoc(doc(db, 'users', currentUser.uid, 'companies', id), data);
        } catch (err) {
            console.error("Error updating company:", err);
            throw err;
        }
    };

    return {
        companies: companies.filter(c => !c.deletedAt), // Return only active companies by default
        trash: companies.filter(c => c.deletedAt), // Return deleted companies
        loading,
        error,
        addCompany,
        deleteCompany,
        updateCompany,
        moveCompany,
        restoreCompany,
        permanentlyDeleteCompany
    };
}
