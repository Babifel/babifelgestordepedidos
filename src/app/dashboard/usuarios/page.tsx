"use client";

import { useState, useEffect, useCallback } from "react";
import { useRequireRole, useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { UserWithoutPassword } from "@/models/User";
import Modal from "@/components/Modal";
import { MdDashboard, MdManageAccounts } from "react-icons/md";
import { IoIosWarning } from "react-icons/io";

interface ModalState {
  isOpen: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

interface DeleteModalState {
  isOpen: boolean;
  userId: string;
  userName: string;
}

interface FormData {
  nombre: string;
  email: string;
  password: string;
  role: "vendedora" | "administradora";
}

export default function UsuariosPage() {
  const { user } = useRequireRole("administradora");
  const { logout } = useAuth();

  const [usuarios, setUsuarios] = useState<UserWithoutPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    email: "",
    password: "",
    role: "vendedora",
  });
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    userId: "",
    userName: "",
  });

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await fetch("/api/usuarios", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        setUsuarios(data.usuarios);
      } else {
        showModal("error", "Error", data.error || "Error al cargar usuarios");
      }
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      showModal("error", "Error", "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  const showModal = (
    type: ModalState["type"],
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showModal("success", "Éxito", "Usuario creado exitosamente");
        setFormData({ nombre: "", email: "", password: "", role: "vendedora" });
        setShowCreateForm(false);
        fetchUsuarios();
      } else {
        showModal("error", "Error", data.error || "Error al crear usuario");
      }
    } catch (error) {
      console.error("Error al crear usuario:", error);
      showModal("error", "Error", "Error al crear usuario");
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setDeleteModal({
      isOpen: true,
      userId,
      userName,
    });
  };

  const confirmDeleteUser = async () => {
    try {
      const response = await fetch(`/api/usuarios?id=${deleteModal.userId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        showModal("success", "Éxito", "Usuario eliminado exitosamente");
        fetchUsuarios();
      } else {
        showModal("error", "Error", data.error || "Error al eliminar usuario");
      }
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      showModal("error", "Error", "Error al eliminar usuario");
    } finally {
      setDeleteModal({ isOpen: false, userId: "", userName: "" });
    }
  };

  const cancelDeleteUser = () => {
    setDeleteModal({ isOpen: false, userId: "", userName: "" });
  };

  useEffect(() => {
    if (user?.role === "administradora") {
      fetchUsuarios();
    } else {
      setLoading(false);
    }
  }, [user, fetchUsuarios]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-lg text-white">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-gray-900/95 backdrop-blur-sm border border-purple-500/20 text-white hover:bg-gray-800/95 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-gray-900/95 backdrop-blur-sm border-r border-purple-500/20 transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-center h-16 border-b border-purple-500/20">
          <div className="flex items-center space-x-2">
            <div className="py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Babifel CRM</span>
            </div>
          </div>
        </div>
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <MdDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <div className="bg-purple-600/20 text-purple-300 px-4 py-3 rounded-lg border border-purple-500/30">
              <div className="flex items-center space-x-3">
                <MdManageAccounts className="w-5 h-5" />
                <span className="font-medium">Gestión de Usuarios</span>
              </div>
            </div>
          </div>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => logout()}
            className="w-full bg-red-600/20 text-red-300 px-4 py-3 rounded-lg hover:bg-red-600/30 transition-colors duration-200 border border-red-500/30"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64 transition-all duration-300">
        <div className="lg:hidden h-16"></div>
        <div className="p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Gestión de Usuarios
              </h1>
              <p className="text-purple-200">
                Administra los usuarios del sistema
              </p>
            </div>

            <div className="bg-gray-800/60 backdrop-blur-sm shadow-xl rounded-xl border border-purple-500/20 mb-8">
              <div className="px-6 py-4 border-b border-purple-500/20">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-medium text-white">
                      Lista de Usuarios
                    </h2>
                    <p className="text-lg text-purple-200">
                      Gestiona los usuarios del sistema
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
                  >
                    {showCreateForm ? "Cancelar" : "Crear Usuario"}
                  </button>
                </div>
              </div>

              {showCreateForm && (
                <div className="px-6 py-4 bg-gray-800/40 border-b border-purple-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Crear Nuevo Usuario
                  </h3>
                  <form
                    onSubmit={handleCreateUser}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) =>
                          setFormData({ ...formData, nombre: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">
                        Rol
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            role: e.target.value as
                              | "vendedora"
                              | "administradora",
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="vendedora">Vendedora</option>
                        <option value="administradora">Administradora</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
                      >
                        Crear Usuario
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="px-6 py-4">
                {usuarios.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-purple-200">
                      No hay usuarios registrados
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {usuarios.map((usuario) => (
                      <div
                        key={usuario._id?.toString()}
                        className="bg-gray-800/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4 hover:bg-gray-800/60 transition-colors duration-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-lg">
                              {usuario.name}
                            </h3>
                            <p className="text-purple-200 text-sm">
                              {usuario.email}
                            </p>
                            <div className="mt-2 flex items-center space-x-4">
                              <span
                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                  usuario.role === "administradora"
                                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                                    : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                                }`}
                              >
                                {usuario.role === "administradora"
                                  ? "Administradora"
                                  : "Vendedora"}
                              </span>
                              <span className="text-purple-200 text-xs">
                                {usuario.createdAt
                                  ? new Date(
                                      usuario.createdAt
                                    ).toLocaleDateString()
                                  : "Fecha no disponible"}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            {usuario._id?.toString() !== user?.id && (
                              <button
                                onClick={() =>
                                  handleDeleteUser(
                                    usuario._id?.toString() || "",
                                    usuario.name
                                  )
                                }
                                className="text-red-400 hover:text-red-300 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-red-600/20 border border-red-500/30"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      {/* Modal de confirmación para eliminar usuario */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/80 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-600/20 mb-4">
                <IoIosWarning className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Confirmar eliminación
              </h3>
              <p className="text-gray-300 mb-6">
                ¿Estás seguro de que quieres eliminar al usuario{" "}
                <span className="font-semibold text-white">
                  {deleteModal.userName}
                </span>
                ? Esta acción no se puede deshacer.
              </p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={cancelDeleteUser}
                  className="px-4 py-2 bg-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-600/70 transition-colors duration-200 border border-gray-500/30"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
