// Un único objeto mutable importado por todos los módulos. Reemplaza el
// localStorage de la demo original: aquí solo vive en memoria, la fuente
// de verdad real es Firestore (ver negocio.js → suscribirDatos()).
export const state = {
  businessId: null,
  negocio: null,      // {nombre, tipo, ownerUid}
  miRol: null,         // 'dueno' | 'cajero' | 'contador'
  productos: [],
  clientes: [],
  miembros: [],
  cajaEstado: { abierta: false, montoInicial: 0, abiertaEn: null },
  movimientos: [],
  carrito: [],          // {id, nombre, precio, cantidad}
  tabActual: 'venta',
  unsub: { productos: null, clientes: null, caja: null, movs: null, miembros: null },
};
