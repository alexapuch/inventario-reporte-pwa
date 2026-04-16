import { useState, useEffect } from 'react';

/**
 * Hook personalizado para persistencia en localStorage
 * @param {string} key - Clave para el almacenamiento
 * @param {any} initialValue - Valor inicial si no existe data
 * @returns {[any, Function]} - [storedValue, setValue]
 */
export function useLocalStorage(key, initialValue) {
    // Estado para almacenar el valor
    // Pasa una función a useState para que la lógica solo se ejecute una vez
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Función para actualizar el valor en estado y localStorage
    const setValue = (value) => {
        try {
            // Permitir que el valor sea una función (como useState)
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;

            setStoredValue(valueToStore);

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}
