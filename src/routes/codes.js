// Importación de librerías necesarias
const express = require('express');
const router = express.Router();

/**
 * RUTAS PARA MANEJO DE CÓDIGOS
 * Este módulo gestiona códigos temporales para acceso a escenas y resultados
 */

/**
 * Ruta para validar un código y obtener información asociada
 * GET /codes/validate/:code
 * 
 * Retorna:
 * - Información del usuario propietario del código
 * - Escena asociada al código
 * - Fecha de creación
 * - Datos de resultados si existen (plataforma 2)
 */
router.route('/validate/:code').get( async (request, response, onError ) => {
  try{
    // Log para debug (comentado en producción)
    //console.log("/codes/validate/", request.params.code);
    
    // Buscar código en la base de datos con información del usuario
    var ret = await process.db.get("SELECT Users.id, Users.name, Codes.scene, Codes.created FROM Codes INNER JOIN Users ON Codes.userid=Users.id WHERE Codes.code=?", request.params.code);
    if(ret==null) throw {code: -3001, message: 'Cant find the code '+request.params.code};
    
    // Buscar resultados asociados para la plataforma 2 (específica del sistema)
    var ret2 = await process.db.get("SELECT data FROM Results WHERE userid=? AND platform=2 AND scene=?", ret.id, ret.scene);
    
    // Respuesta con toda la información del código
    response.json( {
      code: 0, 
      name: ret.name, 
      scene: ret.scene, 
      created: ret.created, 
      data: ret2==null ? null : ret2.data 
    });
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -3000, message:  error.message } );
  }      
});

/**
 * Ruta para obtener la imagen asociada a un código
 * GET /codes/image/:code
 * 
 * Busca el archivo de imagen del usuario asociado al código
 * Las imágenes se almacenan en /app/images/ con el formato {userid}.img
 */
router.route('/image/:code').get( async (request, response, onError ) => {
  try{
    // Log para debug (comentado en producción)
    // console.log("codes/image/", request.params.code);
    
    // Buscar el ID del usuario asociado al código
    var ret = await process.db.get("SELECT userid FROM Codes WHERE Codes.code=?", request.params.code);
    
    // Log para debugging - TODO: remover en producción
    console.log("ret", request.params.code, "->", ret);
    
    if(ret==null) throw {code: -3101, message: 'Cant find the code '+request.params.code};
    
    // Enviar el archivo de imagen correspondiente al usuario
    // NOTA: Verificar que la ruta sea segura y que el archivo exista
    return response.sendFile("/app/images/"+ret.userid+".img");
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -3100, message:  error.message } );
  }      
});

/**
 * Ruta para cerrar un código y guardar los resultados
 * POST /codes/close/:code
 * 
 * Body esperado:
 * {
 *   signals: [{result: boolean}, ...],    // Array de señales con resultado
 *   distances: [{result: boolean}, ...]   // Array de distancias con resultado
 * }
 * 
 * Proceso:
 * 1. Cuenta señales y distancias exitosas
 * 2. Elimina resultados previos del mismo usuario/escena
 * 3. Guarda nuevos resultados
 * 4. Elimina el código (excepto código especial "778199")
 */
router.route('/close/:code').post( async (request, response, onError ) => {
  try{    
    // Log para debug (comentado en producción)
    // console.log("/codes/close/", request.params.code, request.body);
    
    // Analizar y contar señales exitosas
    var signalsOK = 0;
    var signals = request.body.signals;
    for(var i = 0; i < signals.length; ++i){
      if( signals[i].result )
          signalsOK++;
    }
    
    // Analizar y contar distancias exitosas
    var distancesOK = 0;
    var distances = request.body.distances;
    for(var i = 0; i < distances.length; ++i){
      if( distances[i].result )
          distancesOK++;
    }
    
    // Eliminar resultados previos del mismo usuario/escena (plataforma 2)
    // NOTA: Esto debería ser un UPSERT pero SQLite puede no soportarlo en esta versión
    var ret = await process.db.run("DELETE FROM Results WHERE ROWID IN ( SELECT r.ROWID FROM Results r INNER JOIN Codes c ON (r.userid = c.userid AND r.platform = 2 AND r.scene = c.scene) WHERE c.code=?)", request.params.code);
    
    // Insertar nuevos resultados en la base de datos
    var ret = await process.db.run("INSERT INTO Results (date, platform, userid, scene, signals, signalsOK, distances, distancesOK, data) SELECT datetime('now'), 2, userid, scene, ?, ?, ?, ?, ? FROM Codes WHERE code=?",
        request.body.signals.length, signalsOK,
        request.body.distances.length, distancesOK,
        JSON.stringify(request.body), request.params.code );
    
    if(ret.changes != 1) throw {code: -3202, message: 'Cant find the code '+request.params.code};
    
    // Eliminar el código después del uso (excepto código especial para testing)
    // NOTA: "778199" parece ser un código especial que no se elimina
    if(request.params.code != "778199"){
      var ret = await process.db.run("DELETE FROM Codes WHERE code=?", request.params.code);
      if(ret.changes != 1) throw {code: -3203, message: 'Cant find the code '+request.params.code};
    }
    
    // Respuesta exitosa
    response.json( {code: 0, message: "Code "+request.params.code+" closed." } );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -3200, message:  error.message } );
  }      
});

// Exportar el router con las rutas de códigos
module.exports = { default: router };
