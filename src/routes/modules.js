// Importación de librerías necesarias
const express = require('express');
const router = express.Router();

/**
 * RUTAS PARA GESTIÓN DE MÓDULOS DE APRENDIZAJE
 * Este módulo gestiona el progreso de usuarios en módulos educativos
 * Incluye seguimiento de progreso y estado de quizzes/exámenes
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * Todas las operaciones están asociadas al usuario autenticado (request.user.id)
 */

/**
 * Ruta para obtener todos los módulos del usuario autenticado
 * GET /modules/
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * 
 * Retorna:
 * - Lista completa de módulos del usuario con:
 *   - module: ID o nombre del módulo
 *   - progress: Progreso del usuario en el módulo (0-100%)
 *   - quizz: Estado del quiz/examen del módulo
 */
router.route('/').get( async (request, response, onError ) => {
  try{
    // Obtener todos los módulos asociados al usuario autenticado
    // request.user.id viene del middleware validateToken
    var ret = await process.db.all("SELECT module, progress, quizz FROM Modules WHERE userid=?", request.user.id );
    
    // Respuesta con la lista completa de módulos
    response.json( {code: 0, modules: ret} );
    
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -6000, message:  error.message } );
  }      
});

/**
 * Ruta para obtener información de un módulo específico
 * GET /modules/:idmodule
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * 
 * Parámetros:
 * - idmodule: ID del módulo a consultar
 * 
 * Retorna:
 * - Información detallada del módulo específico:
 *   - module: ID del módulo
 *   - progress: Progreso actual del usuario (0-100%)
 *   - quizz: Estado del quiz/examen
 */
router.route('/:idmodule').get( async (request, response, onError ) => {
  try{    
    // Buscar módulo específico para el usuario autenticado
    var ret = await process.db.get("SELECT module, progress, quizz FROM Modules WHERE userid=? AND module=?", request.user.id, request.params.idmodule );
    
    // Verificar que el módulo existe para este usuario
    if(ret == null) throw {code: -6101, message: 'Cant found module'};
    
    // Respuesta con la información del módulo
    response.json( {
      code: 0, 
      module: ret.module, 
      progress: ret.progress, 
      quizz: ret.quizz
    });
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -6100, message:  error.message } );
  }      
});

/**
 * Ruta para actualizar el progreso de un módulo
 * GET /modules/progress/:idmodule/:slider
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * NOTA: Esta ruta debería ser POST/PUT para mayor semántica REST
 * 
 * Parámetros:
 * - idmodule: ID del módulo a actualizar
 * - slider: Nuevo valor de progreso (generalmente 0-100)
 * 
 * Comportamiento:
 * - Si el registro existe: actualiza el progreso
 * - Si no existe: crea un nuevo registro con el progreso
 * - Utiliza UPSERT (INSERT ... ON CONFLICT ... DO UPDATE)
 */
router.route('/progress/:idmodule/:slider').get( async (request, response, onError ) => {
  try{
    // Actualizar o insertar progreso del módulo usando UPSERT
    // ON CONFLICT maneja el caso donde ya existe un registro para userid+module
    var ret = await process.db.run("INSERT INTO Modules (userid, module, progress) VALUES (?, ?, ?) ON CONFLICT(userid, module) DO UPDATE SET progress=excluded.progress", 
      request.user.id, 
      request.params.idmodule, 
      request.params.slider
    );
    
    // Verificar que la operación fue exitosa
    if(ret.changes != 1) throw {code: -6201, message: 'Cant update progress'};
    
    // Respuesta de confirmación
    response.json( {code: 0} );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -6200, message:  error.message } );
  }      
});

/**
 * Ruta para actualizar el estado del quiz/examen de un módulo
 * GET /modules/quizz/:idmodule/:state
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * NOTA: Esta ruta debería ser POST/PUT para mayor semántica REST
 * 
 * Parámetros:
 * - idmodule: ID del módulo a actualizar
 * - state: Nuevo estado del quiz (ej: 0=no iniciado, 1=en progreso, 2=completado)
 * 
 * Comportamiento:
 * - Si el registro existe: actualiza el estado del quiz
 * - Si no existe: crea un nuevo registro con el estado del quiz
 * - Utiliza UPSERT (INSERT ... ON CONFLICT ... DO UPDATE)
 */
router.route('/quizz/:idmodule/:state').get( async (request, response, onError ) => {
  try{    
    // Actualizar o insertar estado del quiz usando UPSERT
    // ON CONFLICT maneja el caso donde ya existe un registro para userid+module
    var ret = await process.db.run("INSERT INTO Modules (userid, module, quizz) VALUES (?, ?, ?) ON CONFLICT(userid, module) DO UPDATE SET quizz=excluded.quizz", 
      request.user.id, 
      request.params.idmodule, 
      request.params.state
    );
    
    // Verificar que la operación fue exitosa
    if(ret.changes != 1) throw {code: -6301, message: 'Cant update quizz'};
    
    // Respuesta de confirmación
    response.json( {code: 0} );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -6300, message:  error.message } );
  }      
});

// Exportar el router con las rutas de gestión de módulos
module.exports = { default: router };