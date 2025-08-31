'use client';

import { useState } from 'react';
import { FaFileExcel, FaSpinner } from 'react-icons/fa';

export default function DescargasDePedidos() {
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      setErrorMessage(null);
      
      const response = await fetch('/api/pedidos/export-excel', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.error) {
          // Mostrar mensaje específico del servidor
          if (errorData.error === "No tienes pedidos registrados en los últimos 3 meses") {
            throw new Error("No tienes pedidos registrados en los últimos 3 meses. Intenta crear algunos pedidos primero.");
          } else {
            throw new Error(`${errorData.error}`);
          }
        } else {
          throw new Error(`Error al descargar el archivo Excel (código: ${response.status})`);
        }
      }

      // Obtener el nombre del archivo desde el header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'pedidos_ultimos_3_meses.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al descargar Excel:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al descargar el archivo Excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-gray-900/95 backdrop-blur-sm shadow border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Descargas de Pedidos</h1>
              <p className="mt-1 text-sm text-purple-200">
                Descarga reportes de pedidos en formato Excel
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800/60 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-purple-500/20">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <FaFileExcel className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Exportar Pedidos a Excel
              </h3>
              <p className="text-sm text-purple-200 mb-6">
                Descarga todos tus pedidos disponibles en formato Excel.
                El archivo incluirá información detallada de cada uno de tus pedidos, clientes y productos.
              </p>
              
              <button
                onClick={handleDownloadExcel}
                disabled={downloadingExcel}
                className="inline-flex items-center px-6 py-3 border border-green-500/30 text-base font-medium rounded-lg text-white bg-green-600/80 hover:bg-green-600/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 backdrop-blur-sm"
              >
                {downloadingExcel ? (
                  <>
                    <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <FaFileExcel className="-ml-1 mr-3 h-5 w-5" />
                    Descargar Todos Mis Pedidos
                  </>
                )}
              </button>
              
              {errorMessage && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-white text-sm">
                  <p className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-800/60 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-purple-500/20">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500/80 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-purple-200 truncate">
                      Período de datos
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      Todos los pedidos
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-purple-500/20">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500/80 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">📋</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-purple-200 truncate">
                      Formato
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      Excel (.xlsx)
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-purple-500/20">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500/80 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">📁</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-purple-200 truncate">
                      Contenido
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      Pedidos completos
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/30 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6">
          <h4 className="text-lg font-medium text-blue-200 mb-3">
            Información sobre el archivo Excel
          </h4>
          <ul className="text-sm text-blue-100 space-y-2">
            <li>• El archivo incluye todos tus pedidos de los últimos 3 meses</li>
            <li>• Contiene información detallada: ID, cliente, productos, cantidades, precios y fechas</li>
            <li>• Las columnas están optimizadas para facilitar el análisis de datos</li>
            <li>• El archivo se descarga automáticamente al hacer clic en el botón</li>
          </ul>
        </div>
      </div>
    </div>
  );
}