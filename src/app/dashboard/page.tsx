"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MdDashboard, MdFormatListBulletedAdd } from "react-icons/md";
import { FaUserLock, FaDownload } from "react-icons/fa";

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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  // Estados de carga progresiva
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [hasMorePedidos, setHasMorePedidos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [itemsPerPage] = useState(20);


  const fetchPedidos = useCallback(
    async (page = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);

        const url = `/api/pedidos?paginated=true&page=${page}&limit=${itemsPerPage}`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const newPedidos = data.pedidos || [];

          setPedidos((prev) =>
            append ? [...prev, ...newPedidos] : newPedidos
          );

          setTotalPedidos(data.total || 0);
          setCurrentPage(page);

          const totalLoaded = append
            ? pedidos.length + newPedidos.length
            : newPedidos.length;

          setHasMorePedidos(totalLoaded < (data.total || 0));
        } else {
          setError("Error al cargar los pedidos");
        }
      } catch (error) {
        console.error("Error en fetchPedidos:", error);
        setError("Error de conexión");
      } finally {
        setLoading(false);
        if (append) setLoadingMore(false);
      }
    },
    [itemsPerPage, pedidos.length] // dependencias reales
  );



  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "administradora") {
      router.push("/pedidos");
      return;
    }

    fetchPedidos(1);
  }, [session, status, router, fetchPedidos]);

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

  // Función para cargar más pedidos
  const handleLoadMore = () => {
    if (hasMorePedidos && !loadingMore) {
      fetchPedidos(currentPage + 1, true);
    }
  };

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const cumpleFiltroEstado =
      filtroEstado === "todos" ||
      pedido.estado.toLowerCase() === filtroEstado.toLowerCase();
    const cumpleBusquedaCliente =
      busquedaCliente === "" ||
      pedido.nombreCliente
        .toLowerCase()
        .includes(busquedaCliente.toLowerCase());
    return cumpleFiltroEstado && cumpleBusquedaCliente;
  });

  const getPedidosDelMesData = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const pedidosDelMes = pedidos.filter((pedido) => {
      const fechaPedido = new Date(pedido.fechaCreacion);
      return (
        fechaPedido.getMonth() === currentMonth &&
        fechaPedido.getFullYear() === currentYear &&
        pedido.estado !== "devolucion"
      );
    });

    // Agrupar por día del mes
    const datosPorDia: { [key: string]: number } = {};
    const cantidadesPorDia: { [key: string]: number } = {};

    pedidosDelMes.forEach((pedido) => {
      const dia = new Date(pedido.fechaCreacion).getDate();
      const diaStr = dia.toString();

      if (!datosPorDia[diaStr]) {
        datosPorDia[diaStr] = 0;
        cantidadesPorDia[diaStr] = 0;
      }

      datosPorDia[diaStr]++;
      // Sumar cantidades de todos los productos del pedido
      const cantidadesTotales = pedido.productos
        ? pedido.productos.reduce(
            (total, producto) => total + producto.cantidades,
            0
          )
        : 0;
      cantidadesPorDia[diaStr] += cantidadesTotales;
    });

    // Convertir a formato para el gráfico
    const chartData = Object.keys(datosPorDia)
      .map((dia) => ({
        dia: `Día ${dia}`,
        pedidos: datosPorDia[dia],
        cantidades: cantidadesPorDia[dia],
      }))
      .sort(
        (a, b) => parseInt(a.dia.split(" ")[1]) - parseInt(b.dia.split(" ")[1])
      );

    return chartData;
  };

  const getIngresosDelMesData = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const pedidosDelMes = pedidos.filter((pedido) => {
      const fechaPedido = new Date(pedido.fechaCreacion);
      return (
        fechaPedido.getMonth() === currentMonth &&
        fechaPedido.getFullYear() === currentYear &&
        pedido.estado !== "devolucion"
      );
    });

    let totalEntregado = 0;
    let totalOtros = 0;

    pedidosDelMes.forEach((pedido) => {
      if (pedido.estado === "entregado") {
        totalEntregado += pedido.precioTotal;
      } else {
        totalOtros += pedido.precioTotal;
      }
    });

    const chartData = [
      {
        name: "Pedidos Entregados",
        value: totalEntregado,
        color: "#10b981",
      },
      {
        name: "Otros Estados",
        value: totalOtros,
        color: "#6b7280",
      },
    ].filter((item) => item.value > 0);

    return { chartData, totalEntregado };
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <span className="loader"></span>
      </div>
    );
  }

  if (!session || session.user.role !== "administradora") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="cursor-pointer p-2 rounded-lg bg-gray-900/95 backdrop-blur-sm border border-purple-500/20 text-white hover:bg-gray-800/95 transition-colors"
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
            <div className="bg-purple-600/20 text-purple-300 px-4 py-3 rounded-lg border border-purple-500/30">
              <div className="cursor-pointer flex items-center space-x-3">
                <MdDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </div>
            </div>
            <Link
              href="/pedidos"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <MdFormatListBulletedAdd className="w-5 h-5" />
              <span>Pedidos</span>
            </Link>
            <Link
              href="/dashboard/usuarios"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <FaUserLock className="w-5 h-5" />
              <span>Usuarios</span>
            </Link>
            <Link
              href="/dashboard/descargasdepedidos"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3"
            >
              <FaDownload className="w-5 h-5" />
              <span>Descargas</span>
            </Link>
          </div>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="cursor-pointer  w-full bg-red-600/50 hover:bg-red-600/30 text-red-300 hover:text-red-200 px-4 py-3 rounded-lg transition-colors duration-200 border border-red-500/30"
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
        <div className="p-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-purple-200">Bienvenida, {session.user.name}</p>
              </div>

            </div>
          </div>

          <main className="max-w-7xl mx-auto">
            {/* Métricas principales */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Gráfico de Pedidos del Mes */}
              <div className="lg:col-span-2 bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20 shadow-xl">
                <h3 className="text-lg font-medium text-white mb-4">
                  Pedidos del Mes -{" "}
                  {new Date().toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getPedidosDelMesData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          name === "pedidos"
                            ? "Número de Pedidos"
                            : "Cantidades Totales",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="pedidos"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        name="pedidos"
                      />
                      <Line
                        type="monotone"
                        dataKey="cantidades"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        name="cantidades"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Ingresos */}
              <div className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20 shadow-xl">
                <h3 className="text-lg font-medium text-white mb-4">
                  Ingresos del Mes (Solo Entregados)
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getIngresosDelMesData().chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getIngresosDelMesData().chartData.map(
                          (entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          )
                        )}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          `$${value.toLocaleString()}`,
                          "Ingresos",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-2">
                  <p className="text-2xl font-bold text-green-600">
                    ${getIngresosDelMesData().totalEntregado.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Entregados</p>
                </div>
              </div>
            </div>

            {/* Tabla de Pedidos */}
            <div className="bg-gray-800/60 backdrop-blur-sm shadow-xl rounded-xl border border-purple-500/20 mb-8">
              <div className="px-6 py-4 border-b border-purple-500/20">
                <h2 className="text-2xl font-medium text-white">
                  Todos los Pedidos
                </h2>
                <p className="text-lg text-purple-200">
                  Gestiona y actualiza el estado de todos los pedidos
                </p>
                <div>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Buscar por cliente..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Filtros por estado con botones */}
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-3">
                      Filtrar por estado
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFiltroEstado("todos")}
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filtroEstado === "todos"
                            ? "bg-purple-600 text-white border-2 border-purple-400"
                            : "bg-gray-800/50 text-gray-300 border border-purple-500/30 hover:bg-purple-500/20 hover:text-white"
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setFiltroEstado("pendiente")}
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filtroEstado === "pendiente"
                            ? "bg-yellow-600 text-white border-2 border-yellow-400"
                            : "bg-gray-800/50 text-gray-300 border border-purple-500/30 hover:bg-yellow-600/60 hover:text-white"
                        }`}
                      >
                        Pendiente
                      </button>
                      <button
                        onClick={() => setFiltroEstado("fabricando")}
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filtroEstado === "fabricando"
                            ? "bg-blue-600 text-white border-2 border-blue-400"
                            : "bg-gray-800/50 text-gray-300 border border-purple-500/30 hover:bg-blue-500/20 hover:text-white"
                        }`}
                      >
                        Fabricando
                      </button>
                      <button
                        onClick={() => setFiltroEstado("enviado")}
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filtroEstado === "enviado"
                            ? "bg-purple-600 text-white border-2 border-purple-400"
                            : "bg-gray-800/50 text-gray-300 border border-purple-500/30 hover:bg-purple-500/20 hover:text-white"
                        }`}
                      >
                        Enviado
                      </button>
                      <button
                        onClick={() => setFiltroEstado("entregado")}
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filtroEstado === "entregado"
                            ? "bg-green-600 text-white border-2 border-green-400"
                            : "bg-gray-800/50 text-gray-300 border border-purple-500/30 hover:bg-green-500/20 hover:text-white"
                        }`}
                      >
                        Entregado
                      </button>
                      <button
                        onClick={() => setFiltroEstado("devolucion")}
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filtroEstado === "devolucion"
                            ? "bg-red-500 text-white border-2 border-red-400"
                            : "bg-gray-800/50 text-gray-300 border border-purple-500/30 hover:bg-red-500/20 hover:text-white"
                        }`}
                      >
                        Devolución
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-center">
                  <div className="text-purple-200">Cargando pedidos...</div>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <div className="text-red-300">{error}</div>
                </div>
              ) : pedidos.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-purple-200">
                    No hay pedidos registrados aún.
                  </div>
                </div>
              ) : pedidosFiltrados.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-purple-200">
                    No se encontraron pedidos con los filtros aplicados.
                  </div>
                </div>
              ) : (
                <>
                  {/* Vista de tabla para pantallas grandes */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-purple-500/20">
                      <thead className="bg-purple-900/30">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vendedora
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entrega Deseada
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-transparent divide-y divide-purple-500/20">
                        {pedidosFiltrados.map((pedido) => (
                          <tr
                            key={pedido._id}
                            className="cursor-pointer hover:bg-purple-500/10"
                            onClick={() =>
                              router.push(
                                `/dashboard/detallesdelpedido/${pedido._id}`
                              )
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">
                                {pedido.productos &&
                                pedido.productos.length === 1
                                  ? pedido.productos[0].nombreProducto
                                  : pedido.productos &&
                                    pedido.productos.length > 1
                                  ? `${pedido.productos.length} productos`
                                  : "Sin productos"}
                              </div>
                              <div className="text-sm text-purple-200">
                                Cantidad total:{" "}
                                {pedido.productos
                                  ? pedido.productos.reduce(
                                      (total, producto) =>
                                        total + producto.cantidades,
                                      0
                                    )
                                  : 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">
                                {pedido.nombreCliente}
                              </div>
                              <div className="text-sm text-purple-200">
                                {pedido.numerosTelefonicos &&
                                pedido.numerosTelefonicos.length > 0
                                  ? pedido.numerosTelefonicos[0].numero
                                  : "Sin teléfono"}
                                {pedido.numerosTelefonicos &&
                                  pedido.numerosTelefonicos.length > 1 && (
                                    <span className="ml-1 text-xs">
                                      +{pedido.numerosTelefonicos.length - 1}{" "}
                                      más
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              {pedido.vendedora}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">
                                ${pedido.precioTotal.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                              {new Date(
                                pedido.fechaCreacion
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {pedido.fechaEntregaDeseada
                                ? new Date(
                                    pedido.fechaEntregaDeseada
                                  ).toLocaleDateString()
                                : "No especificada"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                href={`/dashboard/detallesdelpedido/${pedido._id}`}
                                className="text-purple-300 hover:text-purple-100"
                              >
                                Editar Estado
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista de tarjetas para móviles */}
                  <div className="lg:hidden space-y-4 p-2">
                    {pedidosFiltrados.map((pedido) => (
                      <div
                        key={pedido._id}
                        className="overflow-hidden bg-gray-800/90 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4"
                        onClick={() =>
                          router.push(
                            `/dashboard/detallesdelpedido/${pedido._id}`
                          )
                        }
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-sm">
                              {pedido.productos && pedido.productos.length === 1
                                ? pedido.productos[0].nombreProducto
                                : pedido.productos &&
                                  pedido.productos.length > 1
                                ? `${pedido.productos.length} productos`
                                : "Sin productos"}
                            </h3>
                            <p className="text-purple-200 text-sm">
                              {pedido.nombreCliente}
                            </p>
                            <p className="text-purple-300 text-xs">
                              {pedido.numerosTelefonicos &&
                              pedido.numerosTelefonicos.length > 0
                                ? pedido.numerosTelefonicos[0].numero
                                : "Sin teléfono"}
                              {pedido.numerosTelefonicos &&
                                pedido.numerosTelefonicos.length > 1 && (
                                  <span className="ml-1">
                                    +{pedido.numerosTelefonicos.length - 1} más
                                  </span>
                                )}
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

                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-purple-300">Cantidad:</span>
                            <span className="text-white ml-1">
                              {pedido.productos
                                ? pedido.productos.reduce(
                                    (total, producto) =>
                                      total + producto.cantidades,
                                    0
                                  )
                                : 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Total:</span>
                            <span className="text-white ml-1">
                              ${pedido.precioTotal.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Abono:</span>
                            <span className="text-white ml-1">
                              ${pedido.abonodinero.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Vendedora:</span>
                            <span className="text-white ml-1">
                              {pedido.vendedora}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Fecha:</span>
                            <span className="text-white ml-1">
                              {new Date(
                                pedido.fechaCreacion
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-300">Entrega:</span>
                            <span className="text-green-400 ml-1">
                              {pedido.fechaEntregaDeseada
                                ? new Date(
                                    pedido.fechaEntregaDeseada
                                  ).toLocaleDateString()
                                : "No especificada"}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Link
                            href={`/dashboard/detallesdelpedido/${pedido._id}`}
                            className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
                          >
                            Editar Estado
                          </Link>
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
          </main>
        </div>
      </div>
    </div>
  );
}
