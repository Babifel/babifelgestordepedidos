import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Pedido } from "@/models/Pedido";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener pedidos de los últimos 3 meses filtrados por la vendedora logueada
    const vendedora = session.user.email || session.user.name || '';
    const pedidos = await Pedido.findLastThreeMonthsByVendedora(vendedora);

    if (pedidos.length === 0) {
      return NextResponse.json(
        { error: "No tienes pedidos en los últimos 3 meses" },
        { status: 404 }
      );
    }

    // Preparar datos para Excel
    const excelData = pedidos.map((pedido, index) => {
      // Formatear productos
      const productosTexto = pedido.productos
        .map(
          (p) =>
            `${p.nombreProducto} (${p.cantidades} unidades) - ${p.descripcionProducto}`
        )
        .join("; ");

      // Formatear números telefónicos
      const telefonosTexto = pedido.numerosTelefonicos
        .map((t) => `${t.numero} (${t.tipo})`)
        .join("; ");

      return {
        "#": index + 1,
        "ID Pedido": pedido._id?.toString() || "",
        "Cliente": pedido.nombreCliente,
        "Productos": productosTexto,
        "Teléfonos": telefonosTexto,
        "Dirección": pedido.direccionDetallada,
        "Tipo Envío": pedido.tipoEnvio,
        "Precio Total": pedido.precioTotal,
        "Abono": pedido.abonodinero,
        "Saldo Pendiente": pedido.precioTotal - pedido.abonodinero,
        "Vendedora": pedido.vendedora,
        "Correo Vendedora": pedido.correoVendedora || "",
        "Fecha Creación": pedido.fechaCreacion.toLocaleDateString("es-CO"),
        "Fecha Entrega Deseada": pedido.fechaEntregaDeseada
          ? pedido.fechaEntregaDeseada.toLocaleDateString("es-CO")
          : "No especificada",
        "Estado": pedido.estado,
        "Observación de Entrega": pedido.observacionEntrega || "",
      };
    });

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 5 },   // #
      { wch: 25 },  // ID Pedido
      { wch: 20 },  // Cliente
      { wch: 50 },  // Productos
      { wch: 30 },  // Teléfonos
      { wch: 40 },  // Dirección
      { wch: 12 },  // Tipo Envío
      { wch: 15 },  // Precio Total
      { wch: 12 },  // Abono
      { wch: 15 },  // Saldo Pendiente
      { wch: 20 },  // Vendedora
      { wch: 25 },  // Correo Vendedora
      { wch: 15 },  // Fecha Creación
      { wch: 20 },  // Fecha Entrega Deseada
      { wch: 12 },  // Estado
      { wch: 40 },  // Observación de Entrega
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mis Pedidos Últimos 3 Meses");

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Crear nombre del archivo con fecha actual
    const fechaActual = new Date().toISOString().split('T')[0];
    const vendedoraNombre = vendedora.split('@')[0]; // Usar solo la parte antes del @ si es email
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