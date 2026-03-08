-- CreateTable
CREATE TABLE "DetalleComanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comandaId" TEXT NOT NULL,
    "platoId" TEXT,
    "platoNombre" TEXT,
    "cantidad" REAL NOT NULL,
    "precio" REAL NOT NULL,
    CONSTRAINT "DetalleComanda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Adelanto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empleadoId" TEXT,
    "empleado" TEXT,
    "monto" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AlertaStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredienteId" TEXT,
    "ingredienteNombre" TEXT,
    "cantidad_actual" REAL,
    "cantidad_minima" REAL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CategoriaGasto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DetalleRecetaPrimaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaPrimariaId" TEXT NOT NULL,
    "ingredienteId" TEXT,
    "cantidad" REAL NOT NULL,
    CONSTRAINT "DetalleRecetaPrimaria_recetaPrimariaId_fkey" FOREIGN KEY ("recetaPrimariaId") REFERENCES "RecetaPrimaria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetalleRecetaSecundaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaSecundariaId" TEXT NOT NULL,
    "ingredienteId" TEXT,
    "cantidad" REAL NOT NULL,
    CONSTRAINT "DetalleRecetaSecundaria_recetaSecundariaId_fkey" FOREIGN KEY ("recetaSecundariaId") REFERENCES "RecetaSecundaria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SesionUsuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT,
    "token" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiracion" DATETIME
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedor" TEXT,
    "total" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteNombre" TEXT,
    "monto" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "vencimiento" DATETIME
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "rol" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoriaId" TEXT,
    "categoriaNombre" TEXT,
    "monto" REAL NOT NULL,
    "descripcion" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HistorialCostoIngrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredienteId" TEXT NOT NULL,
    "costoAnterior" REAL,
    "costoNuevo" REAL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LogLimpieza" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ubicacion" TEXT,
    "realizadoPor" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT
);

-- CreateTable
CREATE TABLE "PagoCuentaPorCobrar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT
);

-- CreateTable
CREATE TABLE "PagoMixto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT,
    "monto" REAL NOT NULL,
    "metodo" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecetaPrimaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RecetaSecundaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TasaCambio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monedaOrigen" TEXT NOT NULL,
    "monedaDestino" TEXT NOT NULL,
    "tasa" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
