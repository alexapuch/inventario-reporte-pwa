# Sistema de Inventario y Reportes PWA

Aplicación web profesional para la gestión de inventarios, inspecciones y generación de reportes fotográficos capturados en sitio.

## ✨ Funcionalidades Principales

- **Gestión de Inventario:** Control detallado por zonas y categorías.
- **Reportes Fotográficos:** Generación automática de PDFs profesionales con fotos de evidencia, fachadas y logotipos corporativos.
- **Modo Offline:** Diseñada para funcionar en campo sin conexión a internet mediante tecnología PWA e IndexedDB.
- **Sincronización con Firebase:** Respaldo automático en la nube cuando hay conexión.

## 🚀 Mejoras Recientes

### Subida de Fotos con Drag & Drop
Ahora es mucho más fácil gestionar las imágenes desde una computadora:
- **Evidencias:** Arrastra múltiples archivos directamente al modal de evidencias.
- **Fachada y Logo:** Cambia las fotos principales del reporte simplemente soltando el archivo sobre el área correspondiente.

## 🛠️ Tecnologías

- **Core:** React + Vite
- **Estilos:** Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage, Functions)
- **Persistencia Local:** `idb` (IndexedDB)
