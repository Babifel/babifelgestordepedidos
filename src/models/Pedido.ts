import { Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export interface ProductoPedido {
  nombreProducto: string;
  descripcionProducto: string;
  cantidades: number;
  imagen?: string; // URL o base64 de la imagen
}

export interface NumeroTelefonico {
  numero: string;
  tipo: "principal" | "secundario" | "trabajo" | "casa" | "emergencia";
}

export interface Pedido {
  _id?: ObjectId;
  productos: ProductoPedido[];
  nombreCliente: string;
  numerosTelefonicos: NumeroTelefonico[];
  direccionDetallada: string;
  tipoEnvio: "nacional" | "bogota";
  precioTotal: number;
  abonodinero: number;
  vendedora: string; // Email o nombre de la vendedora
  correoVendedora?: string; // Email específico de la vendedora
  fechaCreacion: Date;
  fechaEntregaDeseada?: Date; // Fecha de entrega deseada por el cliente
  estado: "pendiente" | "fabricando" | "enviado" | "entregado" | "devolucion";
  observacionEntrega?: string; // Observación de cómo fue entregado el producto
}

export class PedidoModel {
  private static async getCollection(): Promise<Collection<Pedido>> {
    const client = await clientPromise;
    const db = client.db("yeny-crm");
    return db.collection<Pedido>("pedidos");
  }

  static async crearPedido(
    pedidoData: Omit<Pedido, "_id" | "fechaCreacion" | "estado">
  ): Promise<{ success: boolean; pedidoId?: string; error?: string }> {
    try {
      const collection = await PedidoModel.getCollection();

      const nuevoPedido: Omit<Pedido, "_id"> = {
        ...pedidoData,
        fechaCreacion: new Date(),
        estado: "pendiente",
      };

      const result = await collection.insertOne(nuevoPedido as Pedido);

      return {
        success: true,
        pedidoId: result.insertedId.toString(),
      };
    } catch (error) {
      console.error("Error al crear pedido:", error);
      return {
        success: false,
        error: "Error interno del servidor",
      };
    }
  }

  static async obtenerPedidosPorVendedora(
    vendedora: string
  ): Promise<Pedido[]> {
    try {
      const collection = await PedidoModel.getCollection();
      const pedidos = await collection
        .find({ vendedora })
        .sort({ fechaCreacion: -1 })
        .toArray();
      return pedidos;
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      return [];
    }
  }

  static async obtenerPedidosPorVendedoraPaginado(
    vendedora: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ pedidos: Pedido[]; total: number; totalPages: number }> {
    try {
      const collection = await PedidoModel.getCollection();
      const skip = (page - 1) * limit;

      // Crear criterios de búsqueda múltiples
      const criterios = [vendedora];
      const query = {
        $or: [
          { vendedora: { $in: criterios } },
          { correoVendedora: { $in: criterios } },
        ],
      };

      const [pedidos, total] = await Promise.all([
        collection
          .find(query)
          .sort({ fechaCreacion: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return { pedidos, total, totalPages };
    } catch (error) {
      console.error("Error al obtener pedidos paginados:", error);
      return { pedidos: [], total: 0, totalPages: 0 };
    }
  }

  static async obtenerPedidosPorVendedoraMultiple(
    criterios: string[]
  ): Promise<Pedido[]> {
    try {
      const collection = await PedidoModel.getCollection();
      const pedidos = await collection
        .find({ vendedora: { $in: criterios } })
        .sort({ fechaCreacion: -1 })
        .toArray();
      return pedidos;
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      return [];
    }
  }

  static async obtenerTodosPedidos(): Promise<Pedido[]> {
    try {
      const collection = await PedidoModel.getCollection();
      const pedidos = await collection
        .find({})
        .sort({ fechaCreacion: -1 })
        .toArray();
      return pedidos;
    } catch (error) {
      console.error("Error al obtener todos los pedidos:", error);
      return [];
    }
  }

  static async obtenerTodosPedidosPaginado(
    page: number = 1,
    limit: number = 20
  ): Promise<{ pedidos: Pedido[]; total: number; totalPages: number }> {
    try {
      const collection = await PedidoModel.getCollection();
      const skip = (page - 1) * limit;

      const [pedidos, total] = await Promise.all([
        collection
          .find({})
          .sort({ fechaCreacion: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments({}),
      ]);

      const totalPages = Math.ceil(total / limit);

      return { pedidos, total, totalPages };
    } catch (error) {
      console.error("Error al obtener todos los pedidos paginados:", error);
      return { pedidos: [], total: 0, totalPages: 0 };
    }
  }

  static async actualizarEstadoPedido(
    pedidoId: string,
    nuevoEstado: Pedido["estado"],
    observacionEntrega?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const collection = await PedidoModel.getCollection();
      
      // Preparar el objeto de actualización
      const updateData: Partial<Pick<Pedido, 'estado' | 'observacionEntrega'>> = { estado: nuevoEstado };
      
      // Solo agregar observación si se proporciona y el estado es "entregado" o "devolucion"
      if (observacionEntrega && (nuevoEstado === "entregado" || nuevoEstado === "devolucion")) {
        updateData.observacionEntrega = observacionEntrega;
      }
      
      const result = await collection.updateOne(
        { _id: new ObjectId(pedidoId) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: "Pedido no encontrado",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error al actualizar estado del pedido:", error);
      return {
        success: false,
        error: "Error interno del servidor",
      };
    }
  }

  static async obtenerPedidoPorId(pedidoId: string): Promise<Pedido | null> {
    try {
      const collection = await PedidoModel.getCollection();
      const pedido = await collection.findOne({ _id: new ObjectId(pedidoId) });
      return pedido;
    } catch (error) {
      console.error("Error al obtener pedido por ID:", error);
      return null;
    }
  }

  static async obtenerPedidoPorIdYVendedora(
    pedidoId: string,
    correoVendedora: string
  ): Promise<Pedido | null> {
    try {
      const collection = await PedidoModel.getCollection();
      const pedido = await collection.findOne({
        _id: new ObjectId(pedidoId),
        $or: [
          { correoVendedora: correoVendedora },
          { vendedora: correoVendedora },
        ],
      });
      return pedido;
    } catch (error) {
      console.error("Error al obtener pedido por ID y vendedora:", error);
      return null;
    }
  }

  static async obtenerPedidosUltimosTresMeses(): Promise<Pedido[]> {
    try {
      const collection = await PedidoModel.getCollection();
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
      
      const pedidos = await collection
        .find({
          fechaCreacion: {
            $gte: tresMesesAtras
          }
        })
        .sort({ fechaCreacion: -1 })
        .toArray();
      
      return pedidos;
    } catch (error) {
      console.error("Error al obtener pedidos de los últimos 3 meses:", error);
      return [];
    }
  }

  static async obtenerPedidosUltimosTresMesesPorVendedora(vendedora: string): Promise<Pedido[]> {
    try {
      const collection = await PedidoModel.getCollection();
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
      
      // Crear criterios de búsqueda múltiples
      const criterios = [vendedora];
      const query = {
        fechaCreacion: {
          $gte: tresMesesAtras
        },
        $or: [
          { vendedora: { $in: criterios } },
          { correoVendedora: { $in: criterios } },
        ],
      };
      
      const pedidos = await collection
        .find(query)
        .sort({ fechaCreacion: -1 })
        .toArray();
      
      return pedidos;
    } catch (error) {
      console.error("Error al obtener pedidos de los últimos 3 meses por vendedora:", error);
      return [];
    }
  }
}

// Alias para compatibilidad con el API
export const Pedido = {
  create: PedidoModel.crearPedido,
  findByVendedora: PedidoModel.obtenerPedidosPorVendedora,
  findByVendedoraPaginated: PedidoModel.obtenerPedidosPorVendedoraPaginado,
  findAll: PedidoModel.obtenerTodosPedidos,
  findAllPaginated: PedidoModel.obtenerTodosPedidosPaginado,
  updateEstado: PedidoModel.actualizarEstadoPedido,
  findById: PedidoModel.obtenerPedidoPorId,
  findByIdAndVendedora: PedidoModel.obtenerPedidoPorIdYVendedora,
  findLastThreeMonths: PedidoModel.obtenerPedidosUltimosTresMeses,
  findLastThreeMonthsByVendedora: PedidoModel.obtenerPedidosUltimosTresMesesPorVendedora,
};
