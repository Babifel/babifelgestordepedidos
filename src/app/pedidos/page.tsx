"use client";

import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BiSpreadsheet } from "react-icons/bi";
import { MdFormatListBulletedAdd } from "react-icons/md";
import { FaDownload } from "react-icons/fa";

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
}

export default function PedidosPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { logout } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busquedaCliente, setBusquedaCliente] = useState<string>("");

  // Estados de carga progresiva
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [hasMorePedidos, setHasMorePedidos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [itemsPerPage] = useState(20);

  // Función para filtrar pedidos
  const pedidosFiltrados = pedidos.filter((pedido) => {
    // Filtrar por estado
    const cumpleEstado =
      filtroEstado === "todos" || pedido.estado === filtroEstado;

    // Filtrar por nombre del cliente
    const cumpleBusqueda =
      busquedaCliente === "" ||
      pedido.nombreCliente
        .toLowerCase()
        .includes(busquedaCliente.toLowerCase());

    return cumpleEstado && cumpleBusqueda;
  });

  // Debug logs
  console.log("Current state:", {
    pedidos: pedidos.length,
    pedidosFiltrados: pedidosFiltrados.length,
    loading,
    error,
    filtroEstado,
    busquedaCliente,
    totalPedidos,
  });

  const fetchPedidos = useCallback(
    async (isAutoRefresh = false, page = 1, append = false) => {
      try {
        console.log("fetchPedidos called with:", {
          isAutoRefresh,
          page,
          append,
        });
        if (isAutoRefresh) {
          setIsRefreshing(true);
        }
        if (append) {
          setLoadingMore(true);
        }

        const url = `/api/pedidos?paginated=true&page=${page}&limit=${itemsPerPage}`;
        console.log("Fetching URL:", url);

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log("Response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Response data:", data);
          const newPedidos = data.pedidos || [];
          console.log("New pedidos count:", newPedidos.length);

          if (append) {
            setPedidos((prev) => [...prev, ...newPedidos]);
          } else {
            setPedidos(newPedidos);
          }

          setTotalPedidos(data.total || 0);
          setCurrentPage(page);
          setLastUpdated(new Date());
          setError(""); // Limpiar errores previos

          // Verificar si hay más pedidos para cargar
          const totalLoaded = append
            ? pedidos.length + newPedidos.length
            : newPedidos.length;
          setHasMorePedidos(totalLoaded < (data.total || 0));
        } else {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          setError("Error al cargar los pedidos");
        }
      } catch (error) {
        console.error("Error en fetchPedidos:", error);
        setError("Error de conexión");
      } finally {
        setLoading(false);
        if (isAutoRefresh) {
          setIsRefreshing(false);
        }
        if (append) {
          setLoadingMore(false);
        }
      }
    },
    [itemsPerPage, pedidos.length]
  );

  useEffect(() => {
    console.log("useEffect triggered:", { authLoading, user });
    if (authLoading) return; // Aún cargando

    if (!user) {
      console.log("No user, redirecting to login");
      router.push("/login");
      return;
    }

    // Verificar que sea vendedora
    if (user.role !== "vendedora") {
      console.log("User is not vendedora, role:", user.role);
      router.push("/dashboard"); // Redirigir a dashboard si es administradora
      return;
    }

    console.log("User is vendedora, fetching pedidos");
    // Cargar pedidos
    fetchPedidos(false, 1);
  }, [user, authLoading, router, fetchPedidos]);

  // Polling para actualizar pedidos cada 30 segundos
  useEffect(() => {
    if (!user || user.role !== "vendedora") return;

    const interval = setInterval(() => {
      fetchPedidos(true, 1, false); // true indica que es una actualización automática
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [user, fetchPedidos]);

  // Función para refrescar manualmente
  const handleManualRefresh = () => {
    fetchPedidos(true, 1, false);
  };

  // Función para cargar más pedidos
  const handleLoadMore = () => {
    if (hasMorePedidos && !loadingMore) {
      fetchPedidos(false, currentPage + 1, true);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "fabricando":
        return "bg-blue-100 text-blue-800";
      case "enviado":
        return "bg-purple-100 text-purple-800";
      case "entregado":
        return "bg-green-100 text-green-800";
      case "devolucion":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <span className="loader"></span>
      </div>
    );
  }

  if (!user || user.role !== "vendedora") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/20 text-white p-2 rounded-lg"
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
            <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Babifel CRM</span>
            </div>
          </div>
        </div>
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            <div className="bg-purple-600/20 text-purple-300 px-4 py-3 rounded-lg border border-purple-500/30">
              <div className="flex items-center space-x-3">
                <BiSpreadsheet className="w-5 h-5" />
                <span className="font-medium">Mis Pedidos</span>
              </div>
            </div>
            <Link
              href="/pedidos/solicitar"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
              onClick={() => setSidebarOpen(false)}
            >
              <MdFormatListBulletedAdd className="w-5 h-5" />
              <span>Nuevo Pedido</span>
            </Link>
            <Link
              href="/pedidos/descargasdepedidos"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <FaDownload className="w-5 h-5" />
              <span>Descargas</span>
            </Link>
          </div>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => logout()}
            className="cursor-pointer w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 px-4 py-3 rounded-lg transition-colors duration-200 border border-red-500/30"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Mis Pedidos</h1>
            <p className="text-purple-200">
              Bienvenido, {user.name || user.email}
            </p>
          </div>
          {/* Filtros */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Campo de búsqueda */}

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button
                onClick={() => setFiltroEstado("todos")}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm lg:text-base ${
                  filtroEstado === "todos"
                    ? "bg-purple-600 text-white"
                    : "bg-white/10 text-purple-300 hover:bg-white/20"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroEstado("pendiente")}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm lg:text-base ${
                  filtroEstado === "pendiente"
                    ? "bg-yellow-600 text-white"
                    : "bg-white/10 text-yellow-300 hover:bg-white/20"
                }`}
              >
                Pendiente
              </button>

              <button
                onClick={() => setFiltroEstado("fabricando")}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm lg:text-base ${
                  filtroEstado === "fabricando"
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-blue-300 hover:bg-white/20"
                }`}
              >
                Fabricando
              </button>
              <button
                onClick={() => setFiltroEstado("enviado")}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm lg:text-base ${
                  filtroEstado === "enviado"
                    ? "bg-purple-600 text-white"
                    : "bg-white/10 text-purple-300 hover:bg-white/20"
                }`}
              >
                Enviado
              </button>
              <button
                onClick={() => setFiltroEstado("entregado")}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm lg:text-base ${
                  filtroEstado === "entregado"
                    ? "bg-green-600 text-white"
                    : "bg-white/10 text-green-300 hover:bg-white/20"
                }`}
              >
                Entregado
              </button>
              <button
                onClick={() => setFiltroEstado("devolucion")}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm lg:text-base ${
                  filtroEstado === "devolucion"
                    ? "bg-red-600 text-white"
                    : "bg-white/10 text-red-300 hover:bg-white/20"
                }`}
              >
                Devolución
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Link
                href="/pedidos/solicitar"
                className="sm:hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium flex items-center justify-center space-x-2 w-full lg:w-auto text-sm lg:text-base"
              >
                <span>+</span>
                <span>Nuevo Pedido</span>
              </Link>
            </div>
          </div>

          {/* Información de actualización */}

          {/* Lista de pedidos */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-purple-500/20 flex flex-col lg:flex-row justify-between">
              <div className="flex items-center space-x-2">
                <div>
                  <h2 className="text-lg font-medium text-white">
                    Lista de Pedidos
                  </h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 px-3 lg:px-4 py-2 rounded-lg transition-colors duration-200 border border-purple-500/30 inline-flex items-center justify-center disabled:opacity-50 text-sm lg:text-base"
                    >
                      <svg
                        className={`w-4 h-4 mr-2 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      {isRefreshing ? "Actualizando..." : "Actualizar"}
                    </button>
                    <div className="mb-4 flex flex-col sm:flex-row gap-2 text-sm">
                      {lastUpdated && (
                        <div className="text-purple-300">
                          Última actualización:{" "}
                          {lastUpdated.toLocaleTimeString()}
                        </div>
                      )}
                      {isRefreshing && (
                        <div className="text-purple-300 flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-300"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sincronizando...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-3xl lg:max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar por nombre del cliente..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/70 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="text-purple-300">Cargando pedidos...</div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-red-400">{error}</div>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-purple-300">
                  {pedidos.length === 0
                    ? "No tienes pedidos registrados aún."
                    : busquedaCliente !== "" && filtroEstado !== "todos"
                    ? `No se encontraron pedidos con estado "${
                        filtroEstado === "devolucion"
                          ? "devolución"
                          : filtroEstado
                      }" para el cliente "${busquedaCliente}".`
                    : busquedaCliente !== ""
                    ? `No se encontraron pedidos para el cliente "${busquedaCliente}".`
                    : `No hay pedidos con estado "${
                        filtroEstado === "devolucion"
                          ? "devolución"
                          : filtroEstado
                      }".`}
                </div>
                {pedidos.length === 0 && (
                  <Link
                    href="/pedidos/solicitar"
                    className="mt-2 text-purple-400 hover:text-purple-300"
                  >
                    ¡Crea tu primer pedido!
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Vista de tabla para pantallas grandes */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-purple-500/20">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Entrega Deseada
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/20">
                      {pedidosFiltrados.map((pedido) => (
                        <tr
                          key={pedido._id}
                          className=" hover:bg-purple-600/10 transition-colors duration-200 cursor-pointer"
                          onClick={() =>
                            router.push(`/pedidos/detalles/${pedido._id}`)
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {pedido.productos && pedido.productos.length === 1
                                ? pedido.productos[0].nombreProducto
                                : pedido.productos &&
                                  pedido.productos.length > 1
                                ? `${pedido.productos.length} productos`
                                : "Sin productos"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {pedido.nombreCliente}
                            </div>
                            <div className="text-sm text-purple-300">
                              {pedido.numerosTelefonicos &&
                              pedido.numerosTelefonicos.length > 0
                                ? pedido.numerosTelefonicos[0].numero
                                : "Sin teléfono"}
                              {pedido.numerosTelefonicos &&
                                pedido.numerosTelefonicos.length > 1 && (
                                  <span className="ml-1 text-xs">
                                    +{pedido.numerosTelefonicos.length - 1}
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {pedido.productos
                              ? pedido.productos.reduce(
                                  (total, producto) =>
                                    total + producto.cantidades,
                                  0
                                )
                              : 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              ${pedido.precioTotal.toLocaleString()}
                            </div>
                            <div className="text-sm text-purple-300">
                              Abono: ${pedido.abonodinero.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(
                                pedido.estado
                              )}`}
                            >
                              {pedido.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-300">
                            {new Date(
                              pedido.fechaCreacion
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-300">
                            {pedido.fechaEntregaDeseada
                              ? new Date(
                                  pedido.fechaEntregaDeseada
                                ).toLocaleDateString()
                              : "No especificada"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vista de tarjetas para pantallas pequeñas */}
                <div className="lg:hidden space-y-4 p-4">
                  {pedidosFiltrados.map((pedido) => (
                    <div
                      key={pedido._id}
                      className="bg-gray-800/30 border border-purple-500/20 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-800/50 transition-colors duration-200"
                      onClick={() =>
                        router.push(`/pedidos/detalles/${pedido._id}`)
                      }
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-white font-medium text-sm">
                            {pedido.productos && pedido.productos.length === 1
                              ? pedido.productos[0].nombreProducto
                              : pedido.productos && pedido.productos.length > 1
                              ? `${pedido.productos.length} productos`
                              : "Sin productos"}
                          </h3>
                          <p className="text-purple-300 text-xs mt-1">
                            Cantidad:{" "}
                            {pedido.productos
                              ? pedido.productos.reduce(
                                  (total, producto) =>
                                    total + producto.cantidades,
                                  0
                                )
                              : 0}
                          </p>
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(
                            pedido.estado
                          )}`}
                        >
                          {pedido.estado}
                        </span>
                      </div>

                      <div className="border-t border-purple-500/20 pt-3">
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div>
                            <span className="text-purple-300">Cliente: </span>
                            <span className="text-white">
                              {pedido.nombreCliente}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Teléfono: </span>
                            <span className="text-white">
                              {pedido.numerosTelefonicos &&
                              pedido.numerosTelefonicos.length > 0
                                ? pedido.numerosTelefonicos[0].numero
                                : "Sin teléfono"}
                              {pedido.numerosTelefonicos &&
                                pedido.numerosTelefonicos.length > 1 && (
                                  <span className="ml-1 text-xs text-purple-300">
                                    +{pedido.numerosTelefonicos.length - 1} más
                                  </span>
                                )}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Total: </span>
                            <span className="text-white">
                              ${pedido.precioTotal.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Abono: </span>
                            <span className="text-white">
                              ${pedido.abonodinero.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Fecha: </span>
                            <span className="text-white">
                              {new Date(
                                pedido.fechaCreacion
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {pedido.fechaEntregaDeseada && (
                            <div>
                              <span className="text-purple-300">
                                Entrega deseada:{" "}
                              </span>
                              <span className="text-white">
                                {new Date(
                                  pedido.fechaEntregaDeseada
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón Cargar más */}
                <div className="mt-6 flex flex-col items-center bg-purple-900/50 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm text-purple-300 mb-4">
                    Mostrando {pedidos.length} de {totalPedidos} pedidos
                  </div>
                  {hasMorePedidos && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {loadingMore ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <span>Cargar 20 pedidos más antiguos</span>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
