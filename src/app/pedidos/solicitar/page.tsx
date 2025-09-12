"use client";

import { useState } from "react";
import { useRequireAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { BiSpreadsheet } from "react-icons/bi";
import { MdFormatListBulletedAdd } from "react-icons/md";

export default function SolicitarPedido() {
  const { user, loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    productos: [
      {
        nombreProducto: "",
        descripcionProducto: "",
        cantidades: "",
        imagen: "",
      },
    ],
    nombreCliente: "",
    numerosTelefonicos: [
      {
        numero: "",
        tipo: "principal",
      },
    ],
    direccionDetallada: "",
    tipoEnvio: "bogota",
    precioTotal: "",
    abonodinero: "",
    fechaEntregaDeseada: "",
  });

  // Redireccionar si no está autenticado o no es vendedora
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <span className="loader"></span>
      </div>
    );
  }

  if (!user || user.role !== "vendedora") {
    router.push("/login");
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Función para actualizar un producto específico
  const handleProductChange = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      productos: prev.productos.map((producto, i) =>
        i === index ? { ...producto, [field]: value } : producto
      ),
    }));
  };

  // Función para agregar un nuevo producto
  const agregarProducto = () => {
    setFormData((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          nombreProducto: "",
          descripcionProducto: "",
          cantidades: "",
          imagen: "",
        },
      ],
    }));
  };

  // Función para eliminar un producto
  const eliminarProducto = (index: number) => {
    if (formData.productos.length > 1) {
      setFormData((prev) => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== index),
      }));
    }
  };

  // Función para actualizar un número telefónico específico
  const handleTelefonoChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      numerosTelefonicos: prev.numerosTelefonicos.map((telefono, i) =>
        i === index ? { ...telefono, [field]: value } : telefono
      ),
    }));
  };

  // Función para agregar un nuevo número telefónico
  const agregarTelefono = () => {
    setFormData((prev) => ({
      ...prev,
      numerosTelefonicos: [
        ...prev.numerosTelefonicos,
        {
          numero: "",
          tipo: "secundario",
        },
      ],
    }));
  };

  // Función para eliminar un número telefónico
  const eliminarTelefono = (index: number) => {
    if (formData.numerosTelefonicos && formData.numerosTelefonicos.length > 1) {
      setFormData((prev) => ({
        ...prev,
        numerosTelefonicos: prev.numerosTelefonicos.filter(
          (_, i) => i !== index
        ),
      }));
    }
  };

  // Función para comprimir imagen
  const compressImage = (
    file: File,
    maxWidth: number = 800,
    quality: number = 0.8
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convertir a base64 comprimido
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith("image/")) {
        setError(
          "Por favor selecciona solo archivos de imagen (JPG, PNG, GIF, etc.)"
        );
        e.target.value = ""; // Limpiar el input
        return;
      }

      // Validar tamaño máximo (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen no puede ser mayor a 5MB");
        e.target.value = ""; // Limpiar el input
        return;
      }

      try {
        setError(""); // Limpiar errores previos
        const compressedImage = await compressImage(file);
        handleProductChange(index, "imagen", compressedImage);
      } catch (error) {
        setError("Error al procesar la imagen");
        console.error("Error comprimiendo imagen:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const dataToSend = {
        ...formData,
        vendedora: user.name || user.email,
        correoVendedora: user.email,
        precioTotal: Number(formData.precioTotal),
        abonodinero: Number(formData.abonodinero),
      };

      const response = await fetch("/api/pedidos", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("¡Pedido creado exitosamente!");
        // Limpiar formulario
        setFormData({
          productos: [
            {
              nombreProducto: "",
              descripcionProducto: "",
              cantidades: "",
              imagen: "",
            },
          ],
          nombreCliente: "",
          numerosTelefonicos: [{ numero: "", tipo: "principal" }],
          direccionDetallada: "",
          tipoEnvio: "bogota",
          precioTotal: "",
          abonodinero: "",
          fechaEntregaDeseada: "",
        });

        setTimeout(() => {
          setSuccess("");
        }, 3000);
      } else {
        setError(data.error || "Error al crear el pedido");
      }
    } catch (error) {
      console.error("Error al crear el pedido:", error);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

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
              onClick={() => setSidebarOpen(false)}
            >
              <BiSpreadsheet className="w-5 h-5" />
              <span>Mis Pedidos</span>
            </Link>
            <div className="bg-purple-600/20 text-purple-400 px-4 py-3 rounded-lg border border-purple-500/30">
              <div className="flex items-center space-x-3">
                <MdFormatListBulletedAdd className="w-5 h-5" />
                <span className="font-medium">Nuevo Pedido</span>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Nuevo Pedido</h1>
            <p className="text-purple-200">
              Vendedora: {user.name || user.email}
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección de Productos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Productos del Pedido
                  </h3>
                </div>

                {formData.productos.map((producto, index) => (
                  <div
                    key={index}
                    className="bg-white/5 border border-purple-500/20 rounded-lg p-4 lg:p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-white">
                        Producto {index + 1}
                      </h4>
                      {formData.productos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarProducto(index)}
                          className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Nombre del Producto *
                        </label>
                        <input
                          type="text"
                          value={producto.nombreProducto}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "nombreProducto",
                              e.target.value
                            )
                          }
                          required
                          className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                          placeholder="Ej: Camiseta Nike"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Cantidad *
                        </label>
                        <input
                          type="number"
                          value={producto.cantidades}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "cantidades",
                              e.target.value
                            )
                          }
                          required
                          min="1"
                          className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Descripción del Producto *
                      </label>
                      <textarea
                        value={producto.descripcionProducto}
                        onChange={(e) =>
                          handleProductChange(
                            index,
                            "descripcionProducto",
                            e.target.value
                          )
                        }
                        required
                        rows={3}
                        className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm resize-none text-sm lg:text-base"
                        placeholder="Describe las características del producto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Imagen del Producto (Opcional)
                      </label>
                      <p className="text-sm text-purple-400 mb-3">
                        Formatos: JPG, PNG, GIF. Máximo 5MB.
                      </p>
                      <input
                        type="file"
                        onChange={(e) => handleImageChange(e, index)}
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white file:mr-2 lg:file:mr-4 file:py-1 lg:file:py-2 file:px-2 lg:file:px-4 file:rounded-lg file:border-0 file:text-xs lg:file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                      />
                      {producto.imagen && (
                        <div className="mt-4">
                          <NextImage
                            src={producto.imagen}
                            alt="Preview"
                            width={128}
                            height={128}
                            className="rounded-lg border border-purple-500/30"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={agregarProducto}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 font-medium text-sm flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Agregar Producto
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div>
                  <label
                    htmlFor="nombreCliente"
                    className="block text-sm font-medium text-white mb-2"
                  >
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    id="nombreCliente"
                    name="nombreCliente"
                    value={formData.nombreCliente}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                    placeholder="Nombre completo del cliente"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-white">
                      Números Telefónicos *
                    </label>
                    <button
                      type="button"
                      onClick={agregarTelefono}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm"
                    >
                      + Agregar Teléfono
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.numerosTelefonicos &&
                      formData.numerosTelefonicos.map((telefono, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/30 border border-purple-500/20 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-purple-400">
                              Teléfono {index + 1}
                            </span>
                            {formData.numerosTelefonicos &&
                              formData.numerosTelefonicos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => eliminarTelefono(index)}
                                  className="text-red-400 hover:text-red-300 transition-colors duration-200"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-purple-400 mb-1">
                                Número *
                              </label>
                              <input
                                type="tel"
                                value={telefono.numero}
                                onChange={(e) =>
                                  handleTelefonoChange(
                                    index,
                                    "numero",
                                    e.target.value
                                  )
                                }
                                required={index === 0}
                                className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm"
                                placeholder="300 1111222"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-purple-400 mb-1">
                                Tipo
                              </label>
                              <select
                                value={telefono.tipo}
                                onChange={(e) =>
                                  handleTelefonoChange(
                                    index,
                                    "tipo",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2  border border-purple-500/30 rounded-lg text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm"
                              >
                                <option value="principal">Principal</option>
                                <option value="secundario">Secundario</option>
                                <option value="trabajo">Trabajo</option>
                                <option value="casa">Casa</option>
                                <option value="emergencia">Emergencia</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="direccionDetallada"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Plantilla de Envío *
                </label>
                <textarea
                  id="direccionDetallada"
                  name="direccionDetallada"
                  value={formData.direccionDetallada}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm resize-none text-sm lg:text-base"
                  placeholder="Dirección completa con referencias"
                />
              </div>

              <div>
                <label
                  htmlFor="fechaEntregaDeseada"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Fecha de Entrega Deseada
                </label>
                <input
                  type="date"
                  id="fechaEntregaDeseada"
                  name="fechaEntregaDeseada"
                  value={formData.fechaEntregaDeseada}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                />
                <p className="text-xs text-purple-400 mt-2">
                  Opcional: Fecha en la que el cliente desea recibir el pedido
                </p>
              </div>

              <div>
                <label
                  htmlFor="tipoEnvio"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Tipo de Envío *
                </label>
                <select
                  id="tipoEnvio"
                  name="tipoEnvio"
                  value={formData.tipoEnvio}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                >
                  <option value="bogota" className="bg-gray-800 text-white">
                    Bogotá
                  </option>
                  <option value="nacional" className="bg-gray-800 text-white">
                    Nacional
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div>
                  <label
                    htmlFor="precioTotal"
                    className="block text-sm font-medium text-white mb-2"
                  >
                    Precio Total *
                  </label>
                  <input
                    type="number"
                    id="precioTotal"
                    name="precioTotal"
                    value={formData.precioTotal}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor="abonodinero"
                    className="block text-sm font-medium text-white mb-2"
                  >
                    Abono de Dinero *
                  </label>
                  <input
                    type="number"
                    id="abonodinero"
                    name="abonodinero"
                    value={formData.abonodinero}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-sm lg:text-base"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 text-green-200 rounded-lg">
                  {success}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 lg:py-3 px-4 lg:px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm lg:text-base"
                >
                  {loading ? "Creando Pedido..." : "Crear Pedido"}
                </button>

                <Link
                  href="/pedidos"
                  className="px-4 lg:px-6 py-2 lg:py-3 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center transition-all duration-200 font-medium text-sm lg:text-base"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
