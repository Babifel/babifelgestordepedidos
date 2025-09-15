"use client";

import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MdFormatListBulletedAdd } from "react-icons/md";
import { BiSpreadsheet } from "react-icons/bi";
import { TbFileDescription } from "react-icons/tb";
import Modal from "@/components/Modal";

interface ProductoPedido {
  nombreProducto: string;
  descripcionProducto: string;
  cantidades: number;
  imagen?: string;
}

interface NumeroTelefonico {
  numero: string;
  tipo: "principal" | "secundario" | "trabajo" | "casa" | "emergencia";
}

interface Pedido {
  _id: string;
  productos: ProductoPedido[];
  nombreCliente: string;
  numerosTelefonicos: NumeroTelefonico[];
  direccionDetallada: string;
  tipoEnvio: "nacional" | "bogota";
  precioTotal: number;
  abonodinero: number;
  vendedora: string;
  correoVendedora?: string;
  fechaCreacion: string;
  fechaEntregaDeseada?: string;
  estado: "pendiente" | "fabricando" | "enviado" | "entregado" | "devolucion";
  observacionEntrega?: string;
}

export default function DetallesPedidoPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pedidoId = params.id as string;

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPedido, setEditedPedido] = useState<Pedido | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "warning"
  });

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const response = await fetch(`/api/pedidos/${pedidoId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setPedido(data.pedido);
        } else {
          setError("Error al cargar el pedido");
        }
      } catch (error) {
        console.error(error);
        setError(
          "Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo."
        );
      } finally {
        setLoading(false);
      }
    };

    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "vendedora") {
      router.push("/pedidos");
      return;
    }

    if (pedidoId) {
      fetchPedido();
    }
  }, [user, authLoading, router, pedidoId]);

  const handleEdit = () => {
    if (pedido) {
      setEditedPedido({ ...pedido });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPedido(null);
    setError("");
  };

  const validatePedido = (pedido: Pedido): string[] => {
    const errors: string[] = [];
    
    if (!pedido.numerosTelefonicos || pedido.numerosTelefonicos.length === 0) {
      errors.push('Debe tener al menos un número telefónico');
    }
    
    if (!pedido.direccionDetallada?.trim()) {
      errors.push('La dirección detallada es requerida');
    }
    
    if (!pedido.vendedora?.trim()) {
      errors.push('El nombre de la vendedora es requerido');
    }
    
    if (pedido.precioTotal <= 0) {
      errors.push('El precio total debe ser mayor a 0');
    }
    
    if (pedido.abonodinero < 0) {
      errors.push('El abono no puede ser negativo');
    }
    
    if (pedido.abonodinero > pedido.precioTotal) {
      errors.push('El abono no puede ser mayor al precio total');
    }
    
    if (!pedido.productos || pedido.productos.length === 0) {
      errors.push('Debe tener al menos un producto');
    } else {
      pedido.productos.forEach((producto, index) => {
        if (!producto.nombreProducto?.trim()) {
          errors.push(`El producto ${index + 1} debe tener un nombre`);
        }
        if (producto.cantidades <= 0) {
          errors.push(`El producto ${index + 1} debe tener una cantidad mayor a 0`);
        }
      });
    }
    
    return errors;
  };

  const handleSave = async () => {
    if (!editedPedido || !user) return;
    
    // Validar datos antes de guardar
    const validationErrors = validatePedido(editedPedido);
    if (validationErrors.length > 0) {
      alert('Errores de validación:\n' + validationErrors.join('\n'));
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`/api/pedidos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(editedPedido)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el pedido');
      }
      
      const updatedPedido = await response.json();
      
      // Actualizar el pedido local con los cambios
      setPedido(updatedPedido);
      setIsEditing(false);
      
      // Mostrar modal de éxito
      setModalConfig({
        title: "¡Éxito!",
        message: "El pedido ha sido actualizado exitosamente",
        type: "success"
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error al guardar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar los cambios: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const updateEditedField = (field: keyof Pedido, value: string | number | NumeroTelefonico[] | ProductoPedido[]) => {
    if (editedPedido) {
      setEditedPedido({
        ...editedPedido,
        [field]: value
      });
    }
  };

  const updateTelefono = (index: number, field: 'numero' | 'tipo', value: string) => {
    if (editedPedido && editedPedido.numerosTelefonicos) {
      const newTelefonos = [...editedPedido.numerosTelefonicos];
      newTelefonos[index] = {
        ...newTelefonos[index],
        [field]: value
      };
      updateEditedField('numerosTelefonicos', newTelefonos);
    }
  };

  const addTelefono = () => {
    if (editedPedido) {
      const newTelefonos = [...(editedPedido.numerosTelefonicos || []), { numero: '', tipo: 'principal' as const }];
      updateEditedField('numerosTelefonicos', newTelefonos);
    }
  };

  const removeTelefono = (index: number) => {
    if (editedPedido && editedPedido.numerosTelefonicos) {
      const newTelefonos = editedPedido.numerosTelefonicos.filter((_, i) => i !== index);
      updateEditedField('numerosTelefonicos', newTelefonos);
    }
  };

  const updateProducto = (index: number, field: keyof ProductoPedido, value: string | number) => {
    if (editedPedido && editedPedido.productos) {
      const newProductos = [...editedPedido.productos];
      newProductos[index] = {
        ...newProductos[index],
        [field]: value
      };
      updateEditedField('productos', newProductos);
    }
  };

  const addProducto = () => {
    if (editedPedido) {
      const newProductos = [...(editedPedido.productos || []), {
        nombreProducto: '',
        descripcionProducto: '',
        cantidades: 1,
        imagen: ''
      }];
      updateEditedField('productos', newProductos);
    }
  };

  const removeProducto = (index: number) => {
    if (editedPedido && editedPedido.productos) {
      const newProductos = editedPedido.productos.filter((_, i) => i !== index);
      updateEditedField('productos', newProductos);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-yellow-200 text-yellow-600 border-yellow-600";
      case "fabricando":
        return "bg-blue-200 text-blue-600 border-blue-600";
      case "enviado":
        return "bg-purple-200 text-purple-600 border-purple-600";
      case "entregado":
        return "bg-green-200 text-green-600 border-green-600";
      case "devolucion":
        return "bg-red-200 text-red-600 border-red-600";
      default:
        return "bg-gray-200 text-gray-600 border-gray-600";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <span className="loader"></span>
      </div>
    );
  }

  if (!user || user.role !== "vendedora") {
    return null;
  }

  if (error && !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href="/pedidos" className="text-blue-600 hover:text-blue-800">
            Volver a Mis Pedidos
          </Link>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Pedido no encontrado</div>
          <Link href="/pedidos" className="text-blue-600 hover:text-blue-800">
            Volver a Mis Pedidos
          </Link>
        </div>
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
              href="/pedidos"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <BiSpreadsheet className="w-5 h-5" />
              <span>Mis Pedidos</span>
            </Link>
            <Link
              href="/pedidos/solicitar"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <MdFormatListBulletedAdd className="w-5 h-5" />
              <span>Nuevo Pedido</span>
            </Link>
            <div className="bg-purple-600/20 text-purple-300 px-4 py-3 rounded-lg border border-purple-500/30">
              <div className="flex items-center space-x-3">
                <TbFileDescription className="w-5 h-5" />
                <span className="font-medium">Detalles del Pedido</span>
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
                Detalles del Pedido
              </h1>
              <p className="text-purple-200">Información completa del pedido</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Estado del Pedido - Panel lateral */}
              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
                  <div className="px-6 py-4 border-b border-purple-500/20">
                    <h2 className="text-lg font-medium text-white">
                      Estado del Pedido
                    </h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-center py-6">
                      <div
                        className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full border ${getEstadoColor(
                          pedido.estado
                        )} mb-3`}
                      >
                        {pedido.estado}
                      </div>
                      <p className="text-sm text-purple-200">
                        Estado actual del pedido
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del Pedido */}
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
                  <div className="px-6 py-4 border-b border-purple-500/20 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-white">
                      Información del Pedido
                    </h2>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <button
                          onClick={handleEdit}
                          className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                        >
                          Editar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleCancel}
                            className="cursor-pointer px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? "Guardando..." : "Guardar"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Cliente
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          {pedido.nombreCliente}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Teléfonos
                        </label>
                        {!isEditing ? (
                          <div className="mt-1 space-y-1">
                            {pedido.numerosTelefonicos &&
                            pedido.numerosTelefonicos.length > 0 ? (
                              pedido.numerosTelefonicos.map((telefono, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-sm text-white">
                                    {telefono.numero}
                                  </span>
                                  <span className="text-xs text-purple-300 capitalize bg-purple-500/20 px-2 py-1 rounded">
                                    {telefono.tipo}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-white">
                                Sin teléfonos registrados
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 space-y-2">
                            {editedPedido?.numerosTelefonicos?.map((telefono, index) => (
                              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                <input
                                  type="text"
                                  value={telefono.numero}
                                  onChange={(e) => updateTelefono(index, 'numero', e.target.value)}
                                  className="w-full sm:flex-1 p-2 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white text-sm"
                                  placeholder="Número de teléfono"
                                />
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <select
                                    value={telefono.tipo}
                                    onChange={(e) => updateTelefono(index, 'tipo', e.target.value)}
                                    className="flex-1 sm:flex-none p-2 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white text-sm min-w-0"
                                  >
                                    <option value="principal">Principal</option>
                                    <option value="secundario">Secundario</option>
                                    <option value="trabajo">Trabajo</option>
                                    <option value="casa">Casa</option>
                                    <option value="emergencia">Emergencia</option>
                                  </select>
                                  <button
                                    onClick={() => removeTelefono(index)}
                                    className="cursor-pointer flex-shrink-0 p-2 bg-red-600/40 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={addTelefono}
                              className="w-full p-2 bg-violet-600/100 text-white rounded-lg hover:bg-violet-600/70 cursor-pointer transition-colors text-sm"
                            >
                              + Agregar Teléfono
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-purple-300">
                          Plantilla de Envío
                        </label>
                        {!isEditing ? (
                          <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                            {pedido.direccionDetallada}
                          </p>
                        ) : (
                          <textarea
                            value={editedPedido?.direccionDetallada || ''}
                            onChange={(e) => updateEditedField('direccionDetallada', e.target.value)}
                            className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white resize-none"
                            rows={3}
                            placeholder="Dirección detallada de envío"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Tipo de Envío
                        </label>
                        {!isEditing ? (
                          <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white capitalize">
                            {pedido.tipoEnvio}
                          </p>
                        ) : (
                          <select
                            value={editedPedido?.tipoEnvio || ''}
                            onChange={(e) => updateEditedField('tipoEnvio', e.target.value)}
                            className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white"
                          >
                            <option value="nacional">Nacional</option>
                            <option value="bogota">Bogotá</option>
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Vendedora
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          {pedido.vendedora}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Precio Total
                        </label>
                        {!isEditing ? (
                          <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                            ${pedido.precioTotal.toLocaleString()}
                          </p>
                        ) : (
                          <input
                            type="number"
                            value={editedPedido?.precioTotal || 0}
                            onChange={(e) => updateEditedField('precioTotal', parseFloat(e.target.value) || 0)}
                            className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white"
                            placeholder="Precio total"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Abono
                        </label>
                        {!isEditing ? (
                          <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                            ${pedido.abonodinero.toLocaleString()}
                          </p>
                        ) : (
                          <input
                            type="number"
                            value={editedPedido?.abonodinero || 0}
                            onChange={(e) => updateEditedField('abonodinero', parseFloat(e.target.value) || 0)}
                            className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white"
                            placeholder="Abono"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Saldo Pendiente
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          $
                          {(
                            pedido.precioTotal - pedido.abonodinero
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Fecha de Creación
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          {new Date(pedido.fechaCreacion).toLocaleDateString()}
                        </p>
                      </div>
                      {(pedido.fechaEntregaDeseada || isEditing) && (
                        <div>
                          <label className="block text-sm font-medium text-purple-300">
                            Fecha de Entrega Deseada
                          </label>
                          {!isEditing ? (
                            <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                              {pedido.fechaEntregaDeseada ? new Date(
                                pedido.fechaEntregaDeseada
                              ).toLocaleDateString() : 'No especificada'}
                            </p>
                          ) : (
                            <input
                              type="date"
                              value={editedPedido?.fechaEntregaDeseada ? new Date(editedPedido.fechaEntregaDeseada).toISOString().split('T')[0] : ''}
                              onChange={(e) => updateEditedField('fechaEntregaDeseada', e.target.value ? new Date(e.target.value).toISOString() : '')}
                              className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white"
                            />
                          )}
                        </div>
                      )}
                      {(pedido.observacionEntrega || isEditing) && (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-purple-300">
                            Observación de{" "}
                            {(editedPedido?.estado || pedido.estado) === "entregado"
                              ? "Entrega"
                              : "Devolución"}
                          </label>
                          {!isEditing ? (
                            <div className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg">
                              <p className="text-sm text-white whitespace-pre-wrap">
                                {pedido.observacionEntrega || 'Sin observaciones'}
                              </p>
                            </div>
                          ) : (
                            <textarea
                              value={editedPedido?.observacionEntrega || ''}
                              onChange={(e) => updateEditedField('observacionEntrega', e.target.value)}
                              className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white resize-none"
                              rows={4}
                              placeholder="Observaciones de entrega o devolución"
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-purple-300">
                          Productos del Pedido
                        </label>
                        {isEditing && (
                          <button
                            onClick={addProducto}
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                          >
                            Agregar Producto
                          </button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {(isEditing ? editedPedido?.productos : pedido.productos) &&
                          (isEditing ? editedPedido?.productos : pedido.productos)!.map((producto, index) => (
                            <div
                              key={index}
                              className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20"
                            >
                              {isEditing && (
                                <div className="flex justify-end mb-2">
                                  <button
                                    onClick={() => removeProducto(index)}
                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                              {producto.imagen && (
                                <div className="mb-4">
                                  <div className="flex justify-center">
                                    <Image
                                      src={producto.imagen}
                                      alt={`Producto ${index + 1}`}
                                      width={300}
                                      height={300}
                                      className="w-full max-w-xs rounded-lg shadow-lg border border-purple-500/20"
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-purple-300">
                                    Producto
                                  </label>
                                  {!isEditing ? (
                                    <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                                      {producto.nombreProducto}
                                    </p>
                                  ) : (
                                    <input
                                      type="text"
                                      value={producto.nombreProducto}
                                      onChange={(e) => updateProducto(index, 'nombreProducto', e.target.value)}
                                      className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white"
                                      placeholder="Nombre del producto"
                                    />
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-purple-300">
                                    Descripción
                                  </label>
                                  {!isEditing ? (
                                    <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                                      {producto.descripcionProducto || 'Sin descripción'}
                                    </p>
                                  ) : (
                                    <textarea
                                      value={producto.descripcionProducto || ''}
                                      onChange={(e) => updateProducto(index, 'descripcionProducto', e.target.value)}
                                      className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white resize-none"
                                      rows={3}
                                      placeholder="Descripción del producto"
                                    />
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-purple-300">
                                    Cantidad
                                  </label>
                                  {!isEditing ? (
                                    <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                                      {producto.cantidades}
                                    </p>
                                  ) : (
                                    <input
                                      type="number"
                                      min="1"
                                      value={producto.cantidades}
                                      onChange={(e) => updateProducto(index, 'cantidades', parseInt(e.target.value) || 1)}
                                      className="mt-1 w-full p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white"
                                    />
                                  )}
                                </div>
                                {isEditing && (
                                  <div>
                                    <label className="block text-sm font-medium text-purple-300">
                                      Imagen del Producto
                                    </label>
                                    <div className="mt-1 space-y-2">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              const result = event.target?.result as string;
                                              updateProducto(index, 'imagen', result);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                        className="w-full p-2 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                                      />
                                      {producto.imagen && (
                                        <div className="flex items-center gap-2">
                                          <Image
                                            src={producto.imagen}
                                            alt="Preview"
                                            width={60}
                                            height={60}
                                            className="rounded-lg object-cover"
                                          />
                                          <button
                                            onClick={() => updateProducto(index, 'imagen', '')}
                                            className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs hover:bg-red-600/30 transition-colors"
                                          >
                                            Eliminar
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        {(!(isEditing ? editedPedido?.productos : pedido.productos) ||
                          (isEditing ? editedPedido?.productos : pedido.productos)!.length === 0) && (
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20 text-center">
                            <p className="text-purple-300">
                              No hay productos en este pedido
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón para volver */}
            <div className=" sm:hidden mt-8 text-center">
              <Link
                href="/pedidos"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Volver a Mis Pedidos
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
}
