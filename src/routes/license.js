// Importación de librerías necesarias
const express = require('express');
const router = express.Router();

/**
 * RUTAS PARA GESTIÓN DE LICENCIAS Y USUARIOS
 * Este módulo requiere permisos de supervisor o superior
 * Permite administrar licencias, niveles de usuario y consultar la lista de usuarios
 */

/**
 * Ruta para obtener lista paginada de usuarios
 * GET /license/userslist/:offset/:limit
 * 
 * Requiere: Permisos de supervisor (validateSupervisorLevel middleware)
 * 
 * Parámetros:
 * - offset: Número de registros a omitir (para paginación)
 * - limit: Número máximo de registros a retornar
 * 
 * Retorna: Lista de usuarios con id, email, name, license, level
 */
router.route('/userslist/:offset/:limit').get( async (request, response, onError ) => {
  try{
    // Obtener lista paginada de usuarios con información básica y de licencia
    var ret = await process.db.all("SELECT id, email, name, license, level FROM Users LIMIT ? OFFSET ?", request.params.limit, request.params.offset );
    
    // Respuesta con la lista de usuarios
    return response.json( {code: 0, users: ret } );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -4000, message:  error.message } );
  }      
});

/**
 * Ruta para extender la licencia de un usuario
 * GET /license/extend/:userid/:days
 * 
 * Requiere: Permisos de supervisor (validateSupervisorLevel middleware)
 * 
 * Parámetros:
 * - userid: ID del usuario al que extender la licencia
 * - days: Número de días a agregar a la licencia actual
 * 
 * Extiende la fecha de licencia actual sumando los días especificados
 */
router.route('/extend/:userid/:days').get( async (request, response, onError ) => {
  try{    
    // Extender la licencia actual sumando los días especificados
    // La función DATETIME de SQLite suma los días a la fecha de licencia existente
    var ret = await process.db.run("UPDATE Users SET license=DATETIME(license, ?) WHERE id=?", "+"+request.params.days+" days", request.params.userid );
    if(ret.changes != 1) throw {code: -4101, message: 'Cant update license'};
    
    // Obtener la nueva fecha de licencia para confirmar el cambio
    var ret = await process.db.get("SELECT license FROM Users WHERE id=?", request.params.userid );
    
    // Respuesta con la nueva fecha de licencia
    return response.json( {code: 0, license: ret.license } );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -4100, message:  error.message } );
  }      
});

/**
 * Ruta para establecer una nueva licencia desde la fecha actual
 * GET /license/set/:userid/:days
 * 
 * Requiere: Permisos de supervisor (validateSupervisorLevel middleware)
 * 
 * Parámetros:
 * - userid: ID del usuario al que establecer la licencia
 * - days: Número de días desde HOY para la nueva licencia
 * 
 * Diferencia con /extend: Esta ruta establece la licencia desde HOY + días,
 * ignorando la fecha de licencia anterior
 */
router.route('/set/:userid/:days').get( async (request, response, onError ) => {
  try{    
    // Establecer nueva licencia desde la fecha actual + días especificados
    // datetime('now') toma la fecha actual como punto de partida
    var ret = await process.db.run("UPDATE Users SET license=DATETIME(datetime('now'), ?) WHERE id=?", "+"+request.params.days+" days", request.params.userid );
    if(ret.changes != 1) throw {code: -4201, message: 'Cant update license'};
    
    // Obtener la nueva fecha de licencia para confirmar el cambio
    var ret = await process.db.get("SELECT license FROM Users WHERE id=?", request.params.userid );
    
    // Respuesta con la nueva fecha de licencia
    return response.json( {code: 0, license: ret.license } );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -4200, message:  error.message } );
  }      
});

/**
 * Ruta para revocar/suspender la licencia de un usuario
 * GET /license/revoque/:userid
 * 
 * Requiere: Permisos de supervisor (validateSupervisorLevel middleware)
 * 
 * Parámetros:
 * - userid: ID del usuario al que revocar la licencia
 * 
 * Establece la fecha de licencia a '2020-01-01' (fecha en el pasado)
 * efectivamente revocando/suspendiendo el acceso del usuario
 */
router.route('/revoque/:userid').get( async (request, response, onError ) => {
  try{
    // Revocar licencia estableciendo una fecha en el pasado
    // '2020-01-01 0:00:00' es anterior a cualquier fecha actual
    var ret = await process.db.run("UPDATE Users SET license='2020-01-01 0:00:00' WHERE id=?", request.params.userid );
    if(ret.changes != 1) throw {code: -4301, message: 'Cant update license'};
    
    // Obtener la fecha de licencia revocada para confirmar el cambio
    var ret = await process.db.get("SELECT license FROM Users WHERE id=?", request.params.userid );
    
    // Respuesta con la fecha de licencia revocada
    return response.json( {code: 0, license: ret.license } );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -4300, message:  error.message } );
  }      
});

/**
 * Ruta para cambiar el nivel de acceso de un usuario
 * GET /license/level/:userid/:level
 * 
 * Requiere: Permisos de supervisor (validateSupervisorLevel middleware)
 * 
 * Parámetros:
 * - userid: ID del usuario al que cambiar el nivel
 * - level: Nuevo nivel de acceso (0=usuario, 1=supervisor, etc.)
 * 
 * NOTA: La respuesta retorna 'license' pero debería retornar 'level'
 * para ser consistente con la operación realizada
 */
router.route('/level/:userid/:level').get( async (request, response, onError ) => {
  try{
    // Actualizar el nivel de acceso del usuario
    var ret = await process.db.run("UPDATE Users SET level=? WHERE id=?", request.params.level, request.params.userid );
    if(ret.changes != 1) throw {code: -4401, message: 'Cant update user level'};
    
    // FIXME: Esta consulta debería obtener 'level' en lugar de 'license'
    // ya que estamos actualizando el nivel, no la licencia
    var ret = await process.db.get("SELECT license FROM Users WHERE id=?", request.params.userid );
    
    // TODO: Cambiar a {code: 0, level: ret.level} para ser consistente
    return response.json( {code: 0, license: ret.license } );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -4400, message:  error.message } );
  }      
});

// Exportar el router con las rutas de gestión de licencias
module.exports = { default: router };