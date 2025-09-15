import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookies, verifyToken } from '@/lib/jwt';
import { Pedido } from '../../../../models/Pedido';
import { ObjectId } from 'mongodb';

// GET - Obtener un pedido específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookies(cookieHeader);
    const payload = verifyToken(token || '');
    
    if (!payload?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de pedido inválido' },
        { status: 400 }
      );
    }

    // Solo administradoras pueden ver cualquier pedido
    // Las vendedoras solo pueden ver sus propios pedidos
    let pedido;
    if (payload.role === 'administradora') {
      pedido = await Pedido.findById(id);
    } else if (payload.role === 'vendedora') {
      pedido = await Pedido.findByIdAndVendedora(id, payload.email!);
    } else {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ pedido });
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar el estado de un pedido
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookies(cookieHeader);
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo administradoras pueden actualizar el estado de los pedidos
    if (payload.role !== 'administradora') {
      return NextResponse.json(
        { error: 'Solo las administradoras pueden actualizar el estado de los pedidos' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de pedido inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { estado, observacionEntrega } = body;

    // Validar que el estado sea válido
    const estadosValidos = ['pendiente', 'fabricando', 'enviado', 'entregado', 'devolucion'];
    if (!estado || !estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido. Estados válidos: ' + estadosValidos.join(', ') },
        { status: 400 }
      );
    }

    // Validar observación para estados finales
    if ((estado === 'entregado' || estado === 'devolucion') && observacionEntrega && observacionEntrega.trim().length > 500) {
      return NextResponse.json(
        { error: 'La observación no puede exceder 500 caracteres' },
        { status: 400 }
      );
    }

    // Actualizar el estado del pedido
    const pedidoActualizado = await Pedido.updateEstado(id, estado, observacionEntrega);

    if (!pedidoActualizado) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Estado actualizado correctamente',
      pedido: pedidoActualizado 
    });
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar todos los datos de un pedido
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookies(cookieHeader);
    const payload = verifyToken(token || '');
    
    if (!payload?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de pedido inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      numerosTelefonicos,
      direccionDetallada,
      tipoEnvio,
      vendedora,
      precioTotal,
      abonodinero,
      fechaEntregaDeseada,
      observacionEntrega,
      productos
    } = body;

    // Validaciones básicas
    if (!numerosTelefonicos || !Array.isArray(numerosTelefonicos) || numerosTelefonicos.length === 0) {
      return NextResponse.json(
        { error: 'Debe tener al menos un número telefónico' },
        { status: 400 }
      );
    }

    if (!direccionDetallada?.trim()) {
      return NextResponse.json(
        { error: 'La dirección detallada es requerida' },
        { status: 400 }
      );
    }

    if (!['nacional', 'bogota'].includes(tipoEnvio)) {
      return NextResponse.json(
        { error: 'Tipo de envío inválido' },
        { status: 400 }
      );
    }

    if (!vendedora?.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la vendedora es requerido' },
        { status: 400 }
      );
    }

    if (typeof precioTotal !== 'number' || precioTotal <= 0) {
      return NextResponse.json(
        { error: 'El precio total debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    if (typeof abonodinero !== 'number' || abonodinero < 0) {
      return NextResponse.json(
        { error: 'El abono debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    if (abonodinero > precioTotal) {
      return NextResponse.json(
        { error: 'El abono no puede ser mayor al precio total' },
        { status: 400 }
      );
    }

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json(
        { error: 'Debe tener al menos un producto' },
        { status: 400 }
      );
    }

    // Validar productos
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      if (!producto.nombreProducto?.trim()) {
        return NextResponse.json(
          { error: `El producto ${i + 1} debe tener un nombre` },
          { status: 400 }
        );
      }
      if (typeof producto.cantidades !== 'number' || producto.cantidades <= 0) {
        return NextResponse.json(
          { error: `El producto ${i + 1} debe tener una cantidad mayor a 0` },
          { status: 400 }
        );
      }
    }

    // Validar números telefónicos
    const tiposValidos = ['principal', 'secundario', 'trabajo', 'casa', 'emergencia'];
    for (let i = 0; i < numerosTelefonicos.length; i++) {
      const telefono = numerosTelefonicos[i];
      if (!telefono.numero?.trim()) {
        return NextResponse.json(
          { error: `El teléfono ${i + 1} debe tener un número` },
          { status: 400 }
        );
      }
      if (!tiposValidos.includes(telefono.tipo)) {
        return NextResponse.json(
          { error: `El teléfono ${i + 1} tiene un tipo inválido` },
          { status: 400 }
        );
      }
    }

    // Verificar permisos: solo administradoras pueden editar cualquier pedido
    // Las vendedoras solo pueden editar sus propios pedidos
    let pedidoExistente;
    if (payload.role === 'administradora') {
      pedidoExistente = await Pedido.findById(id);
    } else if (payload.role === 'vendedora') {
      pedidoExistente = await Pedido.findByIdAndVendedora(id, payload.email!);
    } else {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido no encontrado o sin permisos para editarlo' },
        { status: 404 }
      );
    }

    // Actualizar el pedido
    const datosActualizados = {
      numerosTelefonicos,
      direccionDetallada,
      tipoEnvio,
      vendedora,
      precioTotal,
      abonodinero,
      fechaEntregaDeseada: fechaEntregaDeseada || null,
      observacionEntrega: observacionEntrega || null,
      productos
    };

    const pedidoActualizado = await Pedido.updateById(id, datosActualizados);

    if (!pedidoActualizado) {
      return NextResponse.json(
        { error: 'Error al actualizar el pedido' },
        { status: 500 }
      );
    }

    return NextResponse.json(pedidoActualizado);
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}