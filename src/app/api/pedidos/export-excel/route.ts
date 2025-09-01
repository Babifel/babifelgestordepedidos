import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/lib/jwt";
import { Pedido, NumeroTelefonico, ProductoPedido } from "@/models/Pedido";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookies(cookieHeader);
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Fecha de inicio para filtrar pedidos (últimos 3 meses)
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 3);

    let pedidos: Pedido[] = [];

    // Verificar si el usuario es administrador o vendedora
    const esAdmin = payload.role === "administradora";
    const correoUsuario = payload.email || "";

    if (esAdmin) {
      // Si es administradora, obtener todos los pedidos
      pedidos = await Pedido.findAll();
    } else {
      // Si es vendedora, obtener solo sus pedidos usando el correo
      pedidos = await Pedido.findLastThreeMonthsByVendedora(correoUsuario);
    }

    // Filtrar pedidos para obtener los de aproximadamente tres meses
    let pedidosFiltrados: Pedido[];
    
    if (esAdmin) {
      // Para administradoras, aplicar filtro de fecha
      pedidosFiltrados = pedidos.filter((pedido: Pedido) => {
        const fechaPedido =
          pedido.fechaCreacion instanceof Date
            ? pedido.fechaCreacion
            : new Date(pedido.fechaCreacion);
        return fechaPedido >= fechaInicio;
      });
    } else {
      // Para vendedoras, el método ya filtra por fecha
      pedidosFiltrados = pedidos;
    }

    if (pedidosFiltrados.length === 0) {
      const mensaje = esAdmin
        ? "No hay pedidos registrados en los últimos 3 meses"
        : "No tienes pedidos registrados en los últimos 3 meses";

      return NextResponse.json({ error: mensaje }, { status: 404 });
    }

    // Preparar datos para Excel
    const excelData = pedidosFiltrados.map((pedido, index) => {
      // Formatear productos
      const productosTexto = pedido.productos
        .map(
          (p: ProductoPedido) =>
            `${p.nombreProducto} (${p.cantidades} unidades) - ${p.descripcionProducto}`
        )
        .join("; ");

      // Formatear números telefónicos
      const telefonosTexto = pedido.numerosTelefonicos
        .map((t: NumeroTelefonico) => `${t.numero} (${t.tipo})`)
        .join("; ");

      return {
        "#": index + 1,
        "ID Pedido": pedido._id?.toString() || "",
        Cliente: pedido.nombreCliente,
        Productos: productosTexto,
        Teléfonos: telefonosTexto,
        Dirección: pedido.direccionDetallada,
        "Tipo Envío": pedido.tipoEnvio,
        "Precio Total": pedido.precioTotal,
        Abono: pedido.abonodinero,
        "Saldo Pendiente": pedido.precioTotal - pedido.abonodinero,
        Vendedora: pedido.vendedora,
        "Correo Vendedora": pedido.correoVendedora || "",
        "Fecha Creación": pedido.fechaCreacion.toLocaleDateString("es-CO"),
        "Fecha Entrega Deseada": pedido.fechaEntregaDeseada
          ? pedido.fechaEntregaDeseada.toLocaleDateString("es-CO")
          : "No especificada",
        Estado: pedido.estado,
        "Observación de Entrega": pedido.observacionEntrega || "",
      };
    });

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 5 }, // #
      { wch: 25 }, // ID Pedido
      { wch: 20 }, // Cliente
      { wch: 50 }, // Productos
      { wch: 30 }, // Teléfonos
      { wch: 40 }, // Dirección
      { wch: 12 }, // Tipo Envío
      { wch: 15 }, // Precio Total
      { wch: 12 }, // Abono
      { wch: 15 }, // Saldo Pendiente
      { wch: 20 }, // Vendedora
      { wch: 25 }, // Correo Vendedora
      { wch: 15 }, // Fecha Creación
      { wch: 20 }, // Fecha Entrega Deseada
      { wch: 12 }, // Estado
      { wch: 40 }, // Observación de Entrega
    ];
    worksheet["!cols"] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Mis Pedidos Últimos 3 Meses"
    );

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Crear nombre del archivo con fecha actual
    const fechaActual = new Date().toISOString().split("T")[0];
    const nombreArchivo = `mis_pedidos_ultimos_3_meses_${fechaActual}.xlsx`;

    // Retornar archivo Excel
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error al exportar pedidos a Excel:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
