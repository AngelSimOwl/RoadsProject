// Importación de librerías necesarias
const express = require('express');
const validateToken = require('./middleware/validateToken').validateToken; // Middleware de autenticación JWT
const { validateSupervisorLevel, validateMasterLevel} = require('./middleware/validateLevel'); // Middlewares de autorización por nivel
const restRouter = express.Router(); // Router principal de la API REST

/**
 * CONFIGURACIÓN DEL ROUTER PRINCIPAL DE LA API
 * 
 * Este archivo define todas las rutas principales de la aplicación y sus middlewares:
 * 
 * Estructura de códigos de error por módulo:
 * - auth: -1000 a -1999 (Autenticación y registro)
 * - user: -2000 a -2999 (Perfil y datos de usuario)
 * - codes: -3000 a -3999 (Códigos VR temporales)
 * - license: -4000 a -4999 (Gestión de licencias - requiere supervisor)
 * - results: -5000 a -5999 (Resultados VR - requiere supervisor)
 * - modules: -6000 a -6999 (Módulos educativos)
 * 
 * Niveles de acceso:
 * - Sin middleware: Acceso público
 * - validateToken: Requiere autenticación
 * - validateSupervisorLevel: Requiere permisos de supervisor
 * - validateMasterLevel: Requiere permisos de administrador máximo
 */

// RUTA DE AUTENTICACIÓN - Acceso público
// ERROR_RANGE: -1000 a -1999
// Funciones: login, registro, recuperación de contraseña
// Middleware: Ninguno (acceso público)
restRouter.use('/auth', require('./routes/auth').default );

// RUTA DE USUARIO - Requiere autenticación
// ERROR_RANGE: -2000 a -2999
// Funciones: perfil, códigos VR, cambio de datos, resultados personales
// Middleware: validateToken (requiere JWT válido)
restRouter.use('/user', validateToken, require('./routes/user').default );

// RUTA DE CÓDIGOS VR - Acceso público
// ERROR_RANGE: -3000 a -3999
// Funciones: validar códigos, obtener imágenes, cerrar sesiones VR
// Middleware: Ninguno (los códigos VR son temporales y auto-validados)
restRouter.use('/codes', require('./routes/codes').default ); 

// RUTA DE GESTIÓN DE LICENCIAS - Requiere permisos de supervisor
// ERROR_RANGE: -4000 a -4999
// Funciones: listar usuarios, extender/revocar licencias, cambiar niveles
// Middleware: validateToken + validateSupervisorLevel (solo supervisores)
restRouter.use('/license', validateToken, validateSupervisorLevel, require('./routes/license').default );

// RUTA DE RESULTADOS VR - Requiere permisos de supervisor
// ERROR_RANGE: -5000 a -5999
// Funciones: consultar todos los resultados de simulaciones VR
// Middleware: validateToken + validateSupervisorLevel (datos sensibles)
restRouter.use('/results', validateToken, validateSupervisorLevel, require('./routes/results').default );

// RUTA DE MÓDULOS EDUCATIVOS - Requiere autenticación
// ERROR_RANGE: -6000 a -6999
// Funciones: progreso en cursos, estado de quizzes, seguimiento educativo
// Middleware: validateToken (cada usuario ve solo su progreso)
restRouter.use('/modules', validateToken, require('./routes/modules').default );

// Exportar el router principal para uso en server.js
module.exports = { restRouter : restRouter };