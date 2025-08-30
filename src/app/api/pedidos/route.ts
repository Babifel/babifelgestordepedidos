import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PedidoModel } from "@/models/Pedido";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea vendedora
    if (session.user.role !== "vendedora") {
      return NextResponse.json(
        { error: "Solo las vendedoras pueden crear pedidos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      productos,
      nombreCliente,
      numerosTelefonicos,
      direccionDetallada,
      tipoEnvio,
      precioTotal,
      abonodinero,
      fechaEntregaDeseada,
      vendedora,
      correoVendedora,
    } = body;

    // Validaciones básicas
    if (
      !productos ||
      !Array.isArray(productos) ||
      productos.length === 0 ||
      !nombreCliente ||
      !numerosTelefonicos ||
      !Array.isArray(numerosTelefonicos) ||
      numerosTelefonicos.length === 0 ||
      !direccionDetallada ||
      !tipoEnvio ||
      precioTotal === undefined ||
      abonodinero === undefined
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Validar cada producto
    for (const producto of productos) {
      if (
        !producto.nombreProducto ||
        !producto.cantidades ||
        producto.cantidades <= 0
      ) {
        return NextResponse.json(
          { error: "Todos los productos deben tener nombre y cantidad válida" },
          { status: 400 }
        );
      }
    }

    if (precioTotal < 0 || abonodinero < 0) {
      return NextResponse.json(
        { error: "El precio total y el abono no pueden ser negativos" },
        { status: 400 }
      );
    }

    if (abonodinero > precioTotal) {
      return NextResponse.json(
        { error: "El abono no puede ser mayor al precio total" },
        { status: 400 }
      );
    }

    if (!["nacional", "bogota"].includes(tipoEnvio)) {
      return NextResponse.json(
        { error: "Tipo de envío inválido" },
        { status: 400 }
      );
    }

    // Procesar productos
    interface ProductoInput {
      nombreProducto: string;
      descripcionProducto?: string;
      cantidades: string | number;
      imagen?: string;
    }
    
    const productosFormateados = productos.map((producto: ProductoInput) => ({
      nombreProducto: producto.nombreProducto,
      descripcionProducto: producto.descripcionProducto || "",
      cantidades: parseInt(producto.cantidades.toString()),
      imagen: producto.imagen || "",
    }));

    // Crear el pedido
    const vendedoraFinal = vendedora || session.user.email || session.user.name || "Vendedora";
    
    const resultado = await PedidoModel.crearPedido({
      productos: productosFormateados,
      nombreCliente,
      numerosTelefonicos,
      direccionDetallada,
      tipoEnvio,
      precioTotal: parseFloat(precioTotal),
      abonodinero: parseFloat(abonodinero),
      vendedora: vendedoraFinal,
      correoVendedora: correoVendedora || session.user.email,
      fechaEntregaDeseada: fechaEntregaDeseada ? new Date(fechaEntregaDeseada) : undefined,
    });

    if (!resultado.success) {
      return NextResponse.json(
        { error: resultado.error || "Error al crear el pedido" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Pedido creado exitosamente",
        pedidoId: resultado.pedidoId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en API de pedidos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener parámetros de paginación
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const paginated = searchParams.get('paginated') === 'true';

    let result;

    if (session.user.role === "administradora") {
      // Las administradoras pueden ver todos los pedidos
      if (paginated) {
        result = await PedidoModel.obtenerTodosPedidosPaginado(page, limit);
      } else {
        const pedidos = await PedidoModel.obtenerTodosPedidos();
        result = { pedidos };
      }
    } else if (session.user.role === "vendedora") {
      // Las vendedoras solo ven sus propios pedidos
      // Buscar por email, name o cualquier combinación
      const criteriosBusqueda = [
        session.user.email,
        session.user.name,
        session.user.email || session.user.name,
        session.user.name || session.user.email
      ].filter((criterio): criterio is string => Boolean(criterio));
      
      if (paginated && criteriosBusqueda.length > 0) {
        // Para vendedoras, usar el primer criterio válido para paginación
        result = await PedidoModel.obtenerPedidosPorVendedoraPaginado(criteriosBusqueda[0], page, limit);
      } else {
        const pedidos = await PedidoModel.obtenerPedidosPorVendedoraMultiple(criteriosBusqueda);
        result = { pedidos };
      }
    } else {
      return NextResponse.json({ error: "Rol no autorizado" }, { status: 403 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
