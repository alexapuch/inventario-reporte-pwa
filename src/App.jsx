import { useState } from 'react';
import { Plus, ArrowLeft, LogOut, User, Grid, Folder, Check } from 'lucide-react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import { LoginView } from './components/auth/LoginView';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Modal } from './components/ui/Modal';
import { CompanyList } from './components/companies/CompanyList';
import { ChecklistView } from './components/checklist/ChecklistView';
import { PhotoReportView } from './components/report/PhotoReportView';
import { SummaryTableView } from './components/report/SummaryTableView';
import { Layout } from './components/layout/Layout';
import { UserProfile } from './components/auth/UserProfile';
import './index.css';

import { TrashView } from './components/companies/TrashView';
import { BlueprintEditor } from './components/sketch/BlueprintEditor';

// ...

function AuthenticatedApp() {
  const { logout, currentUser } = useAuth();
  const {
    companies,
    trash,
    addCompany,
    deleteCompany,
    updateCompany,
    moveCompany,
    restoreCompany,
    permanentlyDeleteCompany,
    loading
  } = useFirestore();

  // State
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const [itemToMove, setItemToMove] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newProjectType, setNewProjectType] = useState('bank'); // 'bank' | 'custom' | 'folder'
  const [viewMode, setViewMode] = useState('list'); // 'list', 'detail', 'report', 'summary'

  // Computed
  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const currentFolder = companies.find(c => c.id === currentFolderId);
  const view = activeCompanyId ? (['report', 'summary', 'sketch'].includes(viewMode) ? viewMode : 'detail') : 'list';

  // Handlers
  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      await addCompany(newCompanyName.trim(), newProjectType, currentFolderId);
      setNewCompanyName('');
      setNewProjectType('bank'); // Reset to default AVOID reset to folder if that was last used? Nah 'bank' is safe.
      setIsCreateModalOpen(false);
    } catch (error) {
      alert("Error al crear: " + error.message);
    }
  };

  const handleDeleteCompany = async (id) => {
    //    if (window.confirm("¿Seguro que quieres eliminar esta carpeta?")) {
    await deleteCompany(id);
    if (activeCompanyId === id) setActiveCompanyId(null);
    //    }
  };

  const handleRenameCompany = async (id, newName) => {
    try {
      await updateCompany({ id, name: newName });
    } catch (error) {
      alert("Error al renombrar: " + error.message);
    }
  };

  const initMove = (item) => {
    setItemToMove(item);
    setIsMoveModalOpen(true);
  };

  const handleMove = async (targetFolderId) => {
    if (!itemToMove) return;
    try {
      await moveCompany(itemToMove.id, targetFolderId);
      setIsMoveModalOpen(false);
      setItemToMove(null);
    } catch (error) {
      alert("Error al mover: " + error.message);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Cargando datos...</div>;

  return (
    <Layout
      companies={companies}
      onNavigateFolder={setCurrentFolderId}
      onSelectProject={setActiveCompanyId}
      currentFolderId={currentFolderId} // Highlight active item?
      activeCompanyId={activeCompanyId}
    >
      <div className="w-full h-full px-6 py-8">
        {/* Header Content */}
        {view === 'list' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-end gap-2">
                {currentFolderId && (
                  <button
                    onClick={() => setCurrentFolderId(currentFolder?.parentId || null)}
                    className="mb-1 p-1 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <ArrowLeft size={24} className="text-slate-500" />
                  </button>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {currentFolderId === 'trash'
                    ? "Papelera"
                    : (currentFolder ? currentFolder.name : "Mis Proyectos")}
                </h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {currentFolderId === 'trash'
                  ? "Gestiona los elementos eliminados."
                  : (currentFolder
                    ? "Gestiona los elementos de esta carpeta."
                    : "Selecciona una carpeta o crea un nuevo proyecto para comenzar.")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="w-full h-full p-1.5 text-slate-400" />
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:block max-w-[100px] truncate">
                  {currentUser?.displayName || 'Usuario'}
                </span>
              </button>

              {currentFolderId && currentFolderId !== 'trash' && (
                <button
                  onClick={async () => {
                    const isFinalized = currentFolder?.status === 'FINALIZADO';
                    if (confirm(isFinalized ? "¿Reabrir esta carpeta?" : "¿Finalizar esta carpeta? Se marcará como completada.")) {
                      await updateCompany({ id: currentFolderId, status: isFinalized ? 'ACTIVE' : 'FINALIZADO' });
                    }
                  }}
                  className={`inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-all shadow-lg ${currentFolder?.status === 'FINALIZADO'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <Check className="mr-2" size={20} />
                  <span className="hidden sm:inline">{currentFolder?.status === 'FINALIZADO' ? 'Finalizada' : 'Finalizar Carpeta'}</span>
                </button>
              )}

              {currentFolderId !== 'trash' && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-primary/20"
                >
                  <Plus className="mr-2" size={20} />
                  <span className="hidden sm:inline">Nuevo</span>
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'detail' && (
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveCompanyId(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-slate-600 dark:text-slate-400"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline font-medium">Volver</span>
              </button>
              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2"></div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de Inventario: <span className="text-primary font-bold">{activeCompany?.name}</span></h1>
            </div>

            <div className="flex items-center gap-3">
              {activeCompany && (
                <button
                  onClick={async () => {
                    const isFinalized = activeCompany?.status === 'FINALIZADO';
                    if (confirm(isFinalized ? "¿Reabrir este proyecto?" : "¿Finalizar este proyecto? Se marcará como completado.")) {
                      await updateCompany({ id: activeCompanyId, status: isFinalized ? 'ACTIVE' : 'FINALIZADO' });
                    }
                  }}
                  className={`inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-all shadow-lg ${activeCompany?.status === 'FINALIZADO'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <Check className="mr-2" size={20} />
                  <span className="hidden sm:inline">{activeCompany?.status === 'FINALIZADO' ? 'Finalizado' : 'Finalizar Proyecto'}</span>
                </button>
              )}

              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="w-full h-full p-1.5 text-slate-400" />
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:block max-w-[100px] truncate">
                  {currentUser?.displayName || 'Usuario'}
                </span>
              </button>
            </div>
          </header>
        )}

        {/* Content */}
        <div className="animate-fade-in">
          {view === 'list' && (
            currentFolderId === 'trash' ? (
              <TrashView
                trashItems={trash}
                onRestore={restoreCompany}
                onPermanentDelete={permanentlyDeleteCompany}
              />
            ) : (
              <CompanyList
                companies={companies}
                onSelect={(company) => setActiveCompanyId(company.id)}
                onDelete={handleDeleteCompany}
                onRename={handleRenameCompany}
                onOpenCreate={() => setIsCreateModalOpen(true)}
                currentFolderId={currentFolderId}
                onNavigate={setCurrentFolderId}
                onMove={initMove}
              />
            )
          )}

          {view === 'detail' && activeCompany && (
            <ChecklistView
              company={activeCompany}
              onUpdateCompany={updateCompany}
              onViewReport={() => setViewMode('report')}
              onViewSummary={() => setViewMode('summary')}
              onViewSketch={() => setViewMode('sketch')}
            />
          )}

          {view === 'report' && activeCompany && (
            <PhotoReportView
              company={activeCompany}
              items={activeCompany.checklists || []}
              onBack={() => setViewMode('detail')}
              onUpdateCompany={updateCompany}
            />
          )}

          {view === 'summary' && activeCompany && (
            <SummaryTableView
              company={activeCompany}
              items={activeCompany.checklists || []}
              onBack={() => setViewMode('detail')}
            />
          )}

          {view === 'sketch' && activeCompany && (
            <BlueprintEditor
              company={activeCompany}
              onBack={() => setViewMode('detail')}
            />
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={currentFolderId ? `Nuevo elemento en ${currentFolder?.name}` : "Nuevo Proyecto / Carpeta"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCompany} disabled={!newCompanyName.trim()} className="bg-primary text-white hover:bg-blue-700">Crear</Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {/* Template Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setNewProjectType('bank')}
                className={`p-3 rounded-xl border-2 text-left transition-all relative ${newProjectType === 'bank'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${newProjectType === 'bank' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Grid size={18} />
                  </div>
                  {newProjectType === 'bank' && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Banco</div>
                <div className="text-[10px] text-slate-500 mt-1">Predefinido</div>
              </button>

              <button
                type="button"
                onClick={() => setNewProjectType('custom')}
                className={`p-3 rounded-xl border-2 text-left transition-all relative ${newProjectType === 'custom'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${newProjectType === 'custom' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Plus size={18} />
                  </div>
                  {newProjectType === 'custom' && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Custom</div>
                <div className="text-[10px] text-slate-500 mt-1">Vacío</div>
              </button>

              <button
                type="button"
                onClick={() => setNewProjectType('folder')}
                className={`p-3 rounded-xl border-2 text-left transition-all relative ${newProjectType === 'folder'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${newProjectType === 'folder' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Folder size={18} />
                  </div>
                  {newProjectType === 'folder' && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Carpeta</div>
                <div className="text-[10px] text-slate-500 mt-1">Agrupador</div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Nombre
            </label>
            <Input
              placeholder={newProjectType === 'folder' ? "Nombre de la carpeta" : "Nombre del proyecto"}
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCompany()}
              className="w-full pl-3 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>
      </Modal>

      {/* Move Modal */}
      <Modal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title={`Mover "${itemToMove?.name}" a...`}
        footer={
          <Button variant="ghost" onClick={() => setIsMoveModalOpen(false)}>Cancelar</Button>
        }
      >
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          <button
            onClick={() => handleMove(null)} // Move to Root
            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left ${!itemToMove?.parentId ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
          >
            <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-500">
              <Grid size={20} />
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Inicio (Raíz)</div>
              <div className="text-xs text-slate-500">Mover al nivel principal</div>
            </div>
            {!itemToMove?.parentId && <div className="ml-auto text-xs font-semibold text-primary">Actual</div>}
          </button>

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-2"></div>

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Carpetas Disponibles</div>

          {companies.filter(c => c.type === 'folder' && c.id !== itemToMove?.id).map(folder => (
            <button
              key={folder.id}
              onClick={() => handleMove(folder.id)}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left ${itemToMove?.parentId === folder.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
            >
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                <Folder size={20} />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{folder.name}</div>
              </div>
              {itemToMove?.parentId === folder.id && <div className="ml-auto text-xs font-semibold text-primary">Actual</div>}
            </button>
          ))}

          {companies.filter(c => c.type === 'folder' && c.id !== itemToMove?.id).length === 0 && (
            <div className="text-center p-4 text-slate-500 text-sm italic">
              No hay otras carpetas disponibles.
            </div>
          )}
        </div>
      </Modal>

      <UserProfile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

function AuthWrapper() {
  const { currentUser } = useAuth();
  return currentUser ? <AuthenticatedApp /> : <LoginView />;
}

export default App;
