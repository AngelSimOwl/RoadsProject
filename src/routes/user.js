// Importación de librerías necesarias
const express = require('express');
const router = express.Router();
const jwt= require('../helpers/jwt'); // Helper para manejo de JSON Web Tokens
const fs = require("fs").promises; // Sistema de archivos para manejo de imágenes

/**
 * RUTAS PARA GESTIÓN DE PERFIL DE USUARIO
 * Este módulo maneja todas las operaciones relacionadas con el usuario autenticado:
 * - Información de perfil y renovación de tokens
 * - Generación de códigos VR temporales
 * - Actualización de datos personales (nombre, contraseña)
 * - Manejo de imágenes de perfil
 * - Consulta y envío de resultados de simulaciones (VR y Web)
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * Todas las operaciones están asociadas al usuario autenticado (request.user.id)
 */

/**
 * Ruta principal del usuario - Obtener información y renovar token
 * GET /user/
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * 
 * Funciones:
 * 1. Validar que el usuario existe y tiene acceso
 * 2. Actualizar timestamp de último login
 * 3. Generar un nuevo token JWT con validez de 10 días
 * 4. Retornar información del usuario (nombre, nivel, licencia)
 * 
 * NOTA: Comprobación de licencias deshabilitada temporalmente
 */
router.route('/').get( async (request, response, onError ) => {
  try{
    /* Código anterior comentado - validación simplificada
    var ret = await process.db.get("SELECT name FROM Users WHERE id=?", request.user.id);
    if(ret==null)  throw {code: -2003, message: 'User not found'};
    */  
    
    // Obtener información del usuario autenticado
    // NOTA: Comprobación de licencias eliminada temporalmente
    // var ret = await process.db.get("SELECT name, level, license FROM Users WHERE id=? AND license>datetime('now')", request.user.id);
    var ret = await process.db.get("SELECT name, level, license FROM Users WHERE id=?", request.user.id);
    if(ret == null)  throw {code: -2002, message: 'User not found or Bad license'};
    
    // Actualizar timestamp del último login
    var ret2 = await process.db.run("UPDATE Users SET lastLogin=datetime('now') WHERE id=?", request.user.id);
    if(ret2.changes != 1) throw {code: -2001, message: 'Cant update lastLogin'};
    
    // Generar nuevo token JWT y retornar información del usuario
    return response.header('auth-token', jwt.issue({id:request.user.id, level: ret.level},'10d'))
                  .json({name:ret.name, level:ret.level, license:ret.license});
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -2000, message:  error.message } );
  }      
});

/**
 * Ruta para generar códigos VR temporales
 * GET /user/code/:scene
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * 
 * Parámetros:
 * - scene: ID de la escena VR para la cual generar el código
 * 
 * Funcionalidad:
 * 1. Verifica si ya existe un código no usado para el usuario y escena
 * 2. Si existe, lo retorna
 * 3. Si no existe, genera un nuevo código numérico de 6 dígitos
 * 4. Guarda el código en la base de datos marcado como no usado
 * 
 * Los códigos VR permiten acceso temporal a experiencias VR específicas
 */
router.route('/code/:scene').get( async (request, response, onError ) => {
  try{
    // Log para debug - TODO: remover en producción
    console.log("/user/code/", request.params.scene);
    
    // Verificar si ya existe un código no usado para este usuario y escena
    var res = await process.db.get("SELECT code FROM Codes WHERE userid=? AND scene=? AND used=0", request.user.id, request.params.scene );
    if(res != null) return response.json( {code: 0, vrcode: res.code} );
    
    // Generar nuevo código numérico aleatorio de 6 dígitos
    const characters = "0123456789";
    const charactersLength = characters.length;
    var code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    // Guardar el nuevo código en la base de datos
    var res = await process.db.run("INSERT INTO Codes (code, used, created, userid, scene) VALUES (?, 0, datetime('now'), ?, ?)", 
      code, request.user.id, request.params.scene);
    if( res.changes != 1)  throw {code: -2101, message: 'Cant create code'};
    
    // Retornar el nuevo código generado
    return response.json( {code: 0, vrcode: code} );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -2100, message:  error.message } );
  }      
});

/**
 * Ruta para actualizar el nombre del usuario
 * GET /user/name/:name
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * NOTA: Debería ser POST/PUT para mejor semántica REST
 * 
 * Parámetros:
 * - name: Nuevo nombre para el usuario
 * 
 * TODO: Agregar validación de longitud y caracteres permitidos
 */
router.route('/name/:name').get( async (request, response, onError ) => {
  try{
    // Log para debug (comentado en producción)
    // console.log("/user/name/", request.params.name);
    
    // Actualizar el nombre del usuario autenticado
    var ret = await process.db.run("UPDATE Users SET name=? WHERE id=?", request.params.name, request.user.id);
    if( ret.changes != 1)  throw {code: -2201, message: 'Cant update user name'};
    
    // Confirmación de actualización exitosa
    return response.json( {code: 0 } );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -2200, message:  error.message } );
  }      
});

/**
 * Ruta para cambiar la contraseña del usuario
 * GET /user/password/:newpass/:oldpass
 * 
 * Requiere: Token de autenticación válido (validateToken middleware)
 * NOTA: Debería ser POST para mejor seguridad y semántica REST
 * 
 * Parámetros:
 * - newpass: Nueva contraseña
 * - oldpass: Contraseña actual para verificación
 * 
 * PROBLEMA DE SEGURIDAD: Las contraseñas aparecen en logs y URL
 * TODO: Cambiar a POST con body, hashear contraseñas
 */
