import Image from "next/image";
import Link from "next/link";
import Babifel from "@/assets/babifel-original.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6">
        <div className="flex items-center gap-3"></div>
        <div className="flex items-center">
          <Link
            href="/login"
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="flex items-center justify-center px-4 py-8 min-h-[calc(100vh-120px)]">
        <div className="max-w-7xl w-full">
          {/* Layout principal con dos columnas */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Columna izquierda - Título y descripción */}
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                Babifel
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  CRM
                </span>
              </h1>

              <p className="text-lg md:text-xl text-purple-200 max-w-lg">
                Nuestro sistema de gestión CRM funciona en todos los
                dispositivos y navegadores, así que solo tienes que configurarlo
                una vez y obtener resultados hermosos para siempre.
              </p>
            </div>

            {/* Columna derecha - Imagen del logo */}
            <div className="flex justify-center lg:justify-end">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-purple-500/20 shadow-2xl p-8">
                <Image
                  src={Babifel}
                  alt="Babifel Logo"
                  width={400}
                  height={300}
                  priority
                  className="rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Sección de funcionalidades */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Funcionalidades del{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  Sistema CRM
                </span>
              </h2>
              <p className="text-lg text-purple-200 max-w-2xl mx-auto">
                Gestiona tu negocio textil con herramientas modernas y
                eficientes
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/10 p-6 hover:bg-white/10 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Gestión de Pedidos
                </h3>
                <p className="text-sm text-purple-200">
                  Administra pedidos textiles de manera eficiente
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/10 p-6 hover:bg-white/10 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Control de Clientes
                </h3>
                <p className="text-sm text-purple-200">
                  Seguimiento detallado de transacciones
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/10 p-6 hover:bg-white/10 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Reportes y Análisis
                </h3>
                <p className="text-sm text-purple-200">
                  Insights valiosos para tu negocio
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/10 p-6 hover:bg-white/10 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Seguimiento en Tiempo Real
                </h3>
                <p className="text-sm text-purple-200">
                  Monitoreo continuo de pedidos
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <p className="text-purple-300 text-sm">
              © 2024 Babifel Fábrica Textil - Sistema CRM para gestión de
              pedidos Desarrollado por @juanperezzdp
            </p>
            <Link
              href="https://www.linkedin.com/in/juanperezjp"
              className="text-purple-300 text-sm"
            >
              Desarrollado por @juanperezzdp
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
