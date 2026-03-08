-- Create Usuario table
CREATE TABLE "Usuario" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'administrador',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default admin user (password: 1234)
INSERT INTO "Usuario" (id, email, password, nombre, rol, activo, createdAt)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    '$2b$10$1bb1xuJkWAog04KSGfIM7.Z.jxxoiWK70k0adu4GLU/vImvxMwFBq',
    'Administrador',
    'administrador',
    true,
    NOW()
);