router.route('/password/:newpass/:oldpass').get( async (request, response, onError ) => {
  try{
    // Log peligroso - expone contraseñas en logs - TODO: ELIMINAR
    console.log("/user/password/", request.params.newpass, request.params.oldpass);
    
    // Verificar que la contraseña actual es correcta
    var ret = await process.db.get("SELECT id FROM Users WHERE id=? AND password==?", request.user.id, request.params.oldpass);
    if(ret == null) throw {code: -2302, message: 'Bad password'};
    
    // Actualizar con la nueva contraseña
    // PROBLEMA: No se hashea la nueva contraseña
    var ret = await process.db.run("UPDATE Users SET password=? WHERE id=?", request.params.newpass, request.user.id);
    if(ret.changes != 1) throw {code: -2301, message: 'Cant set new password'};
    
    // Confirmación de cambio exitoso
    return response.json({code: 0} );
  }catch(error){
    // Manejo de errores centralizado
    onError( {code: error.code || -2300, message:  error.message } );
  }      
});

router.route('/image').get( async (request, response, onError ) => {
  try{
//    console.log("/user/image");
    return response.setHeader("Content-Type", "image/jpeg").sendFile("/app/images/"+request.user.id+".img");
  }catch(error){
    onError( {code: error.code || -2400, message:  error.message } );
  }      
});

router.route('/image').post( async (request, response, onError ) => {
  try{
    const chunks = [];
    request.on('data', (chunk)=>{ chunks.push(chunk); });    
    request.on('end', async () => {
      const data = Buffer.concat(chunks);
      if(data.length>300*1024 ) throw {code: -2501, message: 'The image cannot exceed the size of 200 Kb.'};
      await fs.writeFile("./images/"+request.user.id+".img", data);
      response.json( {code:0, length: data.length } );
    });
  }catch(error){
    onError( {code: error.code || -2500, message:  error.message } );
  }      
});

router.route('/results/vr').get( async (request, response, onError ) => {
  try{    
//    console.log("/user/results/vr");
    var ret = await process.db.all("SELECT date, scene, signals, signalsOK, distances, distancesOK FROM Results WHERE userid=? AND platform=2 ", request.user.id );
    return response.json( { code:0, results:ret} );
  }catch(error){
    onError( {code: error.code || -2600, message:  error.message } );
  }      
});

router.route('/results/vr/:scene').get( async (request, response, onError ) => {
  try{    
//    console.log("/user/results/vr/",request.params.scene);
    var ret = await process.db.get("SELECT date, signals, signalsOK, distances, distancesOK, data FROM Results WHERE userid=? AND platform=2 AND scene=?", request.user.id, request.params.scene );
    return response.json( { code:0, date:ret.date, signals:ret.signals, signalsOK:ret.signalsOK,distances:ret.distances, distancesOK:ret.distancesOK, data:ret.data } );
  }catch(error){
    onError( {code: error.code || -2600, message:  error.message } );
  }      
});

router.route('/results/web').get( async (request, response, onError ) => {
  try{    
    var ret = await process.db.all("SELECT date, scene, signals, signalsOK, distances, distancesOK FROM Results WHERE userid=? AND platform=1 ", request.user.id );
    return response.json( { code:0, results:ret} );
  }catch(error){
    onError( {code: error.code || -2700, message:  error.message } );
  }      
});

router.route('/results/web/:scene').get( async (request, response, onError ) => {
  try{    
    var ret = await process.db.get("SELECT date, signals, signalsOK, distances, distancesOK, data FROM Results WHERE userid=? AND platform=1 AND scene=?", request.user.id, request.params.scene );
    return response.json( { code:0, date:ret.date, signals:ret.signals, signalsOK:ret.signalsOK,distances:ret.distances, distancesOK:ret.distancesOK, data:ret.data } );
  }catch(error){
    onError( {code: error.code || -2800, message:  error.message } );
  }      
});

router.route('/results/web').post( async (request, response, onError ) => {
  try{
    // Datos a extraer.
    var signalsOK = 0;
    var signals = request.body.signals;
    for(var i=0;i<signals.length;++i){
      if( signals[i].result )
          signalsOK++;
    }
    var distancesOK = 0;
    var distances = request.body.distances;
    for(var i=0;i<distances.length;++i){
      if( distances[i].result )
          distancesOK++;
    }
    // Borra si existe info del usuadio/scena anterior. Esto deberia de ser un UPSER pero no se si SQLite lo permite.
    var ret = await process.db.run("DELETE FROM Results WHERE userid=? AND platform=1 AND scene=?", request.user.id, request.body.scene );
    var ret = await process.db.run("INSERT INTO Results (date, platform, userid, scene, signals, signalsOK, distances, distancesOK, data) VALUES (datetime('now'), 1, ?, ?, ?, ?, ?, ?, ?)",
        request.user.id, request.body.scene,
        request.body.signals.length, signalsOK,
        request.body.distances.length, distancesOK,
        JSON.stringify(request.body) );    
    if(ret.changes!=1) throw {code: -2901, message: 'Cant insert data'};
    
    response.json( {code: 0 } );
  }catch(error){
    onError( {code: error.code || -2900, message:  error.message } );
  }      
});

module.exports = { default: router };