-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha_hora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_venta" REAL NOT NULL,
    "metodo_pago" TEXT,
    "total_cop" REAL,
    "total_ves" REAL,
    "monto_original" REAL,
    "moneda_original" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DetalleVenta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT NOT NULL,
    "platoId" TEXT,
    "platoNombre" TEXT,
    "cantidad" REAL NOT NULL,
    "precioUnitario" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cantidad_disponible" REAL NOT NULL DEFAULT 0,
    "cantidad_minima" REAL NOT NULL DEFAULT 0,
    "unidad_medida" TEXT,
    "unidad_receta" TEXT,
    "factor_conversion" REAL NOT NULL DEFAULT 1,
    "costo_por_unidad" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Plato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platoId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "ingredienteNombre" TEXT,
    "cantidad_requerida" REAL NOT NULL,
    CONSTRAINT "Receta_platoId_fkey" FOREIGN KEY ("platoId") REFERENCES "Plato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_comanda" TEXT NOT NULL,
    "mesa_numero" TEXT,
    "mesero_nombre" TEXT,
    "fecha_apertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "total_comanda" REAL NOT NULL DEFAULT 0
);
