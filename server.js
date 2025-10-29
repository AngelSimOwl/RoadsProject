// Cargar variables de entorno desde archivo .env
require('dotenv').config();

// Importación de librerías necesarias
const express = require('express'); // Framework web para Node.js
const bodyParser = require('body-parser'); // Parser para cuerpos de requests HTTP
const validateToken = require('./src/middleware/validateToken'); // Middleware de autenticación JWT
const cors= require('cors'); // Middleware para manejo de CORS (Cross-Origin Resource Sharing)
const router = require('./src/router'); // Router principal con todas las rutas de la API
const db = require("./src/utils/sqlite.js"); // Inicialización de la base de datos SQLite

/**
 * SERVIDOR PRINCIPAL DE LA APLICACIÓN RENDERSIDE
 * 
 * Este servidor Express maneja:
 * - API REST para autenticación y gestión de usuarios
 * - Sistema de códigos VR temporales
 * - Gestión de módulos educativos y resultados
 * - Control de licencias y permisos de usuario
 * - Manejo de archivos de imágenes de perfil
 */

// Validación crítica: verificar que las variables de entorno necesarias estén presentes
if (!process.env.secret) {
  console.error('ERROR: SECRET environment variable is required for JWT signing');
  process.exit(1); // Terminar la aplicación si falta la clave secreta
}

// Crear instancia de la aplicación Express
const app = express();

// Configuración de CORS (Cross-Origin Resource Sharing) más segura
// Permite requests desde diferentes dominios de forma controlada
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*", // Origen permitido (usar variable de entorno en producción)
  exposedHeaders: 'auth-token', // Headers que el cliente puede leer
  credentials: true // Permitir envío de cookies y headers de autenticación
};

// Configuración de middlewares globales
app.use(bodyParser.json({ limit: '10mb' })); // Parser JSON con límite de 10MB para imágenes
app.use(cors(corsOptions)); // Aplicar configuración de CORS
app.use('/', router.restRouter ); // Montar todas las rutas de la API en la raíz

// Middleware para manejo de rutas no encontradas (404)
// Este middleware se ejecuta cuando ninguna ruta anterior coincide
app.use((req, res, next) => {
  const error = {
    code: -1,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  };
  
  // Log de la ruta no encontrada para debugging
  console.log(`404 - ${req.method} ${req.originalUrl}`);
  
  // Responder con error 404 y información detallada
  return res.status(404).json(error);
});

// Middleware global para manejo de errores
// Este middleware captura todos los errores no manejados en la aplicación
app.use((error, req, res, next) => {
  // Estructura estandarizada de respuesta de error
  const errorResponse = {
    code: error.code || -999, // Código de error personalizado o genérico
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };
  
  // Log detallado del error para debugging
  console.error(`Error in ${req.method} ${req.originalUrl}:`, {
    code: errorResponse.code,
    message: errorResponse.message,
    // Mostrar stack trace solo en desarrollo por seguridad
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  
  // Determinar código de estado HTTP basado en el tipo de error
  const statusCode = error.status || (error.code < 0 ? 400 : 500);
  return res.status(statusCode).json(errorResponse);
});

// Configuración del puerto del servidor
// Usa variable de entorno PORT o puerto 3000 por defecto
const PORT = process.env.PORT || 10000;

// Iniciar el servidor HTTP
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret: ${process.env.secret ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`🔗 CORS Origin: ${corsOptions.origin}`);
  console.log(`📊 Database: SQLite initialized`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Manejo de cierre graceful del servidor
// Responde a señales del sistema operativo para terminar de forma limpia
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully');
  
  // Cerrar el servidor HTTP de forma ordenada
  server.close(() => {
    console.log('✅ Server closed successfully');
    console.log('👋 Goodbye!');
    process.exit(0); // Terminar el proceso con código de éxito
  });
  
  // Timeout de seguridad: forzar cierre después de 10 segundos
  setTimeout(() => {
    console.log('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});
