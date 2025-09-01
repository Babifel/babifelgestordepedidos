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