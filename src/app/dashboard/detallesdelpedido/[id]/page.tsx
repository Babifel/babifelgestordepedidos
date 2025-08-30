"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Modal from "../../../../components/Modal";
import Image from "next/image";
import { MdDashboard } from "react-icons/md";
import { TbFileDescription } from "react-icons/tb";

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
  fechaCreacion: string;
  fechaEntregaDeseada?: string;
  estado: "pendiente" | "fabricando" | "enviado" | "entregado" | "devolucion";
  observacionEntrega?: string;
}

export default function DetallesPedidoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const pedidoId = params.id as string;

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [modalMessage, setModalMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<Pedido["estado"] | null>(
    null
  );
  const [observacionEntrega, setObservacionEntrega] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const estadosDisponibles: Pedido["estado"][] = [
    "fabricando",
    "enviado",
    "entregado",
    "devolucion",
  ];

  const fetchPedido = useCallback(async () => {
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
      console.error("Error al cargar el pedido:", error);
      setModalType("error");
      setModalMessage(
        "Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo."
      );
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  }, [pedidoId, setModalType, setModalMessage, setShowModal]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (session.user?.role !== "administradora") {
      router.push("/dashboard");
      return;
    }

    if (pedidoId) {
      fetchPedido();
    }
  }, [session, status, router, pedidoId, fetchPedido]);

  const handleEstadoClick = (nuevoEstado: Pedido["estado"]) => {
    if (nuevoEstado === "entregado" || nuevoEstado === "devolucion") {
      setPendingEstado(nuevoEstado);
      setShowConfirmModal(true);
    } else {
      actualizarEstado(nuevoEstado);
    }
  };

  const confirmarEntregado = () => {
    if (pendingEstado) {
      actualizarEstado(pendingEstado, observacionEntrega.trim());
    }
    setShowConfirmModal(false);
    setPendingEstado(null);
    setObservacionEntrega("");
  };

  const cancelarConfirmacion = () => {
    setShowConfirmModal(false);
    setPendingEstado(null);
    setObservacionEntrega("");
  };

  const actualizarEstado = async (
    nuevoEstado: Pedido["estado"],
    observacion?: string
  ) => {
    if (!pedido) return;

    setUpdating(true);

    try {
      const requestBody: {
        estado: Pedido["estado"];
        observacionEntrega?: string;
      } = { estado: nuevoEstado };
      if (
        observacion &&
        (nuevoEstado === "entregado" || nuevoEstado === "devolucion")
      ) {
        requestBody.observacionEntrega = observacion;
      }

      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PATCH",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const updatedPedido = { ...pedido, estado: nuevoEstado };
        if (
          observacion &&
          (nuevoEstado === "entregado" || nuevoEstado === "devolucion")
        ) {
          updatedPedido.observacionEntrega = observacion;
        }
        setPedido(updatedPedido);
        setModalType("success");
        setModalMessage(
          `El estado del pedido se ha actualizado correctamente a "${nuevoEstado}".`
        );
        setShowModal(true);
      } else {
        setModalType("error");
        setModalMessage(
          "Error al actualizar el estado del pedido. Por favor, inténtalo de nuevo."
        );
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
      setError("Error de conexión");
    } finally {
      setUpdating(false);
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

  const getTextColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "text-yellow-600";
      case "fabricando":
        return "text-blue-600";
      case "enviado":
        return "text-purple-600";
      case "entregado":
        return "text-green-600";
      case "devolucion":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <span className="loader"></span>
      </div>
    );
  }

  if (!session || session.user?.role !== "administradora") {
    return null;
  }

  if (error && !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Pedido no encontrado</div>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            Volver al Dashboard
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
              href="/dashboard"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <MdDashboard className="w-5 h-5" />
              <span>Dashboard</span>
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
            onClick={() => signOut({ callbackUrl: "/login" })}
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
              <p className="text-purple-200">
                Gestiona el estado y detalles del pedido
              </p>
            </div>

            {/* Modal de notificación */}
            <Modal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title={modalType === "success" ? "Estado Actualizado" : "Error"}
              message={modalMessage}
              type={modalType}
            />

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel de Actualización de Estado - Móvil primero */}
              <div className="lg:hidden">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
                  <div className="px-6 py-4 border-b border-purple-500/20">
                    <h2 className="text-lg font-medium text-white">
                      Actualizar Estado
                    </h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {pedido.estado === "entregado" ||
                      pedido.estado === "devolucion" ? (
                        <div className="text-center py-6">
                          <div
                            className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full border ${getEstadoColor(
                              pedido.estado
                            )} mb-3`}
                          >
                            {pedido.estado}
                          </div>
                          <p className="text-sm text-purple-200">
                            Este pedido está en estado final. No se pueden
                            realizar más cambios de estado.
                          </p>
                        </div>
                      ) : (
                        estadosDisponibles
                          .filter((estado) => {
                            // Si el estado actual es 'enviado', no mostrar 'fabricando'
                            if (
                              pedido.estado === "enviado" &&
                              estado === "fabricando"
                            ) {
                              return false;
                            }
                            return true;
                          })
                          .map((estado) => (
                            <button
                              key={estado}
                              onClick={() => handleEstadoClick(estado)}
                              disabled={updating || pedido.estado === estado}
                              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                                pedido.estado === estado
                                  ? `${getEstadoColor(
                                      estado
                                    )} cursor-not-allowed`
                                  : "border-purple-400/60 hover:border-purple-300 hover:bg-purple-500/30 cursor-pointer text-gray-100"
                              } ${
                                updating ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-medium capitalize ${
                                    pedido.estado === estado
                                      ? getTextColor(estado)
                                      : "text-white"
                                  }`}
                                >
                                  {estado}
                                </span>
                                {pedido.estado === estado && (
                                  <span className="text-xs bg-white px-2 py-1 rounded">
                                    Actual
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                      )}
                    </div>

                    {updating && (
                      <div className="mt-4 text-center text-sm text-purple-200">
                        Actualizando estado...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Información del Pedido */}
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
                  <div className="px-6 py-4 border-b border-purple-500/20">
                    <h2 className="text-lg font-medium text-white">
                      Información del Pedido
                    </h2>
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
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-purple-300">
                          Plantilla de Envío
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          {pedido.direccionDetallada}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Tipo de Envío
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white capitalize">
                          {pedido.tipoEnvio}
                        </p>
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
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          ${pedido.precioTotal.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Abono
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          ${pedido.abonodinero.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Fecha de Creación
                        </label>
                        <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                          {new Date(pedido.fechaCreacion).toLocaleString()}
                        </p>
                      </div>
                      {pedido.fechaEntregaDeseada && (
                        <div>
                          <label className="block text-sm font-medium text-purple-300">
                            Fecha de Entrega Deseada
                          </label>
                          <p className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg text-white">
                            {new Date(
                              pedido.fechaEntregaDeseada
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-purple-300">
                          Estado Actual
                        </label>
                        <span
                          className={`mt-1 inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getEstadoColor(
                            pedido.estado
                          )}`}
                        >
                          {pedido.estado}
                        </span>
                      </div>
                      {pedido.observacionEntrega && (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-purple-300">
                            Observación de{" "}
                            {pedido.estado === "entregado"
                              ? "Entrega"
                              : "Devolución"}
                          </label>
                          <div className="mt-1 p-3 bg-gray-800/30 border border-purple-500/20 rounded-lg">
                            <p className="text-sm text-white whitespace-pre-wrap">
                              {pedido.observacionEntrega}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-300 mb-4">
                        Productos del Pedido
                      </label>
                      <div className="space-y-4">
                        {pedido.productos &&
                          pedido.productos.map((producto, index) => (
                            <div
                              key={index}
                              className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20"
                            >
                              {producto.imagen && (
                                <div className="mb-4">
                                  <div className="flex justify-center">
                                    <Image
                                      src={producto.imagen}
                                      alt={`Producto ${index + 1}`}
                                      width={300} // agrega un ancho fijo
                                      height={300} // agrega un alto fijo
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
                                  <p className="mt-1 text-sm text-white">
                                    {producto.nombreProducto}
                                  </p>
                                </div>
                                {producto.descripcionProducto && (
                                  <div>
                                    <label className="block text-sm font-medium text-purple-300">
                                      Descripción
                                    </label>
                                    <p className="mt-1 text-sm text-white">
                                      {producto.descripcionProducto}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <label className="block text-sm font-medium text-purple-300">
                                    Cantidad
                                  </label>
                                  <p className="mt-1 text-sm text-white">
                                    {producto.cantidades}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        {(!pedido.productos ||
                          pedido.productos.length === 0) && (
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

              {/* Panel de Actualización de Estado - Desktop */}
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
                  <div className="px-6 py-4 border-b border-purple-500/20">
                    <h2 className="text-lg font-medium text-white">
                      Actualizar Estado
                    </h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {pedido.estado === "entregado" ||
                      pedido.estado === "devolucion" ? (
                        <div className="text-center py-6">
                          <div
                            className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full border ${getEstadoColor(
                              pedido.estado
                            )} mb-3`}
                          >
                            {pedido.estado}
                          </div>
                          <p className="text-sm text-purple-200">
                            Este pedido está en estado final. No se pueden
                            realizar más cambios de estado.
                          </p>
                        </div>
                      ) : (
                        estadosDisponibles
                          .filter((estado) => {
                            // Si el estado actual es 'enviado', no mostrar 'fabricando'
                            if (
                              pedido.estado === "enviado" &&
                              estado === "fabricando"
                            ) {
                              return false;
                            }
                            return true;
                          })
                          .map((estado) => (
                            <button
                              key={estado}
                              onClick={() => handleEstadoClick(estado)}
                              disabled={updating || pedido.estado === estado}
                              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                                pedido.estado === estado
                                  ? `${getEstadoColor(
                                      estado
                                    )} cursor-not-allowed`
                                  : "border-purple-400/60 hover:border-purple-300 hover:bg-purple-500/30 cursor-pointer "
                              } ${
                                updating ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-medium capitalize ${
                                    pedido.estado === estado
                                      ? getTextColor(estado)
                                      : "text-purple-200"
                                  }`}
                                >
                                  {estado}
                                </span>
                                {pedido.estado === estado && (
                                  <span className="text-xs bg-white px-2 py-1 rounded">
                                    Actual
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                      )}
                    </div>

                    {updating && (
                      <div className="mt-4 text-center text-sm text-purple-200">
                        Actualizando estado...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border border-purple-500/30 w-96 shadow-2xl rounded-xl bg-black/45 backdrop-blur-md">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-white text-center">
                {pendingEstado === "entregado"
                  ? "Confirmar Entrega"
                  : "Confirmar Devolución"}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-white text-center">
                  {pendingEstado === "entregado"
                    ? "¿Estás seguro de que quieres marcar este pedido como entregado? Una vez entregado, no podrás marcarlo como devolución."
                    : "¿Estás seguro de que quieres marcar este pedido como devolución? Una vez en devolución, no podrás marcarlo como entregado."}
                </p>
              </div>

              {/* Campo de observación */}
              <div className="mt-4 px-7">
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Observación de{" "}
                  {pendingEstado === "entregado" ? "entrega" : "devolución"}{" "}
                  (opcional)
                </label>
                <textarea
                  value={observacionEntrega}
                  onChange={(e) => setObservacionEntrega(e.target.value)}
                  placeholder={`Describe cómo fue ${
                    pendingEstado === "entregado" ? "entregado" : "devuelto"
                  } el pedido...`}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-purple-300 mt-1 text-right">
                  {observacionEntrega.length}/500 caracteres
                </div>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={cancelarConfirmacion}
                  className="cursor-pointer px-6 py-2 bg-gray-500/90 text-white rounded-lg hover:bg-gray-500/50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200 backdrop-blur-sm border border-gray-500/30"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEntregado}
                  className={`px-6 py-2 cursor-pointer text-white rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 backdrop-blur-sm border ${
                    pendingEstado === "entregado"
                      ? "bg-green-500/30 hover:bg-green-500/50 focus:ring-green-400 border-green-500/30"
                      : "bg-red-500/90 hover:bg-red-500/50 focus:ring-red-400 border-red-500/30"
                  }`}
                >
                  {pendingEstado === "entregado"
                    ? "Confirmar Entrega"
                    : "Confirmar Devolución"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
