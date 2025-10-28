// Importación de librerías necesarias
const express = require('express');
const router = express.Router();

/**
 * RUTAS PARA CONSULTA DE RESULTADOS VR
 * Este módulo permite consultar resultados de simulaciones de Realidad Virtual
 * 
 * Requiere: 
 * - Token de autenticación válido (validateToken middleware)
 * - Permisos de supervisor (validateSupervisorLevel middleware)
 * 
 * Los resultados incluyen métricas de señales y distancias en experiencias VR
 */

/**
 * Ruta para obtener todos los resultados de simulaciones VR
 * GET /results/all
 * 
 * Requiere: 
 * - Token de autenticación válido (validateToken middleware)
 * - Permisos de supervisor (validateSupervisorLevel middleware)
 * 
 * Retorna:
 * Array de resultados con las siguientes métricas:
 * - date: Fecha y hora de la simulación
 * - scene: ID de la escena VR utilizada
 * - signals: Número total de señales en la simulación
 * - signalsOK: Número de señales detectadas correctamente
 * - distances: Número total de mediciones de distancia
 * - distancesOK: Número de mediciones de distancia correctas
 * 
 * NOTA: Utiliza la vista 'VRResults' que probablemente filtra/agrega datos
 *       de la tabla 'Results' para mostrar solo resultados de VR (platform=2)
 */
router.route('/all').get( async (request, response, onError ) => {
  try{
    // Log para debug (comentado en producción)
    // console.log("/results/all");
    
    // Obtener todos los resultados de simulaciones VR desde la vista especializada
    // VRResults es probablemente una vista que filtra Results WHERE platform=2
    var ret = await process.db.all("SELECT date, scene, signals, signalsOK, distances, distancesOK FROM VRResults");
    
    // Respuesta directa con el array de resultados
    // NOTA: No incluye el wrapper {code: 0, data: ret} como otras rutas
    response.json( ret );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -5000, message:  error.message } );
  }      
});

// Exportar el router con las rutas de consulta de resultados VR
module.exports = { default: router };